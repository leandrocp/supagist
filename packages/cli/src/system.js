// The operating system's clipboard and file opener, through the commands
// every desktop already has, so the CLI keeps zero dependencies.
import { spawn } from "node:child_process";

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ input?: string, output?: boolean }} [options]
 * @returns {Promise<string>}
 */
function exec(command, args, { input, output = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: [input === undefined ? "ignore" : "pipe", output ? "pipe" : "ignore", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => (stdout += chunk));
    child.stderr?.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) =>
      reject(
        /** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT"
          ? new Error(`${command} is not installed.`)
          : error,
      ),
    );
    child.on("close", (code) =>
      code === 0 ? resolve(stdout) : reject(new Error(stderr.trim() || `${command} failed.`)),
    );
    if (input !== undefined) child.stdin?.end(input);
  });
}

const wayland = () => Boolean(process.env.WAYLAND_DISPLAY);
const LINUX_HINT = "On Linux, install wl-clipboard (Wayland) or xclip (X11).";

/** @param {Promise<unknown>} promise */
async function withHint(promise) {
  try {
    return await promise;
  } catch (error) {
    if (process.platform !== "linux") throw error;
    throw new Error(`${/** @type {Error} */ (error).message} ${LINUX_HINT}`);
  }
}

/** Puts a PNG file on the clipboard as an image. @param {string} path absolute */
export async function copyImage(path) {
  if (process.platform === "darwin") {
    await exec("osascript", [
      "-e",
      `set the clipboard to (read (POSIX file ${JSON.stringify(path)}) as «class PNGf»)`,
    ]);
  } else if (process.platform === "win32") {
    await exec("powershell", [
      "-NoProfile",
      "-STA",
      "-Command",
      `Add-Type -AssemblyName System.Windows.Forms,System.Drawing; [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile(${JSON.stringify(path)}))`,
    ]);
  } else if (wayland()) {
    await withHint(exec("sh", ["-c", 'wl-copy --type image/png < "$0"', path]));
  } else {
    await withHint(exec("xclip", ["-selection", "clipboard", "-t", "image/png", "-i", path]));
  }
}

/** @param {string} text */
export async function copyText(text) {
  if (process.platform === "darwin") await exec("pbcopy", [], { input: text });
  else if (process.platform === "win32") await exec("clip", [], { input: text });
  else if (wayland()) await withHint(exec("wl-copy", [], { input: text }));
  else await withHint(exec("xclip", ["-selection", "clipboard"], { input: text }));
}

export async function readClipboard() {
  if (process.platform === "darwin") return exec("pbpaste", [], { output: true });
  if (process.platform === "win32") {
    return exec("powershell", ["-NoProfile", "-Command", "Get-Clipboard -Raw"], { output: true });
  }
  return /** @type {Promise<string>} */ (
    withHint(
      wayland()
        ? exec("wl-paste", ["--no-newline"], { output: true })
        : exec("xclip", ["-selection", "clipboard", "-o"], { output: true }),
    )
  );
}

/** Opens a file or URL with the default app, without waiting for it. @param {string} target */
export function openUrl(target) {
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [target]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", target]]
        : ["xdg-open", [target]];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.on("error", () => {});
  child.unref();
}
