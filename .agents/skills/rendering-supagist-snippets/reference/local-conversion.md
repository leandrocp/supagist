# Local SVG → PNG

The bundled converter uses native resvg 2.6.2 on the client machine, not a hosted
service. It preserves Supagist's embedded JetBrains Mono TTF by supplying its bytes
to resvg explicitly; resvg does not automatically load CSS `@font-face` data URLs.
It is for SVGs returned by Supagist, not arbitrary downloaded SVGs.

Prerequisites: Node.js 22+, npm, and permission to install the pinned native
dependency. First check for an existing installation of this converter. If one
is not available, use an isolated temporary directory. Do not install in the
user's application or modify its lockfile. No source code, SVG, or PNG is sent to
npm; npm downloads the converter dependency only.

On macOS/Linux, substitute the absolute installed skill directory for `SKILL_DIR`:

```sh
SKILL_DIR="/absolute/path/to/rendering-supagist-snippets"
CONVERTER_DIR="$(mktemp -d)"
cp "$SKILL_DIR/scripts/package.json" "$SKILL_DIR/scripts/convert-png.mjs" "$CONVERTER_DIR/"
npm install --prefix "$CONVERTER_DIR" --package-lock=false --no-audit --no-fund
node "$CONVERTER_DIR/convert-png.mjs" "/absolute/path/greeting.svg" "/absolute/path/greeting.png" 1
```

Use `2` instead of `1` for twice the SVG's width and height (four times the pixels).
This scales the saved SVG's viewport; the MCP call should have used `pixelRatio: 1`
to avoid doubling it twice. The converter accepts only 1×/2× and refuses outputs
above 16 million pixels to keep accidental allocations bounded. Larger images
still consume client resources; local execution is not unlimited capacity.

The output file must not already exist. The script prints the dimensions only
after a successful write. Inspect the PNG, then attach/link it alongside the SVG.
Remove the temporary converter directory when finished; keep both user outputs.
On Windows, use equivalent PowerShell temporary-directory and copy commands, or
an existing Node environment; do not require a Unix shell just for conversion.

For an installation check, copy `scripts/convert-png.test.mjs` to the same isolated
directory and run `node --test "$CONVERTER_DIR/convert-png.test.mjs"`.
