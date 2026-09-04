/**
 * Argument parsing for `npx supagist`.
 *
 * Deliberately thin on validation: the CLI only checks shapes it must know
 * locally (is this a number? is this a known subcommand?) and forwards
 * everything else verbatim. The set of legal brands, themes, backgrounds, and
 * window styles lives on the server in `lib/cli-appearance.ts`, so adding a
 * brand does not require publishing a new CLI to accept it.
 */

export const DEFAULT_HOST = "https://supagist.app";

export type PublishOptions = {
  /** Path to read, or `-` for stdin. */
  source: string;
  filename?: string;
  language?: string;
  host: string;
  open: boolean;
  json: boolean;
  /** Forwarded to the server as the `appearance` object. */
  appearance: Record<string, unknown>;
};

export type ParsedArgs =
  | { command: "help" }
  | { command: "version" }
  | { command: "auth"; action: "login" | "logout" | "status"; host: string; json: boolean }
  | { command: "publish"; options: PublishOptions };

export class ArgError extends Error {}

type FlagSpec =
  | { kind: "string"; key: string }
  | { kind: "number"; key: string }
  | { kind: "boolean"; key: string; value: boolean };

/**
 * Appearance flags, mapped to the JSON keys `parseCliAppearance` expects.
 * Paired `--x` / `--no-x` booleans are listed explicitly so that passing
 * neither leaves the field absent — absent means "inherit the brand preset or
 * the default", which is different from an explicit `false`.
 */
const APPEARANCE_FLAGS: Record<string, FlagSpec> = {
  "--brand": { kind: "string", key: "brand" },
  "--theme": { kind: "string", key: "theme" },
  "--background": { kind: "string", key: "background" },
  "--font": { kind: "string", key: "font" },
  "--window": { kind: "string", key: "window" },
  "--font-size": { kind: "number", key: "fontSize" },
  "--padding": { kind: "number", key: "outerPadding" },
  "--inner-padding": { kind: "number", key: "innerPadding" },
  "--corner-radius": { kind: "number", key: "cornerRadius" },
  "--pixel-ratio": { kind: "number", key: "pixelRatio" },
  "--line-numbers": { kind: "boolean", key: "lineNumbers", value: true },
  "--no-line-numbers": { kind: "boolean", key: "lineNumbers", value: false },
};

/** Header/footer visibility is nested one level down in the payload. */
const NESTED_BOOLEAN_FLAGS: Record<string, { group: "header" | "footer"; value: boolean }> = {
  "--header": { group: "header", value: true },
  "--no-header": { group: "header", value: false },
  "--footer": { group: "footer", value: true },
  "--no-footer": { group: "footer", value: false },
};

function requireValue(flag: string, value: string | undefined): string {
  if (value === undefined || value.startsWith("--")) {
    throw new ArgError(`${flag} requires a value.`);
  }
  return value;
}

function parseNumber(flag: string, raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new ArgError(`${flag} must be a number (got "${raw}").`);
  return value;
}

function normalizeHost(raw: string): string {
  let candidate = raw.trim();
  if (candidate.length === 0) throw new ArgError("--host requires a value.");
  if (!candidate.includes("://")) candidate = `https://${candidate}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new ArgError(`--host is not a valid URL: "${raw}".`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ArgError(`--host must be http or https (got "${url.protocol}").`);
  }
  return url.origin;
}

export function parseArgs(
  argv: string[],
  env: Record<string, string | undefined> = {},
): ParsedArgs {
  const defaultHost = env.SUPAGIST_HOST ? normalizeHost(env.SUPAGIST_HOST) : DEFAULT_HOST;

  if (argv.length === 0) return { command: "help" };

  const [first] = argv;

  if (first === "--help" || first === "-h" || first === "help") return { command: "help" };
  if (first === "--version" || first === "-v" || first === "version") return { command: "version" };

  if (first === "auth") {
    const rest = argv.slice(1);
    const action = rest.find((token) => !token.startsWith("-")) ?? "status";
    if (action !== "login" && action !== "logout" && action !== "status") {
      throw new ArgError(`Unknown auth command "${action}". Expected login, logout, or status.`);
    }

    let host = defaultHost;
    let json = false;
    for (let index = 0; index < rest.length; index += 1) {
      const token = rest[index];
      if (token === "--host") {
        host = normalizeHost(requireValue("--host", rest[++index]));
      } else if (token === "--json") {
        json = true;
      } else if (token.startsWith("-")) {
        throw new ArgError(`Unknown option "${token}" for \`auth ${action}\`.`);
      }
    }
    return { command: "auth", action, host, json };
  }

  if (first.startsWith("-") && first !== "-") {
    throw new ArgError(`Unknown option "${first}". Run \`supagist --help\`.`);
  }

  const options: PublishOptions = {
    source: first,
    host: defaultHost,
    open: false,
    json: false,
    appearance: {},
  };
  const header: Record<string, boolean> = {};
  const footer: Record<string, boolean> = {};

  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--no-background") {
      options.appearance.background = null;
      continue;
    }
    if (token === "--open") {
      options.open = true;
      continue;
    }
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token === "--host") {
      options.host = normalizeHost(requireValue("--host", argv[++index]));
      continue;
    }
    if (token === "--filename") {
      options.filename = requireValue("--filename", argv[++index]);
      continue;
    }
    if (token === "--language") {
      options.language = requireValue("--language", argv[++index]);
      continue;
    }

    const nested = NESTED_BOOLEAN_FLAGS[token];
    if (nested) {
      (nested.group === "header" ? header : footer).enabled = nested.value;
      continue;
    }

    const spec = APPEARANCE_FLAGS[token];
    if (!spec) {
      throw new ArgError(`Unknown option "${token}". Run \`supagist --help\`.`);
    }
    if (spec.kind === "boolean") {
      options.appearance[spec.key] = spec.value;
    } else {
      const raw = requireValue(token, argv[++index]);
      options.appearance[spec.key] = spec.kind === "number" ? parseNumber(token, raw) : raw;
    }
  }

  if (Object.keys(header).length > 0) options.appearance.header = header;
  if (Object.keys(footer).length > 0) options.appearance.footer = footer;

  return { command: "publish", options };
}

export function helpText(): string {
  return `supagist — publish a code snippet and get a shareable URL.

Usage
  npx supagist <file> [options]
  npx supagist - [options]              read the snippet from stdin
  npx supagist auth login|logout|status

Publish options
  --filename <name>       Name shown on the card (default: the file's basename)
  --language <id>         Force a language instead of inferring one
  --brand <id>            Apply a brand preset (supabase, vercel, stripe, ...)
  --theme <name>          Lumis syntax theme
  --background <label>    Canvas behind the card
  --no-background         Render the card with no canvas
  --font <id>             system | jetbrains | fira | geist | hack
  --font-size <n>         12 | 13 | 14 | 16 | 18 | 20
  --padding <n>           Outer padding: 0 | 16 | 32 | 64 | 96 | 128
  --inner-padding <n>     8 | 12 | 16 | 24 | 32 | 48
  --corner-radius <n>     0 | 4 | 8 | 12 | 16
  --pixel-ratio <n>       2 | 4 | 6
  --window <style>        macos | macos-subtle | windows | minimal | none
  --line-numbers          Show the line-number gutter (--no-line-numbers hides it)
  --header / --no-header  Show or hide the window chrome row
  --footer / --no-footer  Show or hide the metadata footer

General
  --open                  Open the published snippet in your browser
  --json                  Print machine-readable JSON
  --host <url>            Target a different deployment (env: SUPAGIST_HOST)
  -h, --help              Show this help
  -v, --version           Show the CLI version

Rendering and export happen on the server, so the CLI returns a URL — open it
to preview the snippet, react and comment on lines, or export the image.`;
}
