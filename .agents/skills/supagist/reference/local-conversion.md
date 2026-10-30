# Local SVG → PNG

The bundled converter uses native resvg 2.6.2 on the client machine, not a hosted
service. It preserves Supagist's embedded TTF (Geist Mono, JetBrains Mono, Fira Code
or Hack) and uses the selected family for fallback text by supplying its bytes
to resvg explicitly; resvg does not automatically load CSS `@font-face` data URLs.
It is for SVGs returned by Supagist, not arbitrary downloaded SVGs.

Prerequisites: Node.js 22+, npm, and permission to install the pinned native
dependency. First check for an existing installation of this converter. If one
is not available, use an isolated temporary directory. Do not install in the
user's application or modify its lockfile. No source code, SVG, or PNG is sent to
npm; npm downloads the converter dependency only.

On macOS/Linux, substitute the absolute installed skill directory for `SKILL_DIR`:

```sh
SKILL_DIR="/absolute/path/to/supagist"
CONVERTER_DIR="$(mktemp -d)"
cp "$SKILL_DIR/scripts/package.json" "$SKILL_DIR/scripts/convert-png.mjs" "$CONVERTER_DIR/"
npm install --prefix "$CONVERTER_DIR" --package-lock=false --no-audit --no-fund
node "$CONVERTER_DIR/convert-png.mjs" "/absolute/path/greeting.svg" "/absolute/path/greeting.png"
```

With no size argument, the PNG is **2000px wide**; height follows the SVG's aspect
ratio, rounded to the nearest pixel. To choose a width, append `--width 2400`
(or another positive whole-pixel width). Explicit trailing `1`, `2`, `4` or `6`
request the SVG's original dimensions or that multiple of width and height; use those
only when the user asks for that scale. Width and scale cannot be combined.

The MCP call should still use `pixelRatio: 1`. Reuse that saved SVG for every
local resolution; do not call MCP again or enlarge a previously rasterized PNG.
For example, a 424×144 SVG produces 2000×679 by default, versus only 848×288 at 2×.
For high-density display at 1000px wide, use at least 2000 output pixels. PNG is
finite-resolution; retain the SVG for arbitrary zoom or future conversions.

The converter rejects outputs above 16 million pixels before rasterizing, in both
width and scale modes. If the requested/default width is too large for a tall SVG,
ask the user to choose a smaller width or retain SVG. Do not silently downscale or
remove the guard. Larger images still consume client resources.

The output file must not already exist. The script prints the dimensions only
after a successful write. Inspect the PNG at the intended display size for sharp
text, preserved fonts and accents, and clipping; then attach/link it alongside the SVG.
Remove the temporary converter directory when finished; keep both user outputs.
On Windows, use equivalent PowerShell temporary-directory and copy commands, or
an existing Node environment; do not require a Unix shell just for conversion.

For an installation check, copy `scripts/convert-png.test.mjs` to the same isolated
directory and run `node --test "$CONVERTER_DIR/convert-png.test.mjs"`.
