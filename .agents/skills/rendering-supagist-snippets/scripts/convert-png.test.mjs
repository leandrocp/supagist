import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("./convert-png.mjs", import.meta.url));
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="7"><desc>Code may contain data:font/ttf;base64,not-a-font</desc><rect width="13" height="7" fill="#d92832"/></svg>';

test("converts actual SVG to PNG at 1x and 2x without modifying the source", () => {
  const dir = mkdtempSync(join(tmpdir(), "supagist-png-test-"));
  try {
    const input = join(dir, "source.svg");
    writeFileSync(input, svg);
    for (const scale of [1, 2]) {
      const output = join(dir, `${scale}.png`);
      const result = spawnSync(process.execPath, [cli, input, output, String(scale)]);
      assert.equal(result.status, 0, result.stderr.toString());
      const png = readFileSync(output);
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(png.readUInt32BE(16), 13 * scale);
      assert.equal(png.readUInt32BE(20), 7 * scale);
      assert.equal(readFileSync(input, "utf8"), svg);
    }
    const result = spawnSync(process.execPath, [cli, input, input]);
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(input, "utf8"), svg);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rejects invalid inputs and excessive output sizes without writing a PNG", () => {
  const dir = mkdtempSync(join(tmpdir(), "supagist-png-test-"));
  try {
    const input = join(dir, "source.svg");
    const output = join(dir, "out.png");
    for (const [source, scale] of [
      [svg, "3"],
      ['{"result":{"isError":true}}', "1"],
      [svg.replace("</svg>", "<style>data:font/ttf;base64,???'</style></svg>"), "1"],
      [svg.replace('width="13"', 'width="5000"').replace('height="7"', 'height="1000"'), "2"],
    ]) {
      writeFileSync(input, source);
      const result = spawnSync(process.execPath, [cli, input, output, scale]);
      assert.notEqual(result.status, 0);
      assert.equal(existsSync(output), false);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
