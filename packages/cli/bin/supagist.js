#!/usr/bin/env node
import { spawn } from "node:child_process";
import { run } from "../src/cli.js";

/** Opens the sign-in page in the default browser; the URL is printed too. */
function openUrl(url) {
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.on("error", () => {});
  child.unref();
}

process.exitCode = await run(process.argv.slice(2), {
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
  env: process.env,
  fetch,
  openUrl,
});
