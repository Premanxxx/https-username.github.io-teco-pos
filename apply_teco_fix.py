#!/usr/bin/env python3
"""
Patch otomatis Te.Co Pandawa POS Analytics v1.2.3 ke v1.2.4.

Perbaikan:
1. Memindahkan render laporan sampai state.loading sudah false.
2. Menambahkan timeout pada Firebase REST agar request tidak menggantung.
3. Mengganti cache-buster index.html menjadi v1.2.4.

Pemakaian:
    python apply_teco_fix.py
atau:
    python apply_teco_fix.py /path/ke/repository
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


def replace_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Gagal menemukan blok {label}. Tidak ada file yang ditimpa.")
    return updated


def patch_addon(path: Path) -> None:
    original = path.read_text(encoding="utf-8")
    text = original

    text = replace_once(
        text,
        r"const VERSION\s*=\s*['\"]1\.2\.3['\"]\s*;",
        "const VERSION = '1.2.4';",
        "VERSION 1.2.3",
    )

    if "FIREBASE_REQUEST_TIMEOUT_MS" not in text:
        text = replace_once(
            text,
            r"(const FIREBASE_DB_URL\s*=\s*['\"][^'\"]+['\"]\s*;)",
            r"\1\n  const FIREBASE_REQUEST_TIMEOUT_MS = 8000;",
            "konstanta FIREBASE_DB_URL",
        )

    new_fetch_json = """async function fetchJson(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      FIREBASE_REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new Error(
          `Firebase REST timeout setelah ${Math.round(FIREBASE_REQUEST_TIMEOUT_MS / 1000)} detik`
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }"""

    text = replace_once(
        text,
        r"""async function fetchJson\(url\)\s*\{
\s*const response\s*=\s*await fetch\(url,\s*\{\s*cache:\s*['"]no-store['"]\s*\}\s*\)\s*;
\s*if\s*\(!response\.ok\)\s*throw new Error\(`HTTP \$\{response\.status\}`\)\s*;
\s*return response\.json\(\)\s*;
\s*\}""",
        new_fetch_json,
        "fetchJson lama",
    )

    # Batasi perubahan pada fungsi loadTransactions pertama.
    load_start = text.find("async function loadTransactions(options)")
    if load_start < 0:
        raise RuntimeError("Fungsi loadTransactions(options) tidak ditemukan.")

    load_end = text.find("\n  function scheduleDataReload", load_start)
    if load_end < 0:
        raise RuntimeError("Batas akhir loadTransactions tidak ditemukan.")

    before = text[:load_start]
    load_block = text[load_start:load_end]
    after = text[load_end:]

    if "let loadSucceeded = false;" not in load_block:
        load_block = replace_once(
            load_block,
            r"(const sources\s*=\s*\[\]\s*;)",
            r"\1\n    let loadSucceeded = false;",
            "deklarasi sources di loadTransactions",
        )

    load_block = replace_once(
        load_block,
        r"""state\.lastSyncReason\s*=\s*options\s*&&\s*options\.reason\s*\?\s*String\(options\.reason\)\s*:\s*['"]manual['"]\s*;
\s*renderAll\(\)\s*;
\s*installFirebaseRealtimeSync\(\)\s*;""",
        """state.lastSyncReason = options && options.reason ? String(options.reason) : 'manual';
      installFirebaseRealtimeSync();
      loadSucceeded = true;""",
        "urutan render sukses",
    )

    load_block = replace_once(
        load_block,
        r"""(\}\s*finally\s*\{\s*
\s*state\.loading\s*=\s*false\s*;)""",
        r"""\1
      if (loadSucceeded) renderAll();""",
        "blok finally",
    )

    text = before + load_block + after

    backup = path.with_suffix(path.suffix + ".bak")
    backup.write_text(original, encoding="utf-8")
    path.write_text(text, encoding="utf-8")
    print(f"OK  : {path}")
    print(f"Backup: {backup}")


def patch_index(path: Path) -> None:
    original = path.read_text(encoding="utf-8")
    text, count = re.subn(
        r"(teco-analytics-addon\.js\?v=)1\.2\.3",
        r"\g<1>1.2.4",
        original,
        count=1,
    )

    if count == 0:
        # Fallback jika tidak memakai query versi.
        text, count = re.subn(
            r'(src=["\']\./teco-analytics-addon\.js)(["\'])',
            r'\1?v=1.2.4\2',
            original,
            count=1,
        )

    if count != 1:
        raise RuntimeError(
            "Tag teco-analytics-addon.js pada index.html tidak ditemukan."
        )

    backup = path.with_suffix(path.suffix + ".bak")
    backup.write_text(original, encoding="utf-8")
    path.write_text(text, encoding="utf-8")
    print(f"OK  : {path}")
    print(f"Backup: {backup}")


def main() -> int:
    repo = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else Path.cwd()
    addon = repo / "teco-analytics-addon.js"
    index = repo / "index.html"

    if not addon.exists():
        print(f"ERROR: {addon} tidak ditemukan.", file=sys.stderr)
        return 1
    if not index.exists():
        print(f"ERROR: {index} tidak ditemukan.", file=sys.stderr)
        return 1

    try:
        patch_addon(addon)
        patch_index(index)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    print("\nPatch v1.2.4 selesai.")
    print("Commit dan push kedua file, lalu lakukan hard refresh Ctrl+Shift+R.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
