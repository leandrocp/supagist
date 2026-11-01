import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { UsageError, parseArgs, parseLineRange, renderFields } from "./args.js";
import { AuthError, accessToken, loadCredentials, login, logout, tokenClaims } from "./auth.js";

export const VERSION = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;
export const DEFAULT_HOST = "https://supagist.app";
export const EXIT = { ok: 0, failure: 1, usage: 2 };
const FORMATS = ["svg", "png"];

export const HELP = `supagist ${VERSION}: turn code into a Supagist image

Usage
  supagist <file|-> [options]       Render a file, or stdin with -
  supagist <file|-> --publish       Publish an unlisted snippet and print its link
  supagist options [--json]         List brands, themes, fonts, languages and more
  supagist auth login|logout|status Sign the CLI in to publish (opens a browser)

Output
  -o, --out <file>        Write to a .svg or .png file. In a terminal the default
                          is <name>.png here (never overwritten); piped, the
                          image goes to stdout as SVG
      --format svg|png    Output format (default: from --out, else as above)
      --lines <a-b>       Render only lines a to b of the file
      --json              Machine-readable output and errors on stdout
      --publish           Save an unlisted snippet to your account instead
      --title <text>      Page title of the published snippet
      --host <url>        Server (default: $SUPAGIST_HOST or ${DEFAULT_HOST})

Appearance (values come from \`supagist options\`; flags override the brand)
  --brand <id>  --theme <id>  --background <label|none>  --font <id>
  --font-size <n>  --outer-padding <n>  --inner-padding <n>  --corner-radius <n>
  --window <decoration>  --[no-]line-numbers  --[no-]ligatures  --[no-]word-diff
  --aspect-ratio 16:9  --pixel-ratio <n>  --language <id>  --filename <name>
  --author <name>
  --[no-]header  --[no-]header-filename  --[no-]header-language
  --filename-position <left|center|right>  --language-position <left|center|right>
  --[no-]footer  --[no-]footer-language  --[no-]footer-theme  --[no-]footer-lines
  --[no-]footer-chars  --[no-]footer-author  --footer-align <left|center|right>

Rendering creates nothing on the server. --publish creates an unlisted snippet
(anyone with the link can view it) after replacing common secrets with
[REDACTED:kind]. Exit codes: 0 ok, 1 failure, 2 usage.
`;

/**
 * @typedef {{
 *   stdin: AsyncIterable<Buffer | string>,
 *   stdout: { write(chunk: string | Uint8Array): unknown, isTTY?: boolean },
 *   stderr: { write(chunk: string): unknown },
 *   env: Record<string, string | undefined>,
 *   fetch: typeof fetch,
 *   openUrl?: (url: string) => unknown,
 *   now?: () => number,
 *   cwd?: string,
 * }} Io
 */

class ApiError extends Error {
  /** @param {{ code: string, message: string, status?: number, retryAfter?: number }} details */
  constructor(details) {
    super(details.message);
    this.details = details;
  }
}

/**
 * Runs the CLI and resolves to its exit code. Never throws.
 * @param {string[]} argv
 * @param {Io} io
 */
export async function run(argv, io) {
  const json = argv.includes("--json");
  try {
    const args = parseArgs(argv);
    if (args.command === "version") return print(io, `${VERSION}\n`);
    if (args.command === "help") return print(io, HELP);
    const host = resolveHost(/** @type {string | undefined} */ (args.flags.host), io.env);
    if (args.command === "options") return await options(host, args.flags, io);
    if (args.command === "auth")
      return await auth(host, /** @type {string} */ (args.action), args.flags, io);
    return await render(host, /** @type {string} */ (args.file), args.flags, io);
  } catch (error) {
    const usage = error instanceof UsageError;
    const details =
      error instanceof ApiError
        ? error.details
        : {
            code: usage ? "USAGE" : error instanceof AuthError ? error.code : "FAILED",
            message: String(error?.message ?? error),
          };
    if (json) io.stdout.write(`${JSON.stringify({ ok: false, error: details })}\n`);
    else io.stderr.write(`supagist: ${details.message}\n`);
    const invalidInput =
      error instanceof ApiError &&
      ([400, 413].includes(details.status ?? 0) || details.code === "INVALID_INPUT");
    return usage || invalidInput ? EXIT.usage : EXIT.failure;
  }
}

/** @param {Io} io @param {string} text */
function print(io, text) {
  io.stdout.write(text);
  return EXIT.ok;
}

/** @param {string | undefined} flag @param {Io["env"]} env */
export function resolveHost(flag, env) {
  const value = flag ?? env.SUPAGIST_HOST ?? DEFAULT_HOST;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new UsageError(`--host must be a URL such as ${DEFAULT_HOST}, got "${value}".`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UsageError(`--host must use http or https, got "${value}".`);
  }
  return url.href.replace(/\/+$/, "");
}

/**
 * @param {string} host
 * @param {string} path
 * @param {Io} io
 * @param {RequestInit} [init]
 */
async function request(host, path, io, init = {}) {
  let response;
  try {
    response = await io.fetch(`${host}${path}`, {
      ...init,
      headers: { "user-agent": `supagist-cli/${VERSION}`, ...init.headers },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: `Could not reach ${host}: ${error?.cause?.message ?? error?.message ?? error}`,
    });
  }
  if (response.ok) return response;
  const body = await response.json().catch(() => null);
  const retryAfter = Number(response.headers.get("retry-after")) || undefined;
  throw new ApiError({
    // MCP errors are JSON-RPC objects with numeric codes.
    code:
      typeof body?.error?.code === "string"
        ? body.error.code
        : response.status === 429
          ? "RATE_LIMITED"
          : `HTTP_${response.status}`,
    message: body?.error?.message ?? `${host} answered ${response.status}.`,
    status: response.status,
    ...(retryAfter ? { retryAfter } : {}),
  });
}

/** @param {string} host @param {Record<string, unknown>} flags @param {Io} io */
async function options(host, flags, io) {
  const catalog = await (await request(host, "/api/options", io)).json();
  if (flags.json) return print(io, `${JSON.stringify(catalog, null, 2)}\n`);
  /** @param {unknown} list */
  const names = (list) =>
    Array.isArray(list)
      ? list.map((item) => (typeof item === "object" && item ? item.id : String(item))).join(", ")
      : "";
  const sections = [
    ["Brands (--brand)", catalog.brands],
    ["Themes (--theme)", catalog.themes],
    ["Backgrounds (--background)", catalog.backgrounds],
    ["Fonts (--font)", catalog.fonts],
    ["Font sizes (--font-size)", catalog.fontSizes],
    ["Outer padding (--outer-padding)", catalog.outerPadding],
    ["Inner padding (--inner-padding)", catalog.innerPadding],
    ["Corner radius (--corner-radius)", catalog.cornerRadius],
    ["Windows (--window)", catalog.windowDecorations],
    ["Aspect ratios (--aspect-ratio)", catalog.aspectRatios],
    ["Formats (--format)", catalog.formats],
    ["Languages (--language)", catalog.languages],
  ];
  const lines = sections
    .filter(([, list]) => Array.isArray(list))
    .map(([title, list]) => `${title}\n  ${names(list)}\n`);
  return print(
    io,
    `${lines.join("\n")}\nUse --json for the full catalog, including brand recipes.\n`,
  );
}

/**
 * @param {string} host
 * @param {string} file
 * @param {Record<string, string | number | boolean | null>} flags
 * @param {Io} io
 */
async function render(host, file, flags, io) {
  const out = /** @type {string | undefined} */ (flags.out);
  // In a terminal, an image is a file: PNG next to you, never over another
  // file. Piped or redirected, it stays on stdout (SVG unless --format png).
  const autoFile = !out && Boolean(io.stdout.isTTY) && !flags.json;
  const format = outputFormat(
    /** @type {string | undefined} */ (flags.format ?? (autoFile ? "png" : undefined)),
    out,
  );

  const range = typeof flags.lines === "string" ? parseLineRange(flags.lines) : undefined;
  let code = file === "-" ? await readStdin(io.stdin) : await readSource(file);
  if (range) code = cropLines(code, range);
  // A final newline is not a line of the image.
  code = code.replace(/\r?\n$/, "");

  const fields = {
    code,
    // null asks the server to detect the language from the filename and code.
    language: null,
    ...(file === "-" ? {} : { filename: basename(file) }),
    ...renderFields(flags),
  };
  if (flags.publish) return await publish(host, fields, flags, io);
  const body = { ...fields, ...(format === "png" ? { format } : {}) };
  const response = await request(host, "/api/render", io, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const width = Number(response.headers.get("x-supagist-width")) || undefined;
  const height = Number(response.headers.get("x-supagist-height")) || undefined;

  if (autoFile) {
    const stem = basename(String(flags.filename ?? (file === "-" ? "snippet" : file)));
    const path = await writeNewFile(
      io.cwd ?? process.cwd(),
      stem.slice(0, stem.length - extname(stem).length) || stem,
      format,
      bytes,
    );
    io.stderr.write(`Saved ${path}${width ? ` (${width}×${height})` : ""}\n`);
    return EXIT.ok;
  }
  if (out) {
    await writeFile(out, bytes);
    if (flags.json) {
      return print(
        io,
        `${JSON.stringify({ ok: true, path: out, format, width, height, bytes: bytes.length })}\n`,
      );
    }
    io.stderr.write(`Saved ${out}${width ? ` (${width}×${height})` : ""}\n`);
    return EXIT.ok;
  }
  if (flags.json) {
    const image =
      format === "svg"
        ? { svg: new TextDecoder().decode(bytes) }
        : { pngBase64: Buffer.from(bytes).toString("base64") };
    return print(io, `${JSON.stringify({ ok: true, format, width, height, ...image })}\n`);
  }
  io.stdout.write(bytes);
  return EXIT.ok;
}

/**
 * Writes name.ext in dir, or name-2.ext, name-3.ext… when taken, and returns
 * the name written. "wx" fails instead of replacing, even in a race.
 * @param {string} dir @param {string} name @param {string} ext @param {Uint8Array} bytes
 */
async function writeNewFile(dir, name, ext, bytes) {
  for (let n = 1; ; n++) {
    const file = `${name}${n === 1 ? "" : `-${n}`}.${ext}`;
    try {
      await writeFile(join(dir, file), bytes, { flag: "wx" });
      return file;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }
}

/** @param {string | undefined} format @param {string | undefined} out */
function outputFormat(format, out) {
  if (format !== undefined && !FORMATS.includes(format)) {
    throw new UsageError(`--format must be svg or png, got "${format}".`);
  }
  if (!out) return format ?? "svg";
  const extension = extname(out).slice(1).toLowerCase();
  if (!FORMATS.includes(extension)) {
    if (format) return format;
    throw new UsageError(`Can't tell the format of "${out}". Use .svg or .png, or --format.`);
  }
  if (format && format !== extension) {
    throw new UsageError(`--format ${format} does not match --out ${out}.`);
  }
  return extension;
}

/** @param {string} file */
async function readSource(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    const reason = error?.code === "ENOENT" ? "no such file" : (error?.message ?? String(error));
    throw new Error(`Can't read ${file}: ${reason}.`);
  }
}

/** @param {Io["stdin"]} stdin */
async function readStdin(stdin) {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

/** @param {string} code @param {[number, number]} range */
function cropLines(code, [start, end]) {
  const lines = code.replace(/\r?\n$/, "").split(/\r?\n/);
  if (start > lines.length) {
    throw new UsageError(`--lines ${start}-${end} starts after the last line (${lines.length}).`);
  }
  return lines.slice(start - 1, end).join("\n");
}

/**
 * Publishes through the MCP publish_snippet tool as the signed-in CLI user:
 * the server redacts secrets, stores the snippet as unlisted and applies the
 * same storage policies, RLS and rate limits as any publish.
 * @param {string} host
 * @param {Record<string, unknown>} fields
 * @param {Record<string, string | number | boolean | null>} flags
 * @param {Io} io
 */
async function publish(host, fields, flags, io) {
  const token = await accessToken(host, io);
  const args = { ...fields, ...(typeof flags.title === "string" ? { title: flags.title } : {}) };
  let response;
  try {
    response = await request(host, "/mcp", io, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "publish_snippet", arguments: args },
      }),
    });
  } catch (error) {
    if (error instanceof ApiError && error.details.status === 401) {
      throw new AuthError(`Your CLI session for ${host} has ended. Run supagist auth login.`);
    }
    throw error;
  }
  const message = parseRpc(await response.text());
  if (message?.error) {
    throw new ApiError({
      // -32602: arguments failed the tool's input schema.
      code: message.error.code === -32602 ? "INVALID_INPUT" : "PUBLISH_FAILED",
      message: String(message.error.message),
    });
  }
  const text = message?.result?.content?.find((/** @type {any} */ c) => c.type === "text")?.text;
  if (message?.result?.isError || typeof text !== "string") {
    throw new ApiError({ code: "PUBLISH_FAILED", message: text ?? "Publishing failed." });
  }
  const result = JSON.parse(text);
  const output = {
    ok: true,
    url: result.url,
    image: result.image_url,
    visibility: result.visibility,
    redactions: result.redactions,
  };
  if (flags.json) return print(io, `${JSON.stringify(output)}\n`);
  const redacted = result.redactions?.redacted ?? 0;
  const kinds = Object.entries(result.redactions?.kinds ?? {})
    .map(([kind, count]) => `${count} ${kind}`)
    .join(", ");
  io.stderr.write(
    `Published as ${result.visibility}: anyone with the link can view it.\n` +
      (redacted
        ? `Replaced ${redacted} secret${redacted === 1 ? "" : "s"} with [REDACTED:kind] (${kinds}).\n`
        : ""),
  );
  return print(io, `${result.url}\n`);
}

/** A JSON-RPC message from a JSON or single-event SSE body. @param {string} body */
function parseRpc(body) {
  const data =
    body.startsWith("event:") || body.startsWith("data:")
      ? body
          .split("\n")
          .find((line) => line.startsWith("data:"))
          ?.slice(5)
      : body;
  try {
    return JSON.parse(data ?? "");
  } catch {
    throw new ApiError({ code: "PUBLISH_FAILED", message: "The server sent an unreadable reply." });
  }
}

/**
 * @param {string} host
 * @param {string} action
 * @param {Record<string, unknown>} flags
 * @param {Io} io
 */
async function auth(host, action, flags, io) {
  /** @param {Record<string, unknown>} result @param {string} text */
  const report = (result, text) =>
    flags.json ? print(io, `${JSON.stringify({ ok: true, host, ...result })}\n`) : print(io, text);
  if (action === "login") {
    const credentials = await login(host, io);
    const email = tokenClaims(credentials.accessToken).email;
    return report(
      { signedIn: true, email },
      `Signed in to ${host}${email ? ` as ${email}` : ""}.\n`,
    );
  }
  if (action === "logout") {
    const { signedOut, revoked } = await logout(host, io);
    return report(
      { signedIn: false, revoked },
      !signedOut
        ? `Not signed in to ${host}.\n`
        : revoked
          ? `Signed out of ${host}.\n`
          : `Removed the saved sign-in for ${host}. The server did not confirm the session ended.\n`,
    );
  }
  const credentials = await loadCredentials(host, io);
  if (!credentials) {
    if (flags.json) io.stdout.write(`${JSON.stringify({ ok: true, host, signedIn: false })}\n`);
    else io.stderr.write(`Not signed in to ${host}. Run supagist auth login.\n`);
    return EXIT.failure;
  }
  const email = tokenClaims(credentials.accessToken).email;
  return report({ signedIn: true, email }, `Signed in to ${host}${email ? ` as ${email}` : ""}.\n`);
}
