#!/usr/bin/env python3
"""
Te.Co Pandawa POS - Fix Laporan Harian v1.3.1

Perbaikan:
1. Memastikan laporan dirender ulang setelah state.loading menjadi false.
2. Mengisi live-state dari data browser yang sudah ada tanpa menunggu Firebase.
3. Memperbarui cache-buster add-on agar browser memuat file terbaru.
4. Tidak menghapus transaksi, pengeluaran, menu, atau data lama.

Jalankan dari root repository:
    python3 fix_teco_laporan_harian_v131.py
"""

from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

ROOT = Path.cwd()
VERSION = "1.3.1"
BACKUP_SUFFIX = ".backup-before-daily-report-fix-v131"

ADDON_CANDIDATES = [
    ROOT / "teco-analytics-addon.js",
    ROOT / "teco-pos-analytics-addon" / "teco-analytics-addon.js",
]

HTML_CANDIDATES = [
    ROOT / "index.html",
    ROOT / "index.HTML",
    ROOT / "analytics.html",
    ROOT / "pos_app_pwa.html",
]


def backup(path: Path) -> None:
    target = path.with_name(path.name + BACKUP_SUFFIX)
    if not target.exists():
        shutil.copy2(path, target)


def find_addon() -> Path:
    for path in ADDON_CANDIDATES:
        if path.exists():
            return path

    matches = list(ROOT.rglob("teco-analytics-addon.js"))
    if matches:
        return matches[0]

    raise FileNotFoundError(
        "teco-analytics-addon.js tidak ditemukan. "
        "Jalankan file ini dari root repository Te.Co POS."
    )


def find_matching_brace(text: str, open_index: int) -> int:
    depth = 0
    i = open_index
    state = "code"
    template_depths: list[int] = []

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
                template_depths.append(depth)
                depth += 1
                state = "code"
                i += 2
                continue
            i += 1
            continue

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
            if template_depths and depth == template_depths[-1]:
                template_depths.pop()
                state = "template"
            elif depth == 0:
                return i

        i += 1

    raise ValueError("Kurung kurawal penutup fungsi tidak ditemukan.")


def function_span(text: str, function_name: str) -> tuple[int, int]:
    pattern = re.compile(
        rf"(?m)^[ \t]*(?:async\s+)?function\s+"
        rf"{re.escape(function_name)}\s*\([^)]*\)\s*\{{"
    )
    match = pattern.search(text)
    if not match:
        raise ValueError(f"Fungsi {function_name} tidak ditemukan.")

    open_index = match.end() - 1
    close_index = find_matching_brace(text, open_index)
    return match.start(), close_index + 1


def patch_load_transactions(text: str) -> tuple[str, bool]:
    start, end = function_span(text, "loadTransactions")
    block = text[start:end]

    marker = "window.__TECO_DAILY_REPORT_RENDER_FIX_V131__"
    if marker in block:
        return text, False

    pattern = re.compile(r"(?m)^(?P<indent>[ \t]*)state\.loading\s*=\s*false\s*;")
    matches = list(pattern.finditer(block))
    if not matches:
        raise ValueError(
            "Baris state.loading = false tidak ditemukan di fungsi loadTransactions."
        )

    # Pakai kemunculan terakhir, biasanya berada pada blok finally.
    match = matches[-1]
    indent = match.group("indent")
    insertion = (
        match.group(0)
        + "\n"
        + indent
        + "window.__TECO_DAILY_REPORT_RENDER_FIX_V131__ = true;\n"
        + indent
        + "window.requestAnimationFrame(() => {\n"
        + indent
        + "  try {\n"
        + indent
        + "    renderAll();\n"
        + indent
        + "  } catch (renderError) {\n"
        + indent
        + "    console.error('[TeCo Analytics] Gagal merender laporan harian:', renderError);\n"
        + indent
        + "  }\n"
        + indent
        + "});"
    )

    patched_block = block[:match.start()] + insertion + block[match.end():]
    return text[:start] + patched_block + text[end:], True


def patch_storage_seed(text: str) -> tuple[str, bool]:
    """
    Mengisi live-state dari localStorage yang sudah ada secara sinkron.
    Tidak memakai fetch Firebase dan tidak menampilkan layar loading.
    """
    marker = "window.__TECO_EXISTING_DATA_SEEDED_V131__"
    if marker in text:
        return text, False

    try:
        start, end = function_span(text, "installStorageSyncHooks")
    except ValueError:
        # Versi lama mungkin belum memiliki live-state hook.
        return text, False

    block = text[start:end]
    anchor_pattern = re.compile(
        r"(?m)^(?P<indent>[ \t]*)window\.__TECO_ANALYTICS_LIVE_STATE__\s*=\s*liveState\s*;"
    )
    anchor = anchor_pattern.search(block)
    if not anchor:
        return text, False

    indent = anchor.group("indent")
    seed = (
        anchor.group(0)
        + "\n\n"
        + indent
        + "// Baca snapshot lama satu kali. Tidak ada request Firebase dan tidak ada spinner.\n"
        + indent
        + "if (!window.__TECO_EXISTING_DATA_SEEDED_V131__) {\n"
        + indent
        + "  window.__TECO_EXISTING_DATA_SEEDED_V131__ = true;\n"
        + indent
        + "  try {\n"
        + indent
        + "    for (let index = 0; index < localStorage.length; index += 1) {\n"
        + indent
        + "      const key = localStorage.key(index);\n"
        + indent
        + "      if (!key) continue;\n"
        + indent
        + "      const rawValue = localStorage.getItem(key);\n"
        + indent
        + "      if (rawValue == null) continue;\n"
        + indent
        + "      try {\n"
        + indent
        + "        liveState[key] = JSON.parse(rawValue);\n"
        + indent
        + "      } catch (parseError) {\n"
        + indent
        + "        // Nilai non-JSON bukan data transaksi.\n"
        + indent
        + "      }\n"
        + indent
        + "    }\n"
        + indent
        + "  } catch (seedError) {\n"
        + indent
        + "    console.warn('[TeCo Analytics] Snapshot data lama tidak dapat dibaca:', seedError);\n"
        + indent
        + "  }\n"
        + indent
        + "}"
    )

    patched_block = block[:anchor.start()] + seed + block[anchor.end():]
    return text[:start] + patched_block + text[end:], True


def patch_version(text: str) -> str:
    replacements = [
        (r"(const\s+VERSION\s*=\s*['\"])(1\.[0-9.]+)(['\"]\s*;)", rf"\g<1>{VERSION}\g<3>"),
        (r"(ADDON_VERSION\s*=\s*['\"])([^'\"]+)(['\"])", rf"\g<1>{VERSION}\g<3>"),
        (r"(ANALYTICS_VERSION\s*=\s*['\"])([^'\"]+)(['\"])", rf"\g<1>{VERSION}\g<3>"),
    ]

    for pattern, replacement in replacements:
        text, count = re.subn(pattern, replacement, text, count=1)
        if count:
            break

    return text


def patch_addon(path: Path) -> dict[str, bool]:
    backup(path)
    original = path.read_text(encoding="utf-8")
    text = original

    text, render_changed = patch_load_transactions(text)
    text, seed_changed = patch_storage_seed(text)
    text = patch_version(text)

    if text == original:
        return {"render": False, "seed": False, "written": False}

    path.write_text(text, encoding="utf-8")
    return {"render": render_changed, "seed": seed_changed, "written": True}


def patch_html(path: Path) -> bool:
    if not path.exists():
        return False

    original = path.read_text(encoding="utf-8")
    text = original

    # Perbarui query versi apabila tag sudah ada.
    text, count = re.subn(
        r"(teco-analytics-addon\.js)(?:\?v=[^\"'<>\s]+)?",
        rf"\1?v={VERSION}",
        text,
    )

    # Tambahkan tag bila belum ada.
    if count == 0 and "</body>" in text.lower():
        script_tag = f'\n<script src="./teco-analytics-addon.js?v={VERSION}"></script>\n'
        text = re.sub(r"(?i)</body>", script_tag + "</body>", text, count=1)

    if text == original:
        return False

    backup(path)
    path.write_text(text, encoding="utf-8")
    return True


def validate(addon: Path) -> list[str]:
    text = addon.read_text(encoding="utf-8")
    errors: list[str] = []

    try:
        start, end = function_span(text, "loadTransactions")
        load_block = text[start:end]

        if "window.__TECO_DAILY_REPORT_RENDER_FIX_V131__" not in load_block:
            errors.append("Render setelah loading belum terpasang.")
        if "window.requestAnimationFrame" not in load_block:
            errors.append("Pemicu render akhir belum terpasang.")
    except ValueError as exc:
        errors.append(str(exc))

    if "installStorageSyncHooks" in text:
        if "__TECO_EXISTING_DATA_SEEDED_V131__" not in text:
            errors.append("Snapshot transaksi lama belum terpasang.")

    return errors


def main() -> int:
    try:
        addon = find_addon()
        print(f"[1/4] Add-on ditemukan: {addon.relative_to(ROOT)}")

        result = patch_addon(addon)
        print(
            "[2/4] Render laporan setelah loading: "
            + ("diperbaiki" if result["render"] else "sudah benar")
        )
        print(
            "[3/4] Snapshot transaksi lama: "
            + ("ditambahkan" if result["seed"] else "tidak diperlukan / sudah ada")
        )

        changed_html = []
        for path in HTML_CANDIDATES:
            if patch_html(path):
                changed_html.append(path.relative_to(ROOT))

        errors = validate(addon)
        if errors:
            print("[GAGAL] Validasi menemukan masalah:")
            for error in errors:
                print(f"  - {error}")
            return 1

        print("[4/4] Validasi berhasil.")
        if changed_html:
            print("Cache-buster diperbarui pada:")
            for path in changed_html:
                print(f"  - {path}")

        print("\nPerbaikan selesai.")
        print("Data lama tidak dihapus.")
        print("Commit dan push file yang berubah, lalu buka aplikasi dengan Ctrl+F5.")
        return 0

    except Exception as exc:
        print(f"[GAGAL] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
