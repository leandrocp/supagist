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

test("renders at 2000px by default, requested widths, or explicit scales without modifying the source", () => {
  const dir = mkdtempSync(join(tmpdir(), "supagist-png-test-"));
  try {
    const input = join(dir, "source.svg");
    writeFileSync(input, svg);
    for (const [args, width, height] of [
      [[], 2000, 1077],
      [["--width", "101"], 101, 54],
      [["--width", "2600"], 2600, 1400],
      [["1"], 13, 7],
      [["2"], 26, 14],
      [["4"], 52, 28],
      [["6"], 78, 42],
    ]) {
      const output = join(dir, `${width}.png`);
      const result = spawnSync(process.execPath, [cli, input, output, ...args]);
      assert.equal(result.status, 0, result.stderr.toString());
      const png = readFileSync(output);
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(png.readUInt32BE(16), width);
      assert.equal(png.readUInt32BE(20), height);
      assert.equal(readFileSync(input, "utf8"), svg);
      const overwrite = spawnSync(process.execPath, [cli, input, output, ...args]);
      assert.notEqual(overwrite.status, 0);
      assert.deepEqual(readFileSync(output), png);
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
    for (const [source, args] of [
      [svg, ["3"]],
      ...[[], ["0"], ["-1"], ["1.5"], ["Infinity"], ["abc"], ["16000001"], ["2000", "2"]].map(
        (values) => [svg, ["--width", ...values]],
      ),
      ['{"result":{"isError":true}}', []],
      [svg.replace("</svg>", "<style>data:font/ttf;base64,???'</style></svg>"), []],
      [svg.replace('width="13"', 'width="5000"').replace('height="7"', 'height="1000"'), ["2"]],
      [svg.replace('width="13"', 'width="1000"').replace('height="7"', 'height="4001"'), []],
      [svg, ["--width", "10000"]],
    ]) {
      writeFileSync(input, source);
      const result = spawnSync(process.execPath, [cli, input, output, ...args]);
      assert.notEqual(result.status, 0);
      assert.equal(existsSync(output), false);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("allows exactly 16 million output pixels in width mode", () => {
  const dir = mkdtempSync(join(tmpdir(), "supagist-png-test-"));
  try {
    const input = join(dir, "source.svg");
    const output = join(dir, "out.png");
    writeFileSync(
      input,
      svg.replace('width="13"', 'width="1000"').replace('height="7"', 'height="4000"'),
    );
    const result = spawnSync(process.execPath, [cli, input, output]);
    assert.equal(result.status, 0, result.stderr.toString());
    const png = readFileSync(output);
    assert.equal(png.readUInt32BE(16), 2000);
    assert.equal(png.readUInt32BE(20), 8000);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
