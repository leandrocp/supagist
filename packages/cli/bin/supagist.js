#!/usr/bin/env node
import { run } from "../src/cli.js";
import { copyImage, copyText, openUrl, readClipboard } from "../src/system.js";

process.exitCode = await run(process.argv.slice(2), {
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
  env: process.env,
  fetch,
  openUrl,
  copyImage,
  copyText,
  readClipboard,
});
