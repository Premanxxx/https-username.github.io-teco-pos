#!/usr/bin/env python3
"""
Te.Co Pandawa POS patch v2.1.0

Perbaikan:
1. Memastikan file aktif index.html memanggil live data bridge dan analytics add-on.
2. Mengubah Sakata menjadi Sakala pada menu, laporan, resep, dan data baru.
3. Menjaga data historis bernama Sakata tetap dihitung sebagai Sakala.
4. Membuat analitik membaca snapshot memori, bukan melakukan scan/fetch setiap modal dibuka.
5. Menjaga backup semua file sebelum perubahan.

Jalankan dari root repository:
    python apply_teco_v2_sakala_recovery.py
"""
from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

ROOT = Path.cwd()
VERSION = "2.1.0"
BACKUP_SUFFIX = ".backup-before-teco-v2-sakala-recovery"
BRIDGE_NAME = "teco-live-data-bridge.js"
ADDON_NAME = "teco-analytics-addon.js"


def backup(path: Path) -> None:
    target = path.with_name(path.name + BACKUP_SUFFIX)
    if path.exists() and not target.exists():
        shutil.copy2(path, target)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    backup(path)
    path.write_text(text, encoding="utf-8")


def replace_visible_name(text: str) -> str:
    return re.sub(r"Sakata", "Sakala", text, flags=re.IGNORECASE)


def find_matching_brace(text: str, open_index: int) -> int:
    depth = 0
    i = open_index
    state = "code"
    template_depths: list[int] = []
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if state == "line":
            if ch == "\n": state = "code"
            i += 1; continue
        if state == "block":
            if ch == "*" and nxt == "/": state = "code"; i += 2
            else: i += 1
            continue
        if state in ("single", "double"):
            quote = "'" if state == "single" else '"'
            if ch == "\\": i += 2; continue
            if ch == quote: state = "code"
            i += 1; continue
        if state == "template":
            if ch == "\\": i += 2; continue
            if ch == "`": state = "code"; i += 1; continue
            if ch == "$" and nxt == "{":
                template_depths.append(depth); depth += 1; state = "code"; i += 2; continue
            i += 1; continue
        if ch == "/" and nxt == "/": state = "line"; i += 2; continue
        if ch == "/" and nxt == "*": state = "block"; i += 2; continue
        if ch == "'": state = "single"; i += 1; continue
        if ch == '"': state = "double"; i += 1; continue
        if ch == "`": state = "template"; i += 1; continue
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if template_depths and depth == template_depths[-1]:
                template_depths.pop(); state = "template"
            elif depth == 0:
                return i
        i += 1
    raise ValueError("Kurung penutup fungsi tidak ditemukan")


def function_span(text: str, name: str):
    pattern = re.compile(rf"(?m)^(?P<indent>[ \t]*)(?:async\s+)?function\s+{re.escape(name)}\s*\([^)]*\)\s*\{{")
    match = pattern.search(text)
    if not match:
        raise ValueError(f"Fungsi {name} tidak ditemukan")
    end = find_matching_brace(text, match.end() - 1) + 1
    return match.start(), end, match.group("indent")


def replace_function(text: str, name: str, body: str) -> str:
    start, end, indent = function_span(text, name)
    normalized = "\n".join(indent + line if line else "" for line in body.strip().splitlines())
    return text[:start] + normalized + text[end:]


def insert_after_function(text: str, name: str, body: str) -> str:
    _, end, indent = function_span(text, name)
    normalized = "\n".join(indent + line if line else "" for line in body.strip().splitlines())
    return text[:end] + "\n\n" + normalized + text[end:]


CANONICAL = r'''
function canonicalProductName(value) {
  return String(value == null ? '' : value)
    .replace(/\bSAKATA\b/gi, 'Sakala')
    .trim();
}
'''

LOAD_TRANSACTIONS = r'''
async function loadTransactions(options = {}) {
  if (!isAuthenticated()) return;
  if (state.loading) {
    state.reloadQueued = true;
    return;
  }

  state.loading = true;
  state.reloadQueued = false;
  state.loadErrors = [];

  try {
    const bridge = window.__TECO_ANALYTICS_LIVE_STATE__ || {};
    const liveData = scanKnownGlobals();
    const transactions = [
      ...(Array.isArray(bridge.txs) ? bridge.txs : []),
      ...(Array.isArray(liveData.txs) ? liveData.txs : [])
    ];
    const expenses = [
      ...(Array.isArray(bridge.expenses) ? bridge.expenses : []),
      ...(Array.isArray(liveData.expenses) ? liveData.expenses : [])
    ];

    state.transactions = dedupeTransactions(transactions);
    state.expenses = dedupeExpenses(expenses);
    state.sources = Array.isArray(bridge.sources) && bridge.sources.length
      ? bridge.sources
      : (liveData.sources || [{ name: 'State aplikasi aktif', count: state.transactions.length }]);
    state.lastLoadedAt = new Date();
    state.lastSyncReason = options.reason || 'state memori aplikasi';
    setFirebaseStatus('disabled', 'Analisis membaca state memori aktif');
    renderAll();
  } catch (error) {
    console.error('[Te.Co Analytics] Gagal membaca state memori:', error);
    state.loadErrors = [String(error && error.message ? error.message : error)];
    renderAll();
  } finally {
    state.loading = false;
    if (state.reloadQueued) {
      state.reloadQueued = false;
      window.setTimeout(() => loadTransactions({ reason: 'perubahan lanjutan' }), 60);
    }
  }
}
'''

STORAGE_HOOK = r'''
function installStorageSyncHooks() {
  if (window.__tecoAnalyticsEventBridgeInstalled) return;
  window.__tecoAnalyticsEventBridgeInstalled = true;
  window.addEventListener('teco:data-changed', () => scheduleDataReload('data aktif berubah', 40));
  window.addEventListener('teco:data-ready', () => scheduleDataReload('data aktif siap', 40));
}
'''

START_MONITOR = r'''
function startSalesSyncMonitor() {
  installStorageSyncHooks();
  const refresh = (reason) => scheduleDataReload(reason, 60);
  ['teco:transaction-saved', 'teco:expense-saved', 'teco:data-changed'].forEach((eventName) => {
    window.addEventListener(eventName, () => refresh(eventName));
  });
  document.addEventListener('click', (event) => {
    const target = event.target && event.target.closest
      ? event.target.closest('button, a, [role="button"]')
      : null;
    if (!target) return;
    const label = normalizeText(target.textContent || target.getAttribute('aria-label') || '');
    if (/BAYAR|KONFIRMASI|SIMPAN|HAPUS|IMPORT|RESET|TRANSAKSI BARU|PENGELUARAN/.test(label)) {
      refresh('aksi:' + label.slice(0, 40));
    }
  });
}
'''


def patch_addon(path: Path) -> None:
    text = read(path)
    text = replace_visible_name(text)

    if "function canonicalProductName" in text:
        text = replace_function(text, "canonicalProductName", CANONICAL)
    else:
        text = insert_after_function(text, "normalizeText", CANONICAL)

    replacements = {
        "const name = String(raw).trim();": "const name = canonicalProductName(raw);",
        "let name = String(baseName).trim();": "const canonicalBaseName = canonicalProductName(baseName);\n    let name = canonicalBaseName;",
        "let variantText = variant == null ? '' : String(variant).trim();": "let variantText = canonicalProductName(variant);",
        "baseName: String(baseName).trim(),": "baseName: canonicalProductName(baseName),",
        "variant: String(row.variant),": "variant: canonicalProductName(row.variant),",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    if "__TECO_ANALYTICS_LIVE_STATE__" not in text:
        text = re.sub(r"(['\"]appState['\"]\s*,)", r"\1\n      '__TECO_ANALYTICS_LIVE_STATE__',", text, count=1)

    if "function loadTransactions" in text:
        text = replace_function(text, "loadTransactions", LOAD_TRANSACTIONS)
    if "function installStorageSyncHooks" in text:
        text = replace_function(text, "installStorageSyncHooks", STORAGE_HOOK)
    if "function startSalesSyncMonitor" in text:
        text = replace_function(text, "startSalesSyncMonitor", START_MONITOR)

    text = re.sub(r"(const\s+VERSION\s*=\s*['\"])[^'\"]+(['\"])", rf"\g<1>{VERSION}\g<2>", text, count=1)
    text = re.sub(r"(ADDON_VERSION\s*=\s*['\"])[^'\"]+(['\"])", rf"\g<1>{VERSION}\g<2>", text, count=1)
    write(path, text)


def ensure_scripts(text: str) -> str:
    text = re.sub(r"\s*<script[^>]+teco-live-data-bridge\.js[^>]*></script>\s*", "\n", text, flags=re.I)
    text = re.sub(r"\s*<script[^>]+teco-analytics-addon\.js[^>]*></script>\s*", "\n", text, flags=re.I)
    scripts = (
        f'\n<!-- Te.Co Sakala + live analytics v{VERSION} -->\n'
        f'<script src="./{BRIDGE_NAME}?v={VERSION}"></script>\n'
        f'<script src="./{ADDON_NAME}?v={VERSION}"></script>\n'
    )
    if "</body>" not in text.lower():
        raise RuntimeError("Tag </body> tidak ditemukan pada index.html")
    return re.sub(r"</body>", scripts + "</body>", text, count=1, flags=re.I)


def patch_index(path: Path) -> None:
    text = read(path)
    text = replace_visible_name(text)
    text = ensure_scripts(text)
    text = re.sub(r"v2\.0\.0\s*\|\s*Te\.Co Pandawa POS", "v2.1.0 Sakala | Te.Co Pandawa POS", text, count=1)
    write(path, text)


def patch_related(active_index: Path, addon: Path) -> list[Path]:
    names = ["analytics.html", "pos_app_pwa.html", "resep-teco.json", "README.md"]
    changed: list[Path] = []
    for name in names:
        path = ROOT / name
        if not path.exists() or path in (active_index, addon):
            continue
        old = read(path)
        new = replace_visible_name(old)
        if new != old:
            write(path, new)
            changed.append(path)
    return changed


def validate(index: Path, addon: Path, bridge: Path) -> list[str]:
    errors: list[str] = []
    index_text = read(index)
    addon_text = read(addon)
    if BRIDGE_NAME not in index_text: errors.append("Bridge belum dipanggil oleh index.html")
    if ADDON_NAME not in index_text: errors.append("Analytics add-on belum dipanggil oleh index.html")
    if "function canonicalProductName" not in addon_text: errors.append("Normalisasi Sakata ke Sakala belum terpasang")
    if "window.__TECO_ANALYTICS_LIVE_STATE__" not in addon_text: errors.append("Analytics belum membaca state memori")
    if not bridge.exists(): errors.append("File live data bridge belum tersedia")
    if re.search(r">[^<]*Sakata[^<]*<", index_text, flags=re.I): errors.append("Masih ada teks Sakata yang terlihat pada index.html")
    return errors


def main() -> int:
    try:
        index = ROOT / "index.html"
        addon = ROOT / ADDON_NAME
        source_bridge = Path(__file__).resolve().parent / BRIDGE_NAME
        target_bridge = ROOT / BRIDGE_NAME

        if not index.exists():
            raise FileNotFoundError("index.html aktif tidak ditemukan. Jangan memakai index.HTML sebagai file utama.")
        if not addon.exists():
            raise FileNotFoundError(f"{ADDON_NAME} tidak ditemukan di root repository.")
        if not source_bridge.exists():
            raise FileNotFoundError(f"{BRIDGE_NAME} harus berada satu folder dengan script patch.")

        if source_bridge.resolve() != target_bridge.resolve():
            backup(target_bridge)
            shutil.copy2(source_bridge, target_bridge)

        print("[1/5] Live data bridge tersedia")
        patch_addon(addon)
        print("[2/5] Analytics add-on membaca state memori aktif")
        patch_index(index)
        print("[3/5] index.html aktif memanggil bridge dan add-on")
        changed = patch_related(index, addon)
        print(f"[4/5] Nama Sakata menjadi Sakala pada {len(changed)} file terkait")

        errors = validate(index, addon, target_bridge)
        if errors:
            print("[GAGAL] Validasi:")
            for error in errors: print(" -", error)
            return 1

        print("[5/5] Validasi berhasil")
        print("\nPENTING:")
        print("- Commit index.html, teco-analytics-addon.js, teco-live-data-bridge.js, dan file terkait.")
        print("- index.HTML adalah file lama. GitHub Pages memakai index.html.")
        print("- Data lama dapat pulih hanya jika masih ada di browser yang sama atau Firebase lama.")
        return 0
    except Exception as exc:
        print(f"[GAGAL] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
