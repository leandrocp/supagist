// Argument parsing. The CLI checks shapes only (is it a number, a known
// subcommand, a well-formed range); the server owns the vocabulary of brands,
// themes, fonts and every other option, so new values need no CLI release.

export class UsageError extends Error {}

/** @typedef {{ type: "string" | "number" | "boolean", field?: string, group?: "header" | "footer", nullable?: boolean }} Flag */

/** Appearance flags map one-to-one onto render API fields. @type {Record<string, Flag>} */
export const APPEARANCE_FLAGS = {
  brand: { type: "string", field: "brand" },
  theme: { type: "string", field: "theme" },
  background: { type: "string", field: "background", nullable: true },
  font: { type: "string", field: "fontId" },
  "font-size": { type: "number", field: "fontSize" },
  "outer-padding": { type: "number", field: "outerPadding" },
  "inner-padding": { type: "number", field: "innerPadding" },
  "corner-radius": { type: "number", field: "cornerRadius" },
  window: { type: "string", field: "windowDecoration" },
  "line-numbers": { type: "boolean", field: "lineNumbers" },
  "word-diff": { type: "boolean", field: "wordDiff" },
  ligatures: { type: "boolean", field: "ligatures" },
  "aspect-ratio": { type: "string", field: "aspectRatio" },
  "pixel-ratio": { type: "number", field: "pixelRatio" },
  language: { type: "string", field: "language" },
  filename: { type: "string", field: "filename" },
  author: { type: "string", field: "author" },
  header: { type: "boolean", group: "header", field: "enabled" },
  "header-filename": { type: "boolean", group: "header", field: "showFilename" },
  "header-language": { type: "boolean", group: "header", field: "showLanguage" },
  "filename-position": { type: "string", group: "header", field: "filenamePosition" },
  "language-position": { type: "string", group: "header", field: "languagePosition" },
  footer: { type: "boolean", group: "footer", field: "enabled" },
  "footer-language": { type: "boolean", group: "footer", field: "showLanguage" },
  "footer-theme": { type: "boolean", group: "footer", field: "showTheme" },
  "footer-lines": { type: "boolean", group: "footer", field: "showLineCount" },
  "footer-chars": { type: "boolean", group: "footer", field: "showCharCount" },
  "footer-author": { type: "boolean", group: "footer", field: "showAuthor" },
  "footer-align": { type: "string", group: "footer", field: "alignment" },
};

/** @type {Record<string, Flag>} */
const GLOBAL_FLAGS = {
  json: { type: "boolean" },
  help: { type: "boolean" },
  version: { type: "boolean" },
};
/** @type {Record<string, Flag>} */
const RENDER_FLAGS = {
  ...APPEARANCE_FLAGS,
  out: { type: "string" },
  format: { type: "string" },
  lines: { type: "string" },
  publish: { type: "boolean" },
  copy: { type: "boolean" },
  open: { type: "boolean" },
  "from-clipboard": { type: "boolean" },
  title: { type: "string" },
};
const ALIASES = { o: "out", h: "help", v: "version" };
const AUTH_ACTIONS = ["login", "logout", "status"];
// Render-only flags: a published snippet is stored as SVG, owned and credited
// to the signed-in account, and written to no local file.
const NOT_PUBLISHED = ["out", "format", "pixel-ratio", "author"];

/**
 * @param {string[]} argv arguments after the executable and script
 * @returns {{ command: "help" | "version" | "options" | "auth" | "render", file?: string, action?: string, flags: Record<string, string | number | boolean | null> }}
 */
export function parseArgs(argv) {
  /** @type {string[]} */
  const positionals = [];
  /** @type {Record<string, string | number | boolean | null>} */
  const flags = {};
  const command = ["options", "auth", "render"].includes(argv[0]) ? argv[0] : undefined;
  const flagSet =
    command === "options" || command === "auth"
      ? GLOBAL_FLAGS
      : { ...GLOBAL_FLAGS, ...RENDER_FLAGS };
  /** @param {string} name */
  const lookup = (name) => (Object.hasOwn(flagSet, name) ? flagSet[name] : undefined);

  for (let i = command ? 1 : 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (arg === "-" || !arg.startsWith("-")) {
      positionals.push(arg);
      continue;
    }
    const [rawName, inline] = arg.startsWith("--")
      ? splitOnce(arg.slice(2))
      : [ALIASES[/** @type {keyof typeof ALIASES} */ (arg.slice(1))] ?? arg.slice(1), undefined];
    const negated = rawName.startsWith("no-") && lookup(rawName.slice(3))?.type === "boolean";
    const name = negated ? rawName.slice(3) : rawName;
    const flag = lookup(name);
    if (!flag) throw new UsageError(`Unknown option --${rawName}. Run supagist --help.`);
    if (name in flags) throw new UsageError(`--${name} was given more than once.`);
    if (flag.type === "boolean") {
      if (inline !== undefined) throw new UsageError(`--${rawName} takes no value.`);
      flags[name] = !negated;
      continue;
    }
    const value = inline ?? argv[++i];
    if (value === undefined || (inline === undefined && value.startsWith("--"))) {
      throw new UsageError(`--${name} needs a value.`);
    }
    if (flag.type === "number") {
      if (value.trim() === "" || !Number.isFinite(Number(value))) {
        throw new UsageError(`--${name} must be a number, got "${value}".`);
      }
      flags[name] = Number(value);
    } else {
      flags[name] = flag.nullable && value === "none" ? null : value;
    }
  }

  if (flags.version) return { command: "version", flags };
  if (flags.help || positionals[0] === "help") return { command: "help", flags };
  if (command === "auth") {
    if (positionals.length !== 1 || !AUTH_ACTIONS.includes(positionals[0])) {
      throw new UsageError("Use supagist auth login, logout or status.");
    }
    return { command, action: positionals[0], flags };
  }
  if (command === "options") {
    if (positionals.length) throw new UsageError("supagist options takes no arguments.");
    return { command, flags };
  }
  // No file means stdin; run() shows a short help instead when stdin is a terminal.
  if (positionals.length > 1) throw new UsageError("Render one file at a time.");
  if (flags.publish) {
    const conflict = NOT_PUBLISHED.find((name) => name in flags);
    if (conflict) throw new UsageError(`--${conflict} can't be used with --publish.`);
  } else if ("title" in flags) {
    throw new UsageError("--title only applies with --publish.");
  }
  return { command: "render", file: positionals[0], flags };
}

/** @param {string} text */
function splitOnce(text) {
  const at = text.indexOf("=");
  return at === -1 ? [text, undefined] : [text.slice(0, at), text.slice(at + 1)];
}

/**
 * Parses --lines "a-b" (1-based, inclusive) or "a" for a single line.
 * @param {string} spec
 * @returns {[number, number]}
 */
export function parseLineRange(spec) {
  const [start, end = start, extra] = spec.split("-");
  const bounds = [start, end].map(Number);
  if (
    extra !== undefined ||
    !bounds.every((n, i) => Number.isSafeInteger(n) && n >= 1 && [start, end][i] === String(n))
  ) {
    throw new UsageError(`--lines must look like 12-40, got "${spec}".`);
  }
  if (bounds[1] < bounds[0]) throw new UsageError(`--lines ${spec} ends before it starts.`);
  return /** @type {[number, number]} */ (bounds);
}

/**
 * Builds the render API body from parsed flags: only explicit flags are sent,
 * so the server applies defaults, then the brand preset, then these overrides.
 * @param {Record<string, string | number | boolean | null>} flags
 */
export function renderFields(flags) {
  /** @type {Record<string, unknown> & { header?: Record<string, unknown>, footer?: Record<string, unknown> }} */
  const fields = {};
  for (const [name, flag] of Object.entries(APPEARANCE_FLAGS)) {
    if (!(name in flags) || !flag.field) continue;
    if (flag.group) (fields[flag.group] ??= {})[flag.field] = flags[name];
    else fields[flag.field] = flags[name];
  }
  return fields;
}
