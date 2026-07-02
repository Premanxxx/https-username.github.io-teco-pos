#!/usr/bin/env python3
"""
Te.Co Pandawa POS - Installer Laporan Native dan Editor Admin v2.4.0

Hasil:
- Rekap cup, varian, penyesuaian, Excel harian/bulanan, dan kebutuhan bahan tampil untuk kasir.
- Menghapus pemanggilan add-on, bridge, dan final sync fix.
- Menyimpan backup index.html.
- Menanam resep-teco.json ke index.html agar tidak perlu fetch saat runtime.
- Tidak menghapus data transaksi.

Jalankan dari root repository:
    python3 install_teco_native_report_v240.py
"""

from pathlib import Path
import json
import re
import shutil
import sys

ROOT = Path.cwd()
INDEX = ROOT / "index.html"
RECIPE = ROOT / "resep-teco.json"
CORE = ROOT / "teco-native-main-core.js"
VERSION = "2.4.0"
START = "<!-- TECO_NATIVE_REPORT_V240_START -->"
END = "<!-- TECO_NATIVE_REPORT_V240_END -->"


def backup(path: Path) -> Path:
    target = path.with_name(path.name + ".backup-before-native-v240")
    if not target.exists():
        shutil.copy2(path, target)
    return target


def load_recipe():
    if not RECIPE.exists():
        print("[PERINGATAN] resep-teco.json tidak ditemukan. Analisis penjualan tetap aktif.")
        return {"version": "empty", "recipes": {}}

    try:
        return json.loads(RECIPE.read_text(encoding="utf-8"))
    except Exception as error:
        print(f"[PERINGATAN] resep-teco.json tidak valid: {error}")
        return {"version": "invalid", "recipes": {}}


def remove_legacy_scripts(html: str) -> tuple[str, list[str]]:
    removed = []
    names = [
        "teco-analytics-addon.js",
        "teco-live-data-bridge.js",
        "teco-sync-final-fix.js",
    ]

    for name in names:
        pattern = re.compile(
            rf'\s*<script\b[^>]*src=["\'][^"\']*{re.escape(name)}[^"\']*["\'][^>]*>\s*</script>\s*',
            re.IGNORECASE,
        )
        html, count = pattern.subn("\n", html)
        if count:
            removed.append(f"{name} ({count})")

    return html, removed


def remove_previous_native(html: str) -> str:
    patterns = [
        re.compile(re.escape(START) + r".*?" + re.escape(END), re.DOTALL),
        re.compile(
            r"<!-- TECO_NATIVE_REPORT_V2[0-9]+_START -->.*?"
            r"<!-- TECO_NATIVE_REPORT_V2[0-9]+_END -->",
            re.DOTALL,
        ),
    ]
    for pattern in patterns:
        html = pattern.sub("", html)
    return html


def update_version(html: str) -> str:
    html = re.sub(
        r"v2\.[0-9.]+(?:\s+Native)?\s+Sakala",
        "v2.4.0 Native Sakala",
        html,
        flags=re.IGNORECASE,
    )
    return html


def main() -> int:
    if not INDEX.exists():
        print("[GAGAL] index.html tidak ditemukan. Jalankan dari root repository.", file=sys.stderr)
        return 1

    if not CORE.exists():
        print("[GAGAL] teco-native-main-core.js tidak ditemukan.", file=sys.stderr)
        return 1

    backup_path = backup(INDEX)
    print(f"[1/5] Backup dibuat: {backup_path.name}")

    html = INDEX.read_text(encoding="utf-8")
    html = remove_previous_native(html)
    html, removed = remove_legacy_scripts(html)

    print(
        "[2/5] Script lama dilepas: "
        + (", ".join(removed) if removed else "tidak ditemukan")
    )

    recipe = load_recipe()
    core = CORE.read_text(encoding="utf-8")
    core = core.replace(
        "__TECO_RECIPE_JSON__",
        json.dumps(recipe, ensure_ascii=False, separators=(",", ":")),
        1,
    )

    css_path = ROOT / "teco-native-main-style.css"
    if not css_path.exists():
        print("[GAGAL] teco-native-main-style.css tidak ditemukan.", file=sys.stderr)
        return 1

    css = css_path.read_text(encoding="utf-8")

    block = f"""
{START}
<style id="teco-native-main-style">
{css}
</style>
<script id="teco-native-main-script">
{core}
</script>
{END}
"""

    match = re.search(r"</body\s*>", html, flags=re.IGNORECASE)
    if not match:
        print("[GAGAL] Tag </body> tidak ditemukan.", file=sys.stderr)
        return 1

    html = html[:match.start()] + block + "\n" + html[match.start():]
    html = update_version(html)
    INDEX.write_text(html, encoding="utf-8")

    print("[3/5] Resep ditanam langsung ke index.html.")
    print("[4/5] Analisis native ditanam langsung ke index.html.")

    result = INDEX.read_text(encoding="utf-8")
    errors = []

    if START not in result or END not in result:
        errors.append("Blok native tidak ditemukan.")
    if "window.TecoNativeReports" not in result:
        errors.append("API TecoNativeReports tidak ditemukan.")
    if "__TECO_RECIPE_JSON__" in result:
        errors.append("Placeholder resep belum diganti.")
    for name in [
        "teco-analytics-addon.js",
        "teco-live-data-bridge.js",
        "teco-sync-final-fix.js",
    ]:
        if re.search(
            rf'<script\b[^>]*src=["\'][^"\']*{re.escape(name)}',
            result,
            flags=re.IGNORECASE,
        ):
            errors.append(f"Script lama masih aktif: {name}")

    if errors:
        print("[GAGAL] Validasi:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("[5/5] Validasi berhasil.")
    print()
    print("Fitur laporan kasir dan editor admin terpasang pada index.html.")
    print("Data transaksi tidak dihapus.")
    print("Commit index.html, lalu tunggu deployment GitHub Pages selesai.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
