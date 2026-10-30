import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const [input, output, ...sizeArgs] = process.argv.slice(2);
const maxPixels = 16_000_000;
let fontDirectory;
try {
  let fitTo = { mode: "width", value: 2000 };
  if (sizeArgs.length === 1 && ["1", "2"].includes(sizeArgs[0])) {
    fitTo = { mode: "zoom", value: Number(sizeArgs[0]) };
  } else if (
    sizeArgs.length === 2 &&
    sizeArgs[0] === "--width" &&
    Number.isSafeInteger(Number(sizeArgs[1])) &&
    Number(sizeArgs[1]) > 0 &&
    Number(sizeArgs[1]) <= maxPixels
  ) {
    fitTo.value = Number(sizeArgs[1]);
  } else if (sizeArgs.length) {
    throw new Error("Usage: node convert-png.mjs INPUT.svg OUTPUT.png [--width PIXELS | 1 | 2]");
  }
  if (!input || !output) {
    throw new Error("Usage: node convert-png.mjs INPUT.svg OUTPUT.png [--width PIXELS | 1 | 2]");
  }
  const svg = readFileSync(input, "utf8");
  const fontFiles = [];
  // Supagist emits a single-quoted data:font/ttf URL in @font-face.
  // Keep this explicit contract rather than guessing fonts from the filename.
  // Search its style block only, not code text which can contain the same URL.
  const styleStart = svg.indexOf("<style>");
  const style = styleStart === -1 ? "" : svg.slice(styleStart, svg.indexOf("</style>", styleStart));
  const marker = "data:font/ttf;base64,";
  let offset = style.indexOf(marker);
  while (offset !== -1) {
    const start = offset + marker.length;
    const end = style.indexOf("'", start);
    const encoded = style.slice(start, end);
    const font = Buffer.from(encoded, "base64");
    if (end === -1 || !font.length || font.toString("base64") !== encoded) {
      throw new Error("Invalid embedded Supagist TTF data");
    }
    // The native Node binding uses fontFiles, unlike resvg-wasm's fontBuffers.
    fontDirectory ??= mkdtempSync(join(tmpdir(), "supagist-fonts-"));
    const path = join(fontDirectory, `${fontFiles.length}.ttf`);
    writeFileSync(path, font);
    fontFiles.push(path);
    offset = style.indexOf(marker, end + 1);
  }
  const renderer = new Resvg(svg, {
    fitTo,
    font: {
      fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: "JetBrains Mono",
      monospaceFamily: "JetBrains Mono",
      sansSerifFamily: "JetBrains Mono",
    },
  });
  // These getters describe the SVG, not the scaled PNG. Check before rasterizing.
  const scale = fitTo.mode === "width" ? fitTo.value / renderer.width : fitTo.value;
  const width = Math.round(renderer.width * scale);
  const height = Math.round(renderer.height * scale);
  if (width * height > maxPixels) {
    throw new Error("Requested PNG exceeds 16 million pixels; use a smaller width or scale");
  }
  const image = renderer.render();
  writeFileSync(output, image.asPng(), { flag: "wx" });
  console.log(`Saved PNG: ${output} (${image.width}×${image.height})`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (fontDirectory) rmSync(fontDirectory, { recursive: true, force: true });
}
