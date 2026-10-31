import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { UsageError, parseArgs, parseLineRange, renderFields } from "./args.js";

export const VERSION = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;
export const DEFAULT_HOST = "https://supagist.app";
export const EXIT = { ok: 0, failure: 1, usage: 2 };
const FORMATS = ["svg", "png"];

export const HELP = `supagist ${VERSION}: turn code into a Supagist image

Usage
  supagist <file|-> [options]       Render a file, or stdin with -
  supagist options [--json]         List brands, themes, fonts, languages and more

Output
  -o, --out <file>        Write to a .svg or .png file (default: stdout)
      --format svg|png    Output format (default: from --out, else svg)
      --lines <a-b>       Render only lines a to b of the file
      --json              Machine-readable output and errors on stdout
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

Rendering creates nothing on the server. Exit codes: 0 ok, 1 failure, 2 usage.
`;

/**
 * @typedef {{
 *   stdin: AsyncIterable<Buffer | string>,
 *   stdout: { write(chunk: string | Uint8Array): unknown, isTTY?: boolean },
 *   stderr: { write(chunk: string): unknown },
 *   env: Record<string, string | undefined>,
 *   fetch: typeof fetch,
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
    return await render(host, /** @type {string} */ (args.file), args.flags, io);
  } catch (error) {
    const usage = error instanceof UsageError;
    const details =
      error instanceof ApiError
        ? error.details
        : { code: usage ? "USAGE" : "FAILED", message: String(error?.message ?? error) };
    if (json) io.stdout.write(`${JSON.stringify({ ok: false, error: details })}\n`);
    else io.stderr.write(`supagist: ${details.message}\n`);
    const invalidInput = error instanceof ApiError && [400, 413].includes(details.status ?? 0);
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
    code: body?.error?.code ?? `HTTP_${response.status}`,
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
  const format = outputFormat(/** @type {string | undefined} */ (flags.format), out);
  if (!out && format === "png" && io.stdout.isTTY && !flags.json) {
    throw new UsageError("Refusing to write PNG to a terminal. Use --out file.png.");
  }

  const range = typeof flags.lines === "string" ? parseLineRange(flags.lines) : undefined;
  let code = file === "-" ? await readStdin(io.stdin) : await readSource(file);
  if (range) code = cropLines(code, range);
  // A final newline is not a line of the image.
  code = code.replace(/\r?\n$/, "");

  const body = {
    code,
    // null asks the server to detect the language from the filename and code.
    language: null,
    ...(file === "-" ? {} : { filename: basename(file) }),
    ...renderFields(flags),
    ...(format === "png" ? { format } : {}),
  };
  const response = await request(host, "/api/render", io, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const width = Number(response.headers.get("x-supagist-width")) || undefined;
  const height = Number(response.headers.get("x-supagist-height")) || undefined;

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
