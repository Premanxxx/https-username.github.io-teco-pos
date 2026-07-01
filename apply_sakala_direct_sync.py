#!/usr/bin/env python3
"""
Patch Te.Co Pandawa POS analytics add-on:
1. Rename product/variant Sakata -> Sakala.
2. Canonicalize old Sakata sales records as Sakala.
3. Make analytics read the active in-memory application state only.
4. Stop analytics from independently scanning localStorage or fetching/listening to Firebase.

Run from the repository root:
    python apply_sakala_direct_sync.py
"""
from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

ROOT = Path.cwd()
ADDON_CANDIDATES = [
    ROOT / "teco-analytics-addon.js",
    ROOT / "teco-pos-analytics-addon" / "teco-analytics-addon.js",
]
TEXT_FILES = [
    ROOT / "index.html",
    ROOT / "index.HTML",
    ROOT / "analytics.html",
    ROOT / "pos_app_pwa.html",
    ROOT / "resep-teco.json",
    ROOT / "README.md",
]
BACKUP_SUFFIX = ".backup-before-sakala-direct-sync"
TARGET_VERSION = "1.3.0"


def find_addon() -> Path:
    for path in ADDON_CANDIDATES:
        if path.exists():
            return path
    matches = list(ROOT.rglob("teco-analytics-addon.js"))
    if matches:
        return matches[0]
    raise FileNotFoundError(
        "teco-analytics-addon.js tidak ditemukan. Jalankan script ini dari root repository Te.Co POS."
    )


def backup(path: Path) -> None:
    backup_path = path.with_name(path.name + BACKUP_SUFFIX)
    if not backup_path.exists():
        shutil.copy2(path, backup_path)


def replace_case_insensitive(text: str, old: str, new: str) -> str:
    def preserve_case(match: re.Match) -> str:
        value = match.group(0)
        if value.isupper():
            return new.upper()
        if value.islower():
            return new.lower()
        if value[:1].isupper() and value[1:].islower():
            return new[:1].upper() + new[1:].lower()
        return new

    return re.sub(re.escape(old), preserve_case, text, flags=re.IGNORECASE)


def find_matching_brace(text: str, open_index: int) -> int:
    """Return index of the closing brace while respecting JS strings/comments/templates."""
    depth = 0
    i = open_index
    state = "code"
    template_expr_depth = []

    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""

        if state == "line_comment":
            if ch == "\n":
                state = "code"
            i += 1
            continue

        if state == "block_comment":
            if ch == "*" and nxt == "/":
                state = "code"
                i += 2
            else:
                i += 1
            continue

        if state in ("single", "double"):
            quote = "'" if state == "single" else '"'
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                state = "code"
            i += 1
            continue

        if state == "template":
            if ch == "\\":
                i += 2
                continue
            if ch == "`":
                state = "code"
                i += 1
                continue
            if ch == "$" and nxt == "{":
                template_expr_depth.append(depth)
                depth += 1
                state = "code"
                i += 2
                continue
            i += 1
            continue

        # code state
        if ch == "/" and nxt == "/":
            state = "line_comment"
            i += 2
            continue
        if ch == "/" and nxt == "*":
            state = "block_comment"
            i += 2
            continue
        if ch == "'":
            state = "single"
            i += 1
            continue
        if ch == '"':
            state = "double"
            i += 1
            continue
        if ch == "`":
            state = "template"
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if template_expr_depth and depth == template_expr_depth[-1]:
                template_expr_depth.pop()
                state = "template"
            elif depth == 0:
                return i
        i += 1

    raise ValueError("Kurung kurawal penutup tidak ditemukan.")


def function_span(text: str, name: str):
    pattern = re.compile(
        rf"(?m)^(?P<indent>[ \t]*)(?:async\s+)?function\s+{re.escape(name)}\s*\([^)]*\)\s*\{{"
    )
    match = pattern.search(text)
    if not match:
        raise ValueError(f"Fungsi {name} tidak ditemukan.")
    open_index = match.end() - 1
    close_index = find_matching_brace(text, open_index)
    return match.start(), close_index + 1, match.group("indent")


def replace_function(text: str, name: str, new_function: str) -> str:
    start, end, indent = function_span(text, name)
    normalized = "\n".join(indent + line if line else "" for line in new_function.strip().splitlines())
    return text[:start] + normalized + text[end:]


def insert_after_function(text: str, name: str, insertion: str) -> str:
    _, end, indent = function_span(text, name)
    if "function canonicalProductName" in text:
        return text
    normalized = "\n".join(indent + line if line else "" for line in insertion.strip().splitlines())
    return text[:end] + "\n\n" + normalized + text[end:]


CANONICAL_FUNCTION = r'''
function canonicalProductName(value) {
  return String(value == null ? '' : value)
    .replace(/\bSAKATA\b/gi, 'Sakala')
    .trim();
}
'''

LOAD_TRANSACTIONS_FUNCTION = r'''
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
    // POS utama tetap mengelola penyimpanan dan sinkronisasi.
    // Analisis hanya membaca state aplikasi yang sudah aktif di memori.
    const liveData = scanKnownGlobals();

    state.transactions = dedupeTransactions(liveData.txs || []);
    state.expenses = dedupeExpenses(liveData.expenses || []);
    state.sources = liveData.sources && liveData.sources.length
      ? liveData.sources
      : [{ name: 'State aplikasi aktif', count: state.transactions.length }];
    state.lastLoadedAt = new Date();
    state.lastSyncReason = options.reason || 'state aplikasi aktif';

    setFirebaseStatus('disabled', 'Analisis memakai state aplikasi aktif');
    renderAll();
  } catch (error) {
    console.error('[Te.Co Analytics] Gagal membaca state aplikasi:', error);
    state.loadErrors = [String(error && error.message ? error.message : error)];
    setFirebaseStatus('error', 'State aplikasi belum tersedia');
    renderAll();
  } finally {
    state.loading = false;

    if (state.reloadQueued) {
      state.reloadQueued = false;
      window.setTimeout(() => loadTransactions({ reason: 'perubahan state lanjutan' }), 60);
    }
  }
}
'''


STORAGE_HOOK_FUNCTION = r'''
function installStorageSyncHooks() {
  if (window.__tecoAnalyticsLiveBridgeInstalled) return;
  window.__tecoAnalyticsLiveBridgeInstalled = true;

  const liveState = window.__TECO_ANALYTICS_LIVE_STATE__ || {};
  window.__TECO_ANALYTICS_LIVE_STATE__ = liveState;

  const rememberPayload = (key, rawValue) => {
    if (!key) return;
    if (rawValue == null) {
      delete liveState[key];
      return;
    }

    try {
      liveState[key] = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
    } catch (error) {
      // Nilai non-JSON tidak dibutuhkan oleh analisis transaksi.
    }
  };

  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  const originalClear = Storage.prototype.clear;

  Storage.prototype.setItem = function patchedSetItem(key, value) {
    const result = originalSetItem.apply(this, arguments);
    rememberPayload(String(key || ''), value);
    scheduleDataReload(`state:${String(key || '').slice(0, 40)}`, 40);
    return result;
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key) {
    const result = originalRemoveItem.apply(this, arguments);
    rememberPayload(String(key || ''), null);
    scheduleDataReload(`hapus-state:${String(key || '').slice(0, 40)}`, 40);
    return result;
  };

  Storage.prototype.clear = function patchedClear() {
    const result = originalClear.apply(this, arguments);
    Object.keys(liveState).forEach((key) => delete liveState[key]);
    scheduleDataReload('reset-state', 40);
    return result;
  };

  window.addEventListener('storage', (event) => {
    rememberPayload(String(event.key || ''), event.newValue);
    scheduleDataReload('state-antartab', 40);
  });
}
'''

START_MONITOR_FUNCTION = r'''
function startSalesSyncMonitor() {
  // Storage hook hanya menjadi pemicu perubahan. Analisis tidak membaca ulang localStorage.
  installStorageSyncHooks();

  const refreshFromActiveState = (reason) => {
    scheduleDataReload(reason, 60);
  };

  ['teco:transaction-saved', 'teco:expense-saved', 'teco:data-changed'].forEach((eventName) => {
    window.addEventListener(eventName, () => refreshFromActiveState(eventName));
  });

  window.addEventListener('focus', () => refreshFromActiveState('fokus aplikasi'));

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshFromActiveState('aplikasi aktif');
  });

  document.addEventListener('click', (event) => {
    const target = event.target && event.target.closest
      ? event.target.closest('button, a, [role="button"]')
      : null;
    if (!target) return;

    const label = normalizeText(
      target.textContent || target.getAttribute('aria-label') || target.getAttribute('title') || ''
    );

    if (/BAYAR|KONFIRMASI|SIMPAN|HAPUS|IMPORT|RESET|TRANSAKSI BARU|PENGELUARAN/.test(label)) {
      refreshFromActiveState(`aksi:${label.slice(0, 40)}`);
    }
  });
}
'''


def patch_normalize_item(text: str) -> str:
    replacements = [
        (
            "const name = String(raw).trim();",
            "const name = canonicalProductName(raw);",
        ),
        (
            "let name = String(baseName).trim();",
            "const canonicalBaseName = canonicalProductName(baseName);\n    let name = canonicalBaseName;",
        ),
        (
            "let variantText = variant == null ? '' : String(variant).trim();",
            "let variantText = canonicalProductName(variant);",
        ),
        (
            "baseName: String(baseName).trim(),",
            "baseName: canonicalBaseName,",
        ),
        (
            "variant: String(row.variant),",
            "variant: canonicalProductName(row.variant),",
        ),
    ]

    for old, new in replacements:
        if old in text:
            text = text.replace(old, new)

    # Fallbacks for formatting differences.
    text = re.sub(
        r"const\s+name\s*=\s*String\(raw\)\.trim\(\)\s*;",
        "const name = canonicalProductName(raw);",
        text,
    )
    text = re.sub(
        r"let\s+name\s*=\s*String\(baseName\)\.trim\(\)\s*;",
        "const canonicalBaseName = canonicalProductName(baseName);\n    let name = canonicalBaseName;",
        text,
    )
    text = re.sub(
        r"let\s+variantText\s*=\s*variant\s*==\s*null\s*\?\s*''\s*:\s*String\(variant\)\.trim\(\)\s*;",
        "let variantText = canonicalProductName(variant);",
        text,
    )
    text = re.sub(
        r"baseName\s*:\s*String\(baseName\)\.trim\(\)\s*,",
        "baseName: canonicalBaseName,",
        text,
    )
    return text


def patch_settings_migration(text: str) -> str:
    # Insert migration immediately before a common `return merged;` in loadSettings.
    marker = "return merged;"
    if "migratedProductRecipeMap" in text or marker not in text:
        return text

    migration = """
    const migratedProductRecipeMap = {};
    Object.entries(merged.productRecipeMap || {}).forEach(([productName, recipeName]) => {
      const canonicalProduct = canonicalProductName(productName);
      const canonicalRecipe = normalizeText(recipeName) === 'SAKATA' ? 'SAKALA' : recipeName;
      migratedProductRecipeMap[canonicalProduct] = canonicalRecipe;
    });
    merged.productRecipeMap = migratedProductRecipeMap;

    return merged;"""
    return text.replace(marker, migration, 1)


def patch_version(text: str) -> str:
    patterns = [
        (r"(ADDON_VERSION\s*=\s*['\"])([^'\"]+)(['\"])", rf"\g<1>{TARGET_VERSION}\g<3>"),
        (r"(ANALYTICS_VERSION\s*=\s*['\"])([^'\"]+)(['\"])", rf"\g<1>{TARGET_VERSION}\g<3>"),
        (r"(VERSION\s*=\s*['\"])(1\.2\.[0-9]+)(['\"])", rf"\g<1>{TARGET_VERSION}\g<3>"),
    ]
    for pattern, repl in patterns:
        text = re.sub(pattern, repl, text, count=1)
    return text


def patch_addon(path: Path) -> None:
    backup(path)
    text = path.read_text(encoding="utf-8")

    # Rename existing menu/source references first. Compatibility code is inserted afterward
    # so old historical values named Sakata still map to Sakala.
    text = replace_case_insensitive(text, "Sakata", "Sakala")

    # Canonicalization must be added before historical data is aggregated.
    # Replacing the function on repeated runs keeps the legacy SAKATA mapping intact.
    if "function canonicalProductName" in text:
        text = replace_function(text, "canonicalProductName", CANONICAL_FUNCTION)
    else:
        text = insert_after_function(text, "normalizeText", CANONICAL_FUNCTION)
    text = patch_normalize_item(text)
    text = patch_settings_migration(text)
    if "'__TECO_ANALYTICS_LIVE_STATE__'" not in text and '"__TECO_ANALYTICS_LIVE_STATE__"' not in text:
        text = re.sub(
            r"(['\"]appState['\"]\s*,)",
            r"\1\n      '__TECO_ANALYTICS_LIVE_STATE__',",
            text,
            count=1,
        )
    text = text.replace(
        "normalizeText(recipeName) === 'SAKALA' ? 'SAKALA' : recipeName",
        "normalizeText(recipeName) === 'SAKATA' ? 'SAKALA' : recipeName",
    )

    # Replace the data pipeline, in-memory write bridge, and monitor.
    text = replace_function(text, "loadTransactions", LOAD_TRANSACTIONS_FUNCTION)
    text = replace_function(text, "installStorageSyncHooks", STORAGE_HOOK_FUNCTION)
    text = replace_function(text, "startSalesSyncMonitor", START_MONITOR_FUNCTION)
    text = patch_version(text)
    path.write_text(text, encoding="utf-8")


def patch_related_files(addon_path: Path) -> list[Path]:
    candidates = list(TEXT_FILES)
    # Also patch HTML/JSON files in add-on subfolder when present.
    candidates.extend(addon_path.parent.glob("*.html"))
    candidates.extend(addon_path.parent.glob("*.json"))

    changed = []
    seen = set()
    for path in candidates:
        path = path.resolve()
        if path in seen or not path.exists() or path == addon_path.resolve():
            continue
        seen.add(path)
        try:
            old = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        new = replace_case_insensitive(old, "Sakata", "Sakala")
        new = re.sub(
            r"(teco-analytics-addon\.js\?v=)[^\"'&<\s]+",
            rf"\g<1>{TARGET_VERSION}",
            new,
        )
        if new != old:
            backup(path)
            path.write_text(new, encoding="utf-8")
            changed.append(path)
    return changed


def validate(addon_path: Path) -> list[str]:
    errors = []
    text = addon_path.read_text(encoding="utf-8")

    # The exact legacy token SAKATA is allowed only inside canonical migration logic.
    visible_legacy = re.sub(
        r"function canonicalProductName\(value\) \{.*?\n\}",
        "",
        text,
        flags=re.DOTALL,
    )
    visible_legacy = visible_legacy.replace("normalizeText(recipeName) === 'SAKATA'", "")
    if re.search(r"Sakata", visible_legacy, flags=re.IGNORECASE):
        errors.append("Masih ada teks Sakata di luar logika migrasi data lama.")
    if "function canonicalProductName" not in text:
        errors.append("Fungsi canonicalProductName belum terpasang.")
    if "canonicalProductName(raw)" not in text:
        errors.append("Normalisasi item string belum memakai canonicalProductName.")
    if "__TECO_ANALYTICS_LIVE_STATE__" not in text:
        errors.append("Jembatan state langsung belum terpasang.")
    if "'__TECO_ANALYTICS_LIVE_STATE__'" not in text and '"__TECO_ANALYTICS_LIVE_STATE__"' not in text:
        errors.append("State langsung belum terdaftar pada scanKnownGlobals.")

    try:
        start, end, _ = function_span(text, "loadTransactions")
        body = text[start:end]
        forbidden = [
            "scanLocalStorage(",
            "fetchFirebaseData(",
            "installFirebaseRealtimeSync(",
            "Memuat dan menyinkronkan data penjualan",
        ]
        for token in forbidden:
            if token in body:
                errors.append(f"loadTransactions masih memanggil {token}")
        if "scanKnownGlobals(" not in body:
            errors.append("loadTransactions belum membaca state aplikasi aktif.")
    except ValueError as exc:
        errors.append(str(exc))

    if "SAKALA" not in text.upper():
        errors.append("Varian SAKALA tidak ditemukan.")

    return errors


def main() -> int:
    try:
        addon = find_addon()
        print(f"[1/4] File analitik: {addon.relative_to(ROOT)}")
        patch_addon(addon)
        print("[2/4] Pipeline analitik diubah menjadi state aplikasi langsung.")

        changed = patch_related_files(addon)
        for path in changed:
            print(f"      Diperbarui: {path.relative_to(ROOT)}")
        print("[3/4] Nama Sakata telah dimigrasikan menjadi Sakala.")

        errors = validate(addon)
        if errors:
            print("[GAGAL] Validasi menemukan masalah:")
            for error in errors:
                print(f"  - {error}")
            return 1

        print("[4/4] Validasi berhasil.")
        print("\nPerubahan selesai:")
        print("  - Sakata menjadi Sakala pada menu, transaksi lama, analisis, dan resep bahan.")
        print("  - Analisis tidak lagi scan localStorage atau fetch/listen Firebase sendiri.")
        print("  - Analisis membaca state transaksi aktif dan menyegarkan hasil setelah aksi kasir.")
        print(f"  - Backup memakai akhiran: {BACKUP_SUFFIX}")
        return 0
    except Exception as exc:
        print(f"[GAGAL] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
