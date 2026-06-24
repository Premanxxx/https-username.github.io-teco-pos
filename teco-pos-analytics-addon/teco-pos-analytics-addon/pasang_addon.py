#!/usr/bin/env python3
"""Memasang Te.Co Analytics Add-on ke index.html dengan aman."""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

SCRIPT_TAG = '  <script src="./teco-analytics-addon.js?v=1.0.0"></script>\n'


def main() -> int:
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "index.html")
    if not target.exists():
        print(f"ERROR: {target} tidak ditemukan.")
        return 1

    text = target.read_text(encoding="utf-8")
    if "teco-analytics-addon.js" in text:
        print("Add-on sudah terpasang. Tidak ada perubahan.")
        return 0

    lower = text.lower()
    pos = lower.rfind("</body>")
    if pos < 0:
        print("ERROR: tag </body> tidak ditemukan.")
        return 1

    backup = target.with_suffix(target.suffix + ".backup-sebelum-analytics")
    shutil.copy2(target, backup)
    patched = text[:pos] + SCRIPT_TAG + text[pos:]
    target.write_text(patched, encoding="utf-8")

    print(f"Berhasil memasang add-on ke: {target}")
    print(f"Backup dibuat di: {backup}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
