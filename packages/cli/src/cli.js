import { readFileSync } from "node:fs";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { UsageError, closest, parseArgs, parseLineRange, renderFields } from "./args.js";
import { AuthError, accessToken, loadCredentials, login, logout, tokenClaims } from "./auth.js";

export const VERSION = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;
export const DEFAULT_HOST = "https://supagist.app";
export const EXIT = { ok: 0, failure: 1, usage: 2 };
const FORMATS = ["svg", "png"];

// Shown when there is nothing to render: what it does and the common cases.
const SHORT_HELP = `Nothing to render. Give a file, a range or pipe code in:

  supagist src/app.ts                     app.png here
  supagist src/app.ts:12-40 --brand supabase
  pbpaste | supagist --filename app.ts

Run supagist --help for every option.`;

export const HELP = `supagist ${VERSION}: turn code into a Supagist image
https://supagist.app

Examples
  supagist src/app.ts                           app.png in this folder
  supagist src/app.ts:12-40 --brand supabase    lines 12-40, Supabase style
  supagist https://github.com/o/r/blob/main/a.ts#L5-L20
  supagist src/app.ts --aspect-ratio 16:9 --copy
                                                16:9 image, ready to paste
  pbpaste | supagist --filename app.ts --out app.svg
  supagist src/app.ts --publish                 private link, copied

Usage
  supagist <file[:a-b]> [options]   Render a file, or lines a to b of it
  supagist <github-file-link>       Render a GitHub file, with its #L12-L40 lines
  supagist [options] < file         Render piped code (or name stdin with -)
  supagist <file|-> --publish       Publish a private snippet and print its link
  supagist options [--json]         List brands, themes, fonts, languages and more
  supagist auth login|logout|status Sign the CLI in to publish (opens a browser)

Output
  -o, --out <file>        Write to a .svg or .png file. In a terminal the default
                          is <name>.png here (never overwritten); piped, the
                          image goes to stdout as SVG
      --format svg|png    Output format (default: from --out, else as above)
      --lines <a-b>       Render only lines a to b of the file
      --copy              Copy the PNG (or the published link) to the clipboard
      --open              Open the image (or the published snippet)
      --from-clipboard    Render the code on the clipboard
      --json              Machine-readable output and errors on stdout
      --publish           Save a private snippet to your account instead
      --public            Publish it public instead of private
      --title <text>      Page title of the published snippet

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

Privacy
  Rendering doesn't save your code anywhere.
  --publish saves it as a private snippet, like a secret GitHub gist: hidden
  from others, but anyone you share the link with can see it. --public lets
  anyone see it.
  API keys and other secrets are removed before it's saved.

Exit codes
  0 success   1 error   2 wrong arguments
`;

/**
 * @typedef {{
 *   stdin: AsyncIterable<Buffer | string> & { isTTY?: boolean },
 *   stdout: { write(chunk: string | Uint8Array): unknown, isTTY?: boolean },
 *   stderr: { write(chunk: string): unknown, isTTY?: boolean },
 *   env: Record<string, string | undefined>,
 *   fetch: typeof fetch,
 *   openUrl?: (url: string) => unknown,
 *   copyImage?: (path: string) => Promise<unknown>,
 *   copyText?: (text: string) => Promise<unknown>,
 *   readClipboard?: () => Promise<string>,
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
    const host = resolveHost(io.env);
    if (args.command === "options") return await options(host, args.flags, io);
    if (args.command === "auth")
      return await auth(host, /** @type {string} */ (args.action), args.flags, io);
    if (args.file === undefined && io.stdin.isTTY && !args.flags["from-clipboard"]) {
      throw new UsageError(SHORT_HELP);
    }
    return await render(host, args.file ?? "-", args.flags, io);
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

/** SUPAGIST_HOST points the CLI at a local or preview server (see CONTRIBUTING.md). @param {Io["env"]} env */
export function resolveHost(env) {
  const value = env.SUPAGIST_HOST || DEFAULT_HOST;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new UsageError(`SUPAGIST_HOST must be a URL such as ${DEFAULT_HOST}, got "${value}".`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UsageError(`SUPAGIST_HOST must use http or https, got "${value}".`);
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
  const copy = Boolean(flags.copy) && !flags.publish;
  // In a terminal, an image is a file: PNG next to you, never over another
  // file. --copy alone sends it to the clipboard instead, and --open needs a
  // file. Piped or redirected, it stays on stdout (SVG unless --format png).
  const autoFile =
    !out && (Boolean(flags.open) || (!copy && Boolean(io.stdout.isTTY) && !flags.json));
  const format = outputFormat(
    /** @type {string | undefined} */ (flags.format ?? (autoFile || copy ? "png" : undefined)),
    out,
  );
  if (copy && format !== "png")
    throw new UsageError("--copy copies a PNG image; drop --format svg.");
  if (flags["from-clipboard"] && file !== "-") {
    throw new UsageError(`Render ${file} or --from-clipboard, not both.`);
  }

  const source = file === "-" ? { file } : await locate(file);
  if (source.lines && flags.lines !== undefined) {
    throw new UsageError(`Give the lines once: ${file} already has :${source.lines}.`);
  }
  file = source.file;
  const lines = source.lines ?? flags.lines;
  const range = typeof lines === "string" ? parseLineRange(lines) : undefined;
  let code =
    file === "-"
      ? flags["from-clipboard"]
        ? await readClipboard(io)
        : await readStdin(io.stdin)
      : source.url
        ? await download(source.url, io)
        : await readSource(file);
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
  const response = await spin(io, `Rendering ${fields.filename ?? "code"}`, () =>
    request(host, "/api/render", io, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  ).catch((error) => suggestBrand(error, host, flags, io));
  const bytes = new Uint8Array(await response.arrayBuffer());
  const width = Number(response.headers.get("x-supagist-width")) || undefined;
  const height = Number(response.headers.get("x-supagist-height")) || undefined;

  const size = width ? ` (${width}×${height})` : "";
  /** @type {string | undefined} */
  let path = out;
  if (autoFile) {
    const stem = basename(String(flags.filename ?? (file === "-" ? "snippet" : file)));
    path = await writeNewFile(
      io.cwd ?? process.cwd(),
      stem.slice(0, stem.length - extname(stem).length) || stem,
      format,
      bytes,
    );
  } else if (out) {
    await writeFile(out, bytes);
  }
  if (path || copy) {
    if (copy) await copyPng(bytes, path, io);
    if (path && flags.open) io.openUrl?.(resolve(io.cwd ?? process.cwd(), path));
    if (flags.json) {
      const result = { ok: true, ...(path ? { path } : {}), ...(copy ? { copied: true } : {}) };
      return print(
        io,
        `${JSON.stringify({ ...result, format, width, height, bytes: bytes.length })}\n`,
      );
    }
    io.stderr.write(
      path ? `Saved ${path}${size}${copy ? " and copied it" : ""}\n` : `Copied the image${size}\n`,
    );
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
 * Shows a spinner on stderr while work runs, only when a person is watching.
 * @template T @param {Io} io @param {string} label @param {() => Promise<T>} work
 */
async function spin(io, label, work) {
  if (!io.stderr.isTTY || io.env.CI) return work();
  const frames = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
  let i = 0;
  const draw = () => io.stderr.write(`\r${frames[i++ % frames.length]} ${label}…`);
  draw();
  const timer = setInterval(draw, 80);
  try {
    return await work();
  } finally {
    clearInterval(timer);
    io.stderr.write("\r\x1b[2K");
  }
}

/**
 * The server lists every brand when one is unknown; say which one was meant.
 * @param {unknown} error @param {string} host @param {Record<string, unknown>} flags @param {Io} io
 * @returns {Promise<never>}
 */
async function suggestBrand(error, host, flags, io) {
  if (!(error instanceof ApiError) || error.details.code !== "INVALID_INPUT" || !flags.brand) {
    throw error;
  }
  const brands = await request(host, "/api/options", io)
    .then((r) => r.json())
    .then((catalog) => catalog.brands.map((/** @type {{ id: string }} */ b) => b.id))
    .catch(() => null);
  const brand = String(flags.brand);
  if (!brands || brands.includes(brand)) throw error;
  const guess = closest(brand, brands);
  throw new ApiError({
    ...error.details,
    message: `Unknown brand ${brand}.${guess ? ` Did you mean ${guess}?` : ""} Run supagist options to see them all.`,
  });
}

/**
 * Puts the PNG on the clipboard. The system tools copy from a file, so a
 * clipboard-only render goes through a temporary one.
 * @param {Uint8Array} bytes @param {string | undefined} path @param {Io} io
 */
async function copyPng(bytes, path, io) {
  if (!io.copyImage) throw new Error("Copying isn't available here.");
  if (path) return await io.copyImage(resolve(io.cwd ?? process.cwd(), path));
  const dir = await mkdtemp(join(tmpdir(), "supagist-"));
  try {
    await writeFile(join(dir, "image.png"), bytes);
    await io.copyImage(join(dir, "image.png"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** @param {Io} io */
async function readClipboard(io) {
  if (!io.readClipboard) throw new Error("Reading the clipboard isn't available here.");
  try {
    return await io.readClipboard();
  } catch (error) {
    throw new Error(`Can't read the clipboard: ${error?.message ?? error}`);
  }
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

/**
 * Splits "path:12-40" (the form editors and stack traces print) into the
 * file and its lines, unless a file with that whole name exists.
 * @param {string} spec
 * @returns {Promise<{ file: string, lines?: string, url?: string }>}
 */
async function locate(spec) {
  if (spec.startsWith("https://") || spec.startsWith("http://")) return fromUrl(spec);
  const colon = spec.lastIndexOf(":");
  if (colon <= 0 || (await exists(spec))) return { file: spec };
  const lines = spec.slice(colon + 1);
  try {
    parseLineRange(lines);
  } catch {
    return { file: spec };
  }
  return { file: spec.slice(0, colon), lines };
}

/**
 * A GitHub file link (github.com/o/r/blob/<ref>/<path>#L12-L40) becomes its raw
 * file and lines; any other URL is fetched as is. The file name comes from
 * the path, so language detection and the header work like a local file.
 * @param {string} spec
 */
function fromUrl(spec) {
  const url = new URL(spec);
  const [owner, repo, kind, ...rest] = url.pathname.split("/").slice(1);
  /** @type {string | undefined} */
  let lines;
  if (url.hostname === "github.com" && kind === "blob" && rest.length > 1) {
    url.hostname = "raw.githubusercontent.com";
    url.pathname = `/${owner}/${repo}/${rest.join("/")}`;
    const [start, end] = url.hash.slice(1).split("-");
    if (start?.startsWith("L")) {
      lines = end?.startsWith("L") ? `${start.slice(1)}-${end.slice(1)}` : start.slice(1);
      parseLineRange(lines);
    }
  }
  url.hash = "";
  url.search = url.hostname === "raw.githubusercontent.com" ? "" : url.search;
  return {
    file: decodeURIComponent(url.pathname.split("/").pop() || "snippet"),
    url: url.href,
    lines,
  };
}

/** @param {string} url @param {Io} io */
async function download(url, io) {
  let response;
  try {
    response = await io.fetch(url, {
      headers: { "user-agent": `supagist-cli/${VERSION}` },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new Error(`Can't fetch ${url}: ${error?.cause?.message ?? error?.message ?? error}.`);
  }
  if (!response.ok) {
    const hint =
      response.status === 404 ? " For a private repository, clone it and pass the path." : "";
    throw new Error(`Can't fetch ${url}: HTTP ${response.status}.${hint}`);
  }
  return await response.text();
}

/** @param {string} path */
async function exists(path) {
  return access(path).then(
    () => true,
    () => false,
  );
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
    throw new UsageError(`Lines ${start}-${end} start after the last line (${lines.length}).`);
  }
  return lines.slice(start - 1, end).join("\n");
}

/**
 * Publishes through the MCP publish_snippet tool as the signed-in CLI user:
 * the server redacts secrets, stores the snippet (private unless --public) and applies the
 * same storage policies, RLS and rate limits as any publish.
 * @param {string} host
 * @param {Record<string, unknown>} fields
 * @param {Record<string, string | number | boolean | null>} flags
 * @param {Io} io
 */
async function publish(host, fields, flags, io) {
  const token = await accessToken(host, io);
  const args = {
    ...fields,
    ...(typeof flags.title === "string" ? { title: flags.title } : {}),
    visibility: flags.public ? "public" : "private",
  };
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
  if (flags.json) {
    if (flags.copy) await io.copyText?.(result.url);
    if (flags.open) io.openUrl?.(result.url);
    return print(io, `${JSON.stringify({ ...output, ...(flags.copy ? { copied: true } : {}) })}\n`);
  }
  const redacted = result.redactions?.redacted ?? 0;
  const kinds = Object.entries(result.redactions?.kinds ?? {})
    .map(([kind, count]) => `${count} ${kind}`)
    .join(", ");
  // A person at a terminal wants the link in the clipboard; scripts opt in.
  let copied = false;
  if ((flags.copy || io.stdout.isTTY) && io.copyText) {
    copied = await io.copyText(result.url).then(
      () => true,
      () => false,
    );
  }
  if (flags.open) io.openUrl?.(result.url);
  io.stderr.write(
    (result.visibility === "public"
      ? "Published as public: anyone can view it."
      : "Published as private: hidden from others, but anyone you share the link with can view it.") +
      `${copied ? " Link copied." : ""}\n` +
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
