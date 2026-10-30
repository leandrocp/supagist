# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools==4.60.1", "brotli==1.1.0"]
# ///
"""Build-time WOFF2 decompression only; never shipped as a runtime dependency."""

from pathlib import Path
import sys

from fontTools.ttLib import TTFont

root, assets = map(Path, sys.argv[1:])
for source, output in [
    ("geist-mono.woff2", "GeistMono.ttf"),
    ("fira-code.woff2", "FiraCode.ttf"),
    ("hack.woff2", "Hack.ttf"),
]:
    # Preserve the actual repository face, glyphs, metrics and source timestamp.
    # In particular, fira-code.woff2 is Fira Code Light, not an upstream Regular.
    with TTFont(root / "public/fonts" / source, recalcTimestamp=False, recalcBBoxes=False) as font:
        font.flavor = None
        font.save(assets / output, reorderTables=True)
        if source == "hack.woff2":
            license_text = font["name"].getDebugName(13)
            if not license_text or "BITSTREAM VERA LICENSE" not in license_text:
                raise ValueError("Hack's embedded full license is missing")
            (assets / "Hack-LICENSE.txt").write_text(license_text + "\n", encoding="utf-8")
