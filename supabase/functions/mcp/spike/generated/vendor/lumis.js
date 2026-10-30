/* eslint-disable -- Generated third-party code; see vendor-licenses.txt and vendor-manifest.json. */

import { n as __esmMin, r as __toESM, t as __commonJSMin } from "./rolldown-runtime-QN87gb9p.js";

// node_modules/pathe/dist/shared/pathe.M-eThtNZ.mjs
function normalizeWindowsPath(input = "") {
  if (!input) return input;
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
var _DRIVE_LETTER_START_RE, basename;
function init_pathe_M_eThtNZ() {
  return (init_pathe_M_eThtNZ = __esmMin(() => {
    _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
    basename = function (p, extension) {
      const segments = normalizeWindowsPath(p).split("/");
      let lastSegment = "";
      for (let i = segments.length - 1; i >= 0; i--) {
        const val = segments[i];
        if (val) {
          lastSegment = val;
          break;
        }
      }
      return extension && lastSegment.endsWith(extension)
        ? lastSegment.slice(0, -extension.length)
        : lastSegment;
    };
  }))();
}

// node_modules/@lumis-sh/lumis/dist/chunk-NB3WMMKI.js
function normalize(value) {
  return value
    .replaceAll(/^\p{White_Space}+|\p{White_Space}+$/gu, "")
    .replaceAll(/[A-Z]/gu, (character) => character.toLowerCase());
}
function escapeRegex(value) {
  return value.replaceAll(/[|\\{}()[\]^$+?.]/gu, "\\$&");
}
function globToRegExp(glob) {
  return new RegExp(`^${escapeRegex(glob).replaceAll("*", ".*")}$`, "u");
}
function idMatchingGlob(candidate) {
  return GLOB_REGEXES.find((matcher) => matcher.regex.test(candidate))?.id;
}
function languageIdForFilename(path) {
  const name = basename(normalize(path));
  if (name.length === 0) return void 0;
  return idMatchingGlob(name);
}
function parseLanguageHint(language) {
  if (language == null) return void 0;
  const normalized = normalize(language);
  if (normalized.length === 0) return PLAINTEXT_LANG_ID;
  const direct = EXACT_LANGUAGE_MAP[normalized];
  if (direct) return direct;
  const byFileName = languageIdForFilename(normalized);
  if (byFileName) return byFileName;
  const extension = normalized.startsWith(".") ? normalized.slice(1) : normalized;
  if (extension.length > 0) return idMatchingGlob(`*.${extension}`);
}
function fromEmacsModeHeader(source) {
  const lines = source.split(/\r?\n/u).slice(0, 2);
  for (const line of lines) {
    const modeMatch = line.match(/-\*-.*?mode: *([a-zA-Z0-9_+-]+).*-\*-/u);
    const shorthandMatch = line.match(/-\*-(.+)-\*-/u);
    const rawMode = modeMatch?.[1] ?? shorthandMatch?.[1];
    if (rawMode == null) continue;
    const language = EMACS_MODE_MAP[normalize(rawMode)];
    if (language) return language;
  }
}
function normalizeShebangCommand(command) {
  return basename(command)
    .toLowerCase()
    .replace(/\d+(?:\.\d+)*$/u, "");
}
function fromShebang(source) {
  const command = (source.split("\n", 1)[0] ?? "")
    .replace(/\r$/u, "")
    .match(/^#![ \t]*(?:\/usr\/bin\/env[ \t]+(?:(?:-S|--split-string)[ \t]+)?)?([^ \t]+)/u)?.[1];
  if (!command) return void 0;
  return SHEBANG_MAP[normalizeShebangCommand(command)];
}
function trimStartWhiteSpace(source) {
  return source.replace(/^\p{White_Space}+/u, "");
}
function looksLikeHtml(source) {
  return trimStartWhiteSpace(source).toLowerCase().startsWith("<!doctype html");
}
function looksLikeXml(source) {
  return trimStartWhiteSpace(source).toLowerCase().startsWith("<?xml");
}
function looksLikeObjc(language, source) {
  if (language == null || !basename(language).toLowerCase().endsWith(".h")) return false;
  return source
    .split(/\r?\n/u)
    .slice(0, 100)
    .some((line) =>
      ["#import", "@interface", "@protocol"].some((keyword) => line.startsWith(keyword)),
    );
}
function guessLanguage(language, source = "") {
  const explicit = parseLanguageHint(language);
  if (explicit) return explicit;
  const content = source.startsWith("﻿") ? source.slice(1) : source;
  const emacsMode = fromEmacsModeHeader(content);
  if (emacsMode) return emacsMode;
  const shebang = fromShebang(content);
  if (shebang) return shebang;
  if (looksLikeHtml(content)) return "html";
  if (looksLikeXml(content)) return "xml";
  if (looksLikeObjc(language, content)) return "objc";
  return PLAINTEXT_LANG_ID;
}
function normalizeLanguageName(value) {
  return value.replaceAll(/[A-Z]/gu, (character) => character.toLowerCase());
}
function cloneLanguageInfo(language) {
  return {
    ...language,
    aliases: [...language.aliases],
    extensions: [...language.extensions],
    globs: [...language.globs],
    emacsModes: [...language.emacsModes],
    shebangs: [...language.shebangs],
  };
}
var EXACT_LANGUAGE_MAP,
  EMACS_MODE_MAP,
  SHEBANG_MAP,
  GLOB_MATCHERS,
  PLAINTEXT_LANG_ID,
  DEFAULT_MATCH_LIMIT,
  MAX_MATCH_LIMIT,
  DEFAULT_TIME_LIMIT,
  GLOB_REGEXES,
  LANGUAGES;
function init_chunk_NB3WMMKI() {
  return (init_chunk_NB3WMMKI = __esmMin(() => {
    init_pathe_M_eThtNZ();
    EXACT_LANGUAGE_MAP = {
      angular: "angular",
      arduino: "arduino",
      asm: "asm",
      assembly: "asm",
      astro: "astro",
      bash: "bash",
      console: "bash",
      sh: "bash",
      "sh-session": "bash",
      shell: "bash",
      "shell-session": "bash",
      terminal: "bash",
      bicep: "bicep",
      c: "c",
      caddy: "caddy",
      clojure: "clojure",
      cmake: "cmake",
      comment: "comment",
      commonlisp: "commonlisp",
      cl: "commonlisp",
      cpp: "cpp",
      "c++": "cpp",
      csharp: "csharp",
      "c#": "csharp",
      css: "css",
      csv: "csv",
      d: "d",
      dart: "dart",
      flutter: "dart",
      diff: "diff",
      dockerfile: "dockerfile",
      docker: "dockerfile",
      dot: "dot",
      editorconfig: "editorconfig",
      eex: "eex",
      leex: "eex",
      ejs: "ejs",
      elixir: "elixir",
      elm: "elm",
      erb: "erb",
      erlang: "erlang",
      "erl-sh": "erlang",
      "erlang-repl": "erlang",
      fish: "fish",
      fortran: "fortran",
      fsharp: "fsharp",
      "f#": "fsharp",
      gitattributes: "gitattributes",
      gitignore: "gitignore",
      gleam: "gleam",
      glimmer: "glimmer",
      ember: "glimmer",
      handlebars: "glimmer",
      glsl: "glsl",
      go: "go",
      golang: "go",
      graphql: "graphql",
      gql: "graphql",
      groovy: "groovy",
      haskell: "haskell",
      hcl: "hcl",
      heex: "heex",
      html: "html",
      htmldjango: "htmldjango",
      django: "htmldjango",
      http: "http",
      hurl: "hurl",
      iex: "iex",
      ini: "ini",
      java: "java",
      javadoc: "javadoc",
      javascript: "javascript",
      js: "javascript",
      jsx: "javascript",
      jinja: "jinja",
      jinja2: "jinja",
      jinja_inline: "jinja_inline",
      jq: "jq",
      json: "json",
      jsonc: "json",
      jsonld: "json",
      json5: "json5",
      julia: "julia",
      just: "just",
      kdl: "kdl",
      kotlin: "kotlin",
      latex: "latex",
      tex: "latex",
      liquid: "liquid",
      llvm: "llvm",
      lua: "lua",
      luadoc: "luadoc",
      make: "make",
      markdown: "markdown",
      markdown_inline: "markdown_inline",
      matlab: "matlab",
      mdx: "mdx",
      mermaid: "mermaid",
      nginx: "nginx",
      nim: "nim",
      nix: "nix",
      nushell: "nushell",
      nu: "nushell",
      objc: "objc",
      "objective-c": "objc",
      ocaml: "ocaml",
      ocaml_interface: "ocaml_interface",
      pascal: "pascal",
      perl: "perl",
      php: "php",
      plaintext: "plaintext",
      text: "plaintext",
      txt: "plaintext",
      plain: "plaintext",
      powershell: "powershell",
      pwsh: "powershell",
      prisma: "prisma",
      protobuf: "protobuf",
      puppet: "puppet",
      python: "python",
      python3: "python",
      qmljs: "qmljs",
      qml: "qmljs",
      r: "r",
      racket: "racket",
      regex: "regex",
      rst: "rst",
      restructuredtext: "rst",
      ruby: "ruby",
      rust: "rust",
      scala: "scala",
      scheme: "scheme",
      scss: "scss",
      slim: "slim",
      solidity: "solidity",
      sql: "sql",
      psql: "sql",
      surface: "surface",
      svelte: "svelte",
      swift: "swift",
      systemverilog: "systemverilog",
      verilog: "systemverilog",
      tcl: "tcl",
      terraform: "terraform",
      tlaplus: "tlaplus",
      tla: "tlaplus",
      "tla+": "tlaplus",
      pluscal: "tlaplus",
      toml: "toml",
      toon: "toon",
      tsx: "tsx",
      typescript: "typescript",
      ts: "typescript",
      typst: "typst",
      vhdl: "vhdl",
      vim: "vim",
      viml: "vim",
      vimscript: "vim",
      vue: "vue",
      wat: "wat",
      wasm: "wat",
      webassembly: "wat",
      wgsl: "wgsl",
      xml: "xml",
      yaml: "yaml",
      zig: "zig",
      zsh: "zsh",
    };
    EMACS_MODE_MAP = {
      sh: "bash",
      c: "c",
      clojure: "clojure",
      lisp: "commonlisp",
      "c++": "cpp",
      csharp: "csharp",
      css: "css",
      csv: "csv",
      elixir: "elixir",
      elm: "elm",
      fsharp: "fsharp",
      gleam: "gleam",
      go: "go",
      groovy: "groovy",
      haskell: "haskell",
      hcl: "hcl",
      html: "html",
      django: "htmldjango",
      java: "java",
      js: "javascript",
      js2: "javascript",
      julia: "julia",
      nix: "nix",
      objc: "objc",
      tuareg: "ocaml",
      perl: "perl",
      fundamental: "plaintext",
      text: "plaintext",
      python: "python",
      ruby: "ruby",
      rust: "rust",
      scala: "scala",
      scss: "scss",
      slim: "slim",
      sql: "sql",
      surface: "surface",
      swift: "swift",
      tla: "tlaplus",
      "tla+": "tlaplus",
      toml: "toml",
      tsx: "tsx",
      typescript: "typescript",
      nxml: "xml",
      yaml: "yaml",
      zig: "zig",
    };
    SHEBANG_MAP = {
      ash: "bash",
      bash: "bash",
      dash: "bash",
      ksh: "bash",
      mksh: "bash",
      pdksh: "bash",
      rc: "bash",
      sh: "bash",
      tcc: "c",
      lisp: "commonlisp",
      sbcl: "commonlisp",
      ccl: "commonlisp",
      clisp: "commonlisp",
      ecl: "commonlisp",
      elixir: "elixir",
      groovy: "groovy",
      runghc: "haskell",
      runhaskell: "haskell",
      runhugs: "haskell",
      node: "javascript",
      bun: "javascript",
      nu: "nushell",
      ocaml: "ocaml",
      ocamlrun: "ocaml",
      ocamlscript: "ocaml",
      perl: "perl",
      python: "python",
      rscript: "r",
      racket: "racket",
      ruby: "ruby",
      macruby: "ruby",
      rake: "ruby",
      jruby: "ruby",
      rbx: "ruby",
      guile: "scheme",
      scheme: "scheme",
      swift: "swift",
      tclsh: "tcl",
      wish: "tcl",
      deno: "typescript",
      "ts-node": "typescript",
      zsh: "zsh",
    };
    GLOB_MATCHERS = [
      {
        id: "angular",
        glob: "*.angular",
      },
      {
        id: "angular",
        glob: "component.html",
      },
      {
        id: "arduino",
        glob: "*.ino",
      },
      {
        id: "arduino",
        glob: "*.pde",
      },
      {
        id: "asm",
        glob: "*.s",
      },
      {
        id: "asm",
        glob: "*.asm",
      },
      {
        id: "asm",
        glob: "*.assembly",
      },
      {
        id: "astro",
        glob: "*.astro",
      },
      {
        id: "bash",
        glob: "*.bash",
      },
      {
        id: "bash",
        glob: "*.bats",
      },
      {
        id: "bash",
        glob: "*.cgi",
      },
      {
        id: "bash",
        glob: "*.command",
      },
      {
        id: "bash",
        glob: "*.env",
      },
      {
        id: "bash",
        glob: "*.fcgi",
      },
      {
        id: "bash",
        glob: "*.ksh",
      },
      {
        id: "bash",
        glob: "*.sh",
      },
      {
        id: "bash",
        glob: "*.sh.in",
      },
      {
        id: "bash",
        glob: "*.tool",
      },
      {
        id: "bash",
        glob: ".bash_aliases",
      },
      {
        id: "bash",
        glob: ".bash_history",
      },
      {
        id: "bash",
        glob: ".bash_logout",
      },
      {
        id: "bash",
        glob: ".bash_profile",
      },
      {
        id: "bash",
        glob: ".bashrc",
      },
      {
        id: "bash",
        glob: ".cshrc",
      },
      {
        id: "bash",
        glob: ".env",
      },
      {
        id: "bash",
        glob: ".env.example",
      },
      {
        id: "bash",
        glob: ".flaskenv",
      },
      {
        id: "bash",
        glob: ".kshrc",
      },
      {
        id: "bash",
        glob: ".login",
      },
      {
        id: "bash",
        glob: ".profile",
      },
      {
        id: "bash",
        glob: "9fs",
      },
      {
        id: "bash",
        glob: "pkgbuild",
      },
      {
        id: "bash",
        glob: "bash_aliases",
      },
      {
        id: "bash",
        glob: "bash_logout",
      },
      {
        id: "bash",
        glob: "bash_profile",
      },
      {
        id: "bash",
        glob: "bashrc",
      },
      {
        id: "bash",
        glob: "cshrc",
      },
      {
        id: "bash",
        glob: "ebuild",
      },
      {
        id: "bash",
        glob: "eclass",
      },
      {
        id: "bash",
        glob: "gradlew",
      },
      {
        id: "bash",
        glob: "kshrc",
      },
      {
        id: "bash",
        glob: "login",
      },
      {
        id: "bash",
        glob: "man",
      },
      {
        id: "bash",
        glob: "profile",
      },
      {
        id: "bicep",
        glob: "*.bicep",
      },
      {
        id: "bicep",
        glob: "*.bicepparam",
      },
      {
        id: "c",
        glob: "*.c",
      },
      {
        id: "caddy",
        glob: "caddyfile",
      },
      {
        id: "caddy",
        glob: "caddyfile",
      },
      {
        id: "clojure",
        glob: "*.bb",
      },
      {
        id: "clojure",
        glob: "*.boot",
      },
      {
        id: "clojure",
        glob: "*.clj",
      },
      {
        id: "clojure",
        glob: "*.cljc",
      },
      {
        id: "clojure",
        glob: "*.clje",
      },
      {
        id: "clojure",
        glob: "*.cljs",
      },
      {
        id: "clojure",
        glob: "*.cljx",
      },
      {
        id: "clojure",
        glob: "*.edn",
      },
      {
        id: "clojure",
        glob: "*.joke",
      },
      {
        id: "clojure",
        glob: "*.joker",
      },
      {
        id: "cmake",
        glob: "*.cmake",
      },
      {
        id: "cmake",
        glob: "*.cmake.in",
      },
      {
        id: "cmake",
        glob: "cmakelists.txt",
      },
      {
        id: "commonlisp",
        glob: "*.lisp",
      },
      {
        id: "commonlisp",
        glob: "*.lsp",
      },
      {
        id: "commonlisp",
        glob: "*.asd",
      },
      {
        id: "cpp",
        glob: "*.cc",
      },
      {
        id: "cpp",
        glob: "*.cpp",
      },
      {
        id: "cpp",
        glob: "*.h",
      },
      {
        id: "cpp",
        glob: "*.hh",
      },
      {
        id: "cpp",
        glob: "*.hpp",
      },
      {
        id: "cpp",
        glob: "*.cxx",
      },
      {
        id: "cpp",
        glob: "*.cu",
      },
      {
        id: "cpp",
        glob: "*.hxx",
      },
      {
        id: "csharp",
        glob: "*.cs",
      },
      {
        id: "css",
        glob: "*.css",
      },
      {
        id: "csv",
        glob: "*.csv",
      },
      {
        id: "d",
        glob: "*.d",
      },
      {
        id: "dart",
        glob: "*.dart",
      },
      {
        id: "diff",
        glob: "*.diff",
      },
      {
        id: "dockerfile",
        glob: "dockerfile",
      },
      {
        id: "dockerfile",
        glob: "dockerfile",
      },
      {
        id: "dockerfile",
        glob: "docker",
      },
      {
        id: "dockerfile",
        glob: "containerfile",
      },
      {
        id: "dockerfile",
        glob: "container",
      },
      {
        id: "dockerfile",
        glob: "*.dockerfile",
      },
      {
        id: "dockerfile",
        glob: "*.docker",
      },
      {
        id: "dockerfile",
        glob: "*.container",
      },
      {
        id: "dot",
        glob: "*.dot",
      },
      {
        id: "dot",
        glob: "*.gv",
      },
      {
        id: "editorconfig",
        glob: ".editorconfig",
      },
      {
        id: "eex",
        glob: "*.eex",
      },
      {
        id: "ejs",
        glob: "*.ejs",
      },
      {
        id: "elixir",
        glob: "*.ex",
      },
      {
        id: "elixir",
        glob: "*.exs",
      },
      {
        id: "elm",
        glob: "*.elm",
      },
      {
        id: "erb",
        glob: "*.erb",
      },
      {
        id: "erlang",
        glob: "*.erl",
      },
      {
        id: "erlang",
        glob: "*.app",
      },
      {
        id: "erlang",
        glob: "*.app.src",
      },
      {
        id: "erlang",
        glob: "*.es",
      },
      {
        id: "erlang",
        glob: "*.escript",
      },
      {
        id: "erlang",
        glob: "*.hrl",
      },
      {
        id: "erlang",
        glob: "*.xrl",
      },
      {
        id: "erlang",
        glob: "*.yrl",
      },
      {
        id: "erlang",
        glob: "emakefile",
      },
      {
        id: "erlang",
        glob: "rebar.config",
      },
      {
        id: "fish",
        glob: "*.fish",
      },
      {
        id: "fortran",
        glob: "*.f",
      },
      {
        id: "fortran",
        glob: "*.f03",
      },
      {
        id: "fortran",
        glob: "*.f08",
      },
      {
        id: "fortran",
        glob: "*.f90",
      },
      {
        id: "fortran",
        glob: "*.f95",
      },
      {
        id: "fortran",
        glob: "*.for",
      },
      {
        id: "fortran",
        glob: "*.ftn",
      },
      {
        id: "fsharp",
        glob: "*.fs",
      },
      {
        id: "fsharp",
        glob: "*.fsx",
      },
      {
        id: "fsharp",
        glob: "*.fsi",
      },
      {
        id: "gitattributes",
        glob: ".gitattributes",
      },
      {
        id: "gitattributes",
        glob: "gitattributes",
      },
      {
        id: "gitignore",
        glob: ".gitignore",
      },
      {
        id: "gitignore",
        glob: ".ignore",
      },
      {
        id: "gitignore",
        glob: ".fdignore",
      },
      {
        id: "gitignore",
        glob: ".rgignore",
      },
      {
        id: "gleam",
        glob: "*.gleam",
      },
      {
        id: "glimmer",
        glob: "*.hbs",
      },
      {
        id: "glimmer",
        glob: "*.handlebars",
      },
      {
        id: "glimmer",
        glob: "*.html.handlebars",
      },
      {
        id: "glimmer",
        glob: "*.glimmer",
      },
      {
        id: "glsl",
        glob: "*.comp",
      },
      {
        id: "glsl",
        glob: "*.frag",
      },
      {
        id: "glsl",
        glob: "*.geom",
      },
      {
        id: "glsl",
        glob: "*.glsl",
      },
      {
        id: "glsl",
        glob: "*.tesc",
      },
      {
        id: "glsl",
        glob: "*.tese",
      },
      {
        id: "glsl",
        glob: "*.vert",
      },
      {
        id: "go",
        glob: "*.go",
      },
      {
        id: "graphql",
        glob: "*.graphql",
      },
      {
        id: "graphql",
        glob: "*.gql",
      },
      {
        id: "graphql",
        glob: "*.graphqls",
      },
      {
        id: "groovy",
        glob: "*.gradle",
      },
      {
        id: "groovy",
        glob: "*.groovy",
      },
      {
        id: "groovy",
        glob: "jenkinsfile",
      },
      {
        id: "haskell",
        glob: "*.hs",
      },
      {
        id: "haskell",
        glob: "*.hs-boot",
      },
      {
        id: "hcl",
        glob: "*.hcl",
      },
      {
        id: "hcl",
        glob: "*.nomad",
      },
      {
        id: "hcl",
        glob: "*.workflow",
      },
      {
        id: "heex",
        glob: "*.heex",
      },
      {
        id: "heex",
        glob: "*.neex",
      },
      {
        id: "html",
        glob: "*.html",
      },
      {
        id: "html",
        glob: "*.htm",
      },
      {
        id: "html",
        glob: "*.xhtml",
      },
      {
        id: "htmldjango",
        glob: "*.djhtml",
      },
      {
        id: "htmldjango",
        glob: "*.html.django",
      },
      {
        id: "http",
        glob: "*.http",
      },
      {
        id: "http",
        glob: "*.rest",
      },
      {
        id: "hurl",
        glob: "*.hurl",
      },
      {
        id: "iex",
        glob: "*.iex",
      },
      {
        id: "ini",
        glob: "*.ini",
      },
      {
        id: "ini",
        glob: "*.cfg",
      },
      {
        id: "ini",
        glob: "*.cnf",
      },
      {
        id: "ini",
        glob: ".gitmodules",
      },
      {
        id: "ini",
        glob: ".npmrc",
      },
      {
        id: "java",
        glob: "*.java",
      },
      {
        id: "javascript",
        glob: "*.cjs",
      },
      {
        id: "javascript",
        glob: "*.js",
      },
      {
        id: "javascript",
        glob: "*.mjs",
      },
      {
        id: "javascript",
        glob: "*.snap",
      },
      {
        id: "javascript",
        glob: "*.jsx",
      },
      {
        id: "jinja",
        glob: "*.j2",
      },
      {
        id: "jinja",
        glob: "*.jinja",
      },
      {
        id: "jinja",
        glob: "*.jinja2",
      },
      {
        id: "jq",
        glob: "*.jq",
      },
      {
        id: "json",
        glob: "*.json",
      },
      {
        id: "json",
        glob: "*.jsonc",
      },
      {
        id: "json",
        glob: "*.avsc",
      },
      {
        id: "json",
        glob: "*.geojson",
      },
      {
        id: "json",
        glob: "*.gltf",
      },
      {
        id: "json",
        glob: "*.har",
      },
      {
        id: "json",
        glob: "*.ice",
      },
      {
        id: "json",
        glob: "*.json-tmlanguage",
      },
      {
        id: "json",
        glob: "*.jsonl",
      },
      {
        id: "json",
        glob: "*.mcmeta",
      },
      {
        id: "json",
        glob: "*.tfstate",
      },
      {
        id: "json",
        glob: "*.tfstate.backup",
      },
      {
        id: "json",
        glob: "*.topojson",
      },
      {
        id: "json",
        glob: "*.webapp",
      },
      {
        id: "json",
        glob: "*.webmanifest",
      },
      {
        id: "json",
        glob: ".arcconfig",
      },
      {
        id: "json",
        glob: ".auto-changelog",
      },
      {
        id: "json",
        glob: ".c8rc",
      },
      {
        id: "json",
        glob: ".htmlhintrc",
      },
      {
        id: "json",
        glob: ".imgbotconfig",
      },
      {
        id: "json",
        glob: ".nycrc",
      },
      {
        id: "json",
        glob: ".tern-config",
      },
      {
        id: "json",
        glob: ".tern-project",
      },
      {
        id: "json",
        glob: ".watchmanconfig",
      },
      {
        id: "json",
        glob: "pipfile.lock",
      },
      {
        id: "json",
        glob: "composer.lock",
      },
      {
        id: "json",
        glob: "mcmod.info",
      },
      {
        id: "json",
        glob: "flake.lock",
      },
      {
        id: "json5",
        glob: "*.json5",
      },
      {
        id: "julia",
        glob: "*.jl",
      },
      {
        id: "just",
        glob: "*.just",
      },
      {
        id: "just",
        glob: ".just",
      },
      {
        id: "just",
        glob: ".justfile",
      },
      {
        id: "just",
        glob: ".justfile",
      },
      {
        id: "just",
        glob: ".justfile",
      },
      {
        id: "just",
        glob: "justfile",
      },
      {
        id: "just",
        glob: "justfile",
      },
      {
        id: "just",
        glob: "justfile",
      },
      {
        id: "kdl",
        glob: "*.kdl",
      },
      {
        id: "kotlin",
        glob: "*.kt",
      },
      {
        id: "kotlin",
        glob: "*.ktm",
      },
      {
        id: "kotlin",
        glob: "*.kts",
      },
      {
        id: "latex",
        glob: "*.aux",
      },
      {
        id: "latex",
        glob: "*.cls",
      },
      {
        id: "latex",
        glob: "*.sty",
      },
      {
        id: "latex",
        glob: "*.tex",
      },
      {
        id: "liquid",
        glob: "*liquid",
      },
      {
        id: "llvm",
        glob: "*.llvm",
      },
      {
        id: "llvm",
        glob: "*.ll",
      },
      {
        id: "lua",
        glob: "*.lua",
      },
      {
        id: "make",
        glob: "*.mak",
      },
      {
        id: "make",
        glob: "*.d",
      },
      {
        id: "make",
        glob: "*.make",
      },
      {
        id: "make",
        glob: "*.makefile",
      },
      {
        id: "make",
        glob: "*.mk",
      },
      {
        id: "make",
        glob: "*.mkfile",
      },
      {
        id: "make",
        glob: "*.dsp",
      },
      {
        id: "make",
        glob: "bsdmakefile",
      },
      {
        id: "make",
        glob: "gnumakefile",
      },
      {
        id: "make",
        glob: "kbuild",
      },
      {
        id: "make",
        glob: "makefile",
      },
      {
        id: "make",
        glob: "makefile",
      },
      {
        id: "make",
        glob: "makefile.am",
      },
      {
        id: "make",
        glob: "makefile.boot",
      },
      {
        id: "make",
        glob: "makefile.frag",
      },
      {
        id: "make",
        glob: "makefile*.in",
      },
      {
        id: "make",
        glob: "makefile.inc",
      },
      {
        id: "make",
        glob: "makefile.wat",
      },
      {
        id: "make",
        glob: "makefile",
      },
      {
        id: "make",
        glob: "makefile.sco",
      },
      {
        id: "make",
        glob: "mkfile",
      },
      {
        id: "markdown",
        glob: "*.md",
      },
      {
        id: "markdown",
        glob: "*.markdown",
      },
      {
        id: "markdown",
        glob: "*.mdown",
      },
      {
        id: "markdown",
        glob: "*.mkd",
      },
      {
        id: "markdown",
        glob: ".md",
      },
      {
        id: "markdown",
        glob: "readme",
      },
      {
        id: "markdown",
        glob: "license",
      },
      {
        id: "matlab",
        glob: "*.m",
      },
      {
        id: "mdx",
        glob: "*.mdx",
      },
      {
        id: "mermaid",
        glob: "*.mmd",
      },
      {
        id: "mermaid",
        glob: "*.mermaid",
      },
      {
        id: "nginx",
        glob: "*.nginx",
      },
      {
        id: "nginx",
        glob: "nginx.conf",
      },
      {
        id: "nim",
        glob: "*.nim",
      },
      {
        id: "nim",
        glob: "*.nims",
      },
      {
        id: "nim",
        glob: "*.nimble",
      },
      {
        id: "nix",
        glob: "*.nix",
      },
      {
        id: "nushell",
        glob: "*.nu",
      },
      {
        id: "objc",
        glob: "*.m",
      },
      {
        id: "objc",
        glob: "*.objc",
      },
      {
        id: "ocaml",
        glob: "*.ml",
      },
      {
        id: "ocaml_interface",
        glob: "*.mli",
      },
      {
        id: "pascal",
        glob: "*.pas",
      },
      {
        id: "pascal",
        glob: "*.pp",
      },
      {
        id: "pascal",
        glob: "*.lpr",
      },
      {
        id: "pascal",
        glob: "*.dpr",
      },
      {
        id: "perl",
        glob: "*.pm",
      },
      {
        id: "perl",
        glob: "*.pl",
      },
      {
        id: "perl",
        glob: "*.t",
      },
      {
        id: "php",
        glob: "*.php",
      },
      {
        id: "php",
        glob: "*.phtml",
      },
      {
        id: "php",
        glob: "*.php3",
      },
      {
        id: "php",
        glob: "*.php4",
      },
      {
        id: "php",
        glob: "*.php5",
      },
      {
        id: "php",
        glob: "*.php7",
      },
      {
        id: "php",
        glob: "*.phps",
      },
      {
        id: "powershell",
        glob: "*.ps1",
      },
      {
        id: "powershell",
        glob: "*.psm1",
      },
      {
        id: "prisma",
        glob: "*.prisma",
      },
      {
        id: "protobuf",
        glob: "*.proto",
      },
      {
        id: "protobuf",
        glob: "*.protobuf",
      },
      {
        id: "protobuf",
        glob: "*.proto2",
      },
      {
        id: "protobuf",
        glob: "*.proto3",
      },
      {
        id: "puppet",
        glob: "*.pp",
      },
      {
        id: "puppet",
        glob: "puppetfile",
      },
      {
        id: "python",
        glob: "*.py",
      },
      {
        id: "python",
        glob: "*.py3",
      },
      {
        id: "python",
        glob: "*.pyi",
      },
      {
        id: "python",
        glob: "*.bzl",
      },
      {
        id: "python",
        glob: "targets",
      },
      {
        id: "python",
        glob: "buck",
      },
      {
        id: "python",
        glob: "deps",
      },
      {
        id: "qmljs",
        glob: "*.qml",
      },
      {
        id: "qmljs",
        glob: "*.qmljs",
      },
      {
        id: "qmljs",
        glob: "*.qmltypes",
      },
      {
        id: "r",
        glob: "*.r",
      },
      {
        id: "r",
        glob: "*.r",
      },
      {
        id: "r",
        glob: "*.rd",
      },
      {
        id: "r",
        glob: "*.rsx",
      },
      {
        id: "r",
        glob: ".rprofile",
      },
      {
        id: "r",
        glob: "expr-dist",
      },
      {
        id: "racket",
        glob: "*.rkt",
      },
      {
        id: "racket",
        glob: "*.rktd",
      },
      {
        id: "racket",
        glob: "*.rktl",
      },
      {
        id: "regex",
        glob: "*.regex",
      },
      {
        id: "rst",
        glob: "*.rst",
      },
      {
        id: "ruby",
        glob: "*.rb",
      },
      {
        id: "ruby",
        glob: "*.builder",
      },
      {
        id: "ruby",
        glob: "*.spec",
      },
      {
        id: "ruby",
        glob: "*.rake",
      },
      {
        id: "ruby",
        glob: "gemfile",
      },
      {
        id: "ruby",
        glob: "rakefile",
      },
      {
        id: "rust",
        glob: "*.rs",
      },
      {
        id: "scala",
        glob: "*.scala",
      },
      {
        id: "scala",
        glob: "*.sbt",
      },
      {
        id: "scala",
        glob: "*.sc",
      },
      {
        id: "scheme",
        glob: "*.scm",
      },
      {
        id: "scheme",
        glob: "*.sld",
      },
      {
        id: "scheme",
        glob: "*.ss",
      },
      {
        id: "scss",
        glob: "*.scss",
      },
      {
        id: "slim",
        glob: "*.slim",
      },
      {
        id: "solidity",
        glob: "*.sol",
      },
      {
        id: "sql",
        glob: "*.sql",
      },
      {
        id: "sql",
        glob: "*.pgsql",
      },
      {
        id: "surface",
        glob: "*.surface",
      },
      {
        id: "surface",
        glob: "*.sface",
      },
      {
        id: "svelte",
        glob: "*.svelte",
      },
      {
        id: "swift",
        glob: "*.swift",
      },
      {
        id: "systemverilog",
        glob: "*.sv",
      },
      {
        id: "systemverilog",
        glob: "*.svh",
      },
      {
        id: "tcl",
        glob: "*.itcl",
      },
      {
        id: "tcl",
        glob: "*.tcl",
      },
      {
        id: "tcl",
        glob: "*.tk",
      },
      {
        id: "terraform",
        glob: "*.tf",
      },
      {
        id: "terraform",
        glob: "*.tfvars",
      },
      {
        id: "terraform",
        glob: "*.tfvars.json",
      },
      {
        id: "tlaplus",
        glob: "*.tla",
      },
      {
        id: "toml",
        glob: "*.toml",
      },
      {
        id: "toml",
        glob: "cargo.lock",
      },
      {
        id: "toml",
        glob: "gopkg.lock",
      },
      {
        id: "toml",
        glob: "pipfile",
      },
      {
        id: "toml",
        glob: "pdm.lock",
      },
      {
        id: "toml",
        glob: "poetry.lock",
      },
      {
        id: "toml",
        glob: "uv.lock",
      },
      {
        id: "toon",
        glob: "*.toon",
      },
      {
        id: "tsx",
        glob: "*.tsx",
      },
      {
        id: "typescript",
        glob: "*.ts",
      },
      {
        id: "typescript",
        glob: "*.mts",
      },
      {
        id: "typescript",
        glob: "*.cts",
      },
      {
        id: "typst",
        glob: "*.typ",
      },
      {
        id: "typst",
        glob: "*.typst",
      },
      {
        id: "vhdl",
        glob: "*.vhd",
      },
      {
        id: "vhdl",
        glob: "*.vhdl",
      },
      {
        id: "vim",
        glob: "*.vim",
      },
      {
        id: "vim",
        glob: "*.viml",
      },
      {
        id: "vue",
        glob: "*.vue",
      },
      {
        id: "wat",
        glob: "*.wat",
      },
      {
        id: "wgsl",
        glob: "*.wgsl",
      },
      {
        id: "xml",
        glob: "*.ant",
      },
      {
        id: "xml",
        glob: "*.csproj",
      },
      {
        id: "xml",
        glob: "*.mjml",
      },
      {
        id: "xml",
        glob: "*.plist",
      },
      {
        id: "xml",
        glob: "*.resx",
      },
      {
        id: "xml",
        glob: "*.svg",
      },
      {
        id: "xml",
        glob: "*.ui",
      },
      {
        id: "xml",
        glob: "*.vbproj",
      },
      {
        id: "xml",
        glob: "*.xaml",
      },
      {
        id: "xml",
        glob: "*.xml",
      },
      {
        id: "xml",
        glob: "*.xsd",
      },
      {
        id: "xml",
        glob: "*.xsl",
      },
      {
        id: "xml",
        glob: "*.xslt",
      },
      {
        id: "xml",
        glob: "*.zcml",
      },
      {
        id: "xml",
        glob: "*.rng",
      },
      {
        id: "xml",
        glob: "app.config",
      },
      {
        id: "xml",
        glob: "nuget.config",
      },
      {
        id: "xml",
        glob: "packages.config",
      },
      {
        id: "xml",
        glob: ".classpath",
      },
      {
        id: "xml",
        glob: ".cproject",
      },
      {
        id: "xml",
        glob: ".project",
      },
      {
        id: "yaml",
        glob: "*.yaml",
      },
      {
        id: "yaml",
        glob: "*.yml",
      },
      {
        id: "zig",
        glob: "*.zig",
      },
      {
        id: "zsh",
        glob: "*.zsh",
      },
      {
        id: "zsh",
        glob: ".zshrc",
      },
      {
        id: "zsh",
        glob: ".zshenv",
      },
      {
        id: "zsh",
        glob: ".zprofile",
      },
      {
        id: "zsh",
        glob: ".zlogin",
      },
      {
        id: "zsh",
        glob: ".zlogout",
      },
      {
        id: "zsh",
        glob: "zshrc",
      },
      {
        id: "zsh",
        glob: "zshenv",
      },
      {
        id: "zsh",
        glob: "zprofile",
      },
      {
        id: "zsh",
        glob: "zlogin",
      },
      {
        id: "zsh",
        glob: "zlogout",
      },
    ];
    PLAINTEXT_LANG_ID = "plaintext";
    DEFAULT_MATCH_LIMIT = 8192;
    MAX_MATCH_LIMIT = 65536;
    DEFAULT_TIME_LIMIT = 5e3;
    GLOB_REGEXES = GLOB_MATCHERS.map(({ id, glob }) => ({
      id,
      regex: globToRegExp(glob),
    }));
    LANGUAGES = [
      {
        id: "angular",
        name: "Angular",
        parser: "angular",
        packageName: "@lumis-sh/wasm-angular",
        aliases: [],
        extensions: ["*.angular"],
        globs: ["*.angular", "component.html"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "arduino",
        name: "Arduino",
        parser: "arduino",
        packageName: "@lumis-sh/wasm-arduino",
        aliases: [],
        extensions: ["*.ino", "*.pde"],
        globs: ["*.ino", "*.pde"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "asm",
        name: "Assembly",
        parser: "asm",
        packageName: "@lumis-sh/wasm-asm",
        aliases: ["assembly"],
        extensions: ["*.s", "*.asm", "*.assembly"],
        globs: ["*.s", "*.asm", "*.assembly"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "astro",
        name: "Astro",
        parser: "astro",
        packageName: "@lumis-sh/wasm-astro",
        aliases: [],
        extensions: ["*.astro"],
        globs: ["*.astro"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "bash",
        name: "Bash",
        parser: "bash",
        packageName: "@lumis-sh/wasm-bash",
        aliases: ["console", "sh", "sh-session", "shell", "shell-session", "terminal"],
        extensions: [
          "*.bash",
          "*.bats",
          "*.cgi",
          "*.command",
          "*.env",
          "*.fcgi",
          "*.ksh",
          "*.sh",
          "*.sh.in",
          "*.tool",
        ],
        globs: [
          "*.bash",
          "*.bats",
          "*.cgi",
          "*.command",
          "*.env",
          "*.fcgi",
          "*.ksh",
          "*.sh",
          "*.sh.in",
          "*.tool",
          ".bash_aliases",
          ".bash_history",
          ".bash_logout",
          ".bash_profile",
          ".bashrc",
          ".cshrc",
          ".env",
          ".env.example",
          ".flaskenv",
          ".kshrc",
          ".login",
          ".profile",
          "9fs",
          "PKGBUILD",
          "bash_aliases",
          "bash_logout",
          "bash_profile",
          "bashrc",
          "cshrc",
          "ebuild",
          "eclass",
          "gradlew",
          "kshrc",
          "login",
          "man",
          "profile",
        ],
        emacsModes: ["sh"],
        shebangs: ["ash", "bash", "dash", "ksh", "mksh", "pdksh", "rc", "sh"],
      },
      {
        id: "bicep",
        name: "Bicep",
        parser: "bicep",
        packageName: "@lumis-sh/wasm-bicep",
        aliases: [],
        extensions: ["*.bicep", "*.bicepparam"],
        globs: ["*.bicep", "*.bicepparam"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "c",
        name: "C",
        parser: "c",
        packageName: "@lumis-sh/wasm-c",
        aliases: [],
        extensions: ["*.c"],
        globs: ["*.c"],
        emacsModes: ["c"],
        shebangs: ["tcc"],
      },
      {
        id: "caddy",
        name: "Caddy",
        parser: "caddy",
        packageName: "@lumis-sh/wasm-caddy",
        aliases: [],
        extensions: [],
        globs: ["Caddyfile", "caddyfile"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "clojure",
        name: "Clojure",
        parser: "clojure",
        packageName: "@lumis-sh/wasm-clojure",
        aliases: [],
        extensions: [
          "*.bb",
          "*.boot",
          "*.clj",
          "*.cljc",
          "*.clje",
          "*.cljs",
          "*.cljx",
          "*.edn",
          "*.joke",
          "*.joker",
        ],
        globs: [
          "*.bb",
          "*.boot",
          "*.clj",
          "*.cljc",
          "*.clje",
          "*.cljs",
          "*.cljx",
          "*.edn",
          "*.joke",
          "*.joker",
        ],
        emacsModes: ["clojure"],
        shebangs: [],
      },
      {
        id: "cmake",
        name: "CMake",
        parser: "cmake",
        packageName: "@lumis-sh/wasm-cmake",
        aliases: [],
        extensions: ["*.cmake", "*.cmake.in"],
        globs: ["*.cmake", "*.cmake.in", "CMakeLists.txt"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "comment",
        name: "Comment",
        parser: "comment",
        packageName: "@lumis-sh/wasm-comment",
        aliases: [],
        extensions: [],
        globs: [],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "commonlisp",
        name: "Common Lisp",
        parser: "commonlisp",
        packageName: "@lumis-sh/wasm-commonlisp",
        aliases: ["cl"],
        extensions: ["*.lisp", "*.lsp", "*.asd"],
        globs: ["*.lisp", "*.lsp", "*.asd"],
        emacsModes: ["lisp"],
        shebangs: ["lisp", "sbcl", "ccl", "clisp", "ecl"],
      },
      {
        id: "cpp",
        name: "C++",
        parser: "cpp",
        packageName: "@lumis-sh/wasm-cpp",
        aliases: ["c++"],
        extensions: ["*.cc", "*.cpp", "*.h", "*.hh", "*.hpp", "*.cxx", "*.cu", "*.hxx"],
        globs: ["*.cc", "*.cpp", "*.h", "*.hh", "*.hpp", "*.cxx", "*.cu", "*.hxx"],
        emacsModes: ["c++"],
        shebangs: [],
      },
      {
        id: "csharp",
        name: "C#",
        parser: "csharp",
        packageName: "@lumis-sh/wasm-csharp",
        aliases: ["c#"],
        extensions: ["*.cs"],
        globs: ["*.cs"],
        emacsModes: ["csharp"],
        shebangs: [],
      },
      {
        id: "css",
        name: "CSS",
        parser: "css",
        packageName: "@lumis-sh/wasm-css",
        aliases: [],
        extensions: ["*.css"],
        globs: ["*.css"],
        emacsModes: ["css"],
        shebangs: [],
      },
      {
        id: "csv",
        name: "CSV",
        parser: "csv",
        packageName: "@lumis-sh/wasm-csv",
        aliases: [],
        extensions: ["*.csv"],
        globs: ["*.csv"],
        emacsModes: ["csv"],
        shebangs: [],
      },
      {
        id: "d",
        name: "D",
        parser: "d",
        packageName: "@lumis-sh/wasm-d",
        aliases: [],
        extensions: ["*.d"],
        globs: ["*.d"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "dart",
        name: "Dart",
        parser: "dart",
        packageName: "@lumis-sh/wasm-dart",
        aliases: ["flutter"],
        extensions: ["*.dart"],
        globs: ["*.dart"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "diff",
        name: "Diff",
        parser: "diff",
        packageName: "@lumis-sh/wasm-diff",
        aliases: [],
        extensions: ["*.diff"],
        globs: ["*.diff"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "dockerfile",
        name: "Dockerfile",
        parser: "dockerfile",
        packageName: "@lumis-sh/wasm-dockerfile",
        aliases: ["docker"],
        extensions: ["*.dockerfile", "*.docker", "*.container"],
        globs: [
          "Dockerfile",
          "dockerfile",
          "docker",
          "Containerfile",
          "container",
          "*.dockerfile",
          "*.docker",
          "*.container",
        ],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "dot",
        name: "Dot",
        parser: "dot",
        packageName: "@lumis-sh/wasm-dot",
        aliases: [],
        extensions: ["*.dot", "*.gv"],
        globs: ["*.dot", "*.gv"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "editorconfig",
        name: "Editorconfig",
        parser: "editorconfig",
        packageName: "@lumis-sh/wasm-editorconfig",
        aliases: [],
        extensions: [],
        globs: [".editorconfig"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "eex",
        name: "Eex",
        parser: "eex",
        packageName: "@lumis-sh/wasm-eex",
        aliases: ["leex"],
        extensions: ["*.eex"],
        globs: ["*.eex"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "ejs",
        name: "EJS",
        parser: "embedded-template",
        packageName: "@lumis-sh/wasm-embedded-template",
        aliases: [],
        extensions: ["*.ejs"],
        globs: ["*.ejs"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "elixir",
        name: "Elixir",
        parser: "elixir",
        packageName: "@lumis-sh/wasm-elixir",
        aliases: [],
        extensions: ["*.ex", "*.exs"],
        globs: ["*.ex", "*.exs"],
        emacsModes: ["elixir"],
        shebangs: ["elixir"],
      },
      {
        id: "elm",
        name: "Elm",
        parser: "elm",
        packageName: "@lumis-sh/wasm-elm",
        aliases: [],
        extensions: ["*.elm"],
        globs: ["*.elm"],
        emacsModes: ["elm"],
        shebangs: [],
      },
      {
        id: "erb",
        name: "ERB",
        parser: "embedded-template",
        packageName: "@lumis-sh/wasm-embedded-template",
        aliases: [],
        extensions: ["*.erb"],
        globs: ["*.erb"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "erlang",
        name: "Erlang",
        parser: "erlang",
        packageName: "@lumis-sh/wasm-erlang",
        aliases: ["erl-sh", "erlang-repl"],
        extensions: ["*.erl", "*.app", "*.app.src", "*.es", "*.escript", "*.hrl", "*.xrl", "*.yrl"],
        globs: [
          "*.erl",
          "*.app",
          "*.app.src",
          "*.es",
          "*.escript",
          "*.hrl",
          "*.xrl",
          "*.yrl",
          "Emakefile",
          "rebar.config",
        ],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "fish",
        name: "Fish",
        parser: "fish",
        packageName: "@lumis-sh/wasm-fish",
        aliases: [],
        extensions: ["*.fish"],
        globs: ["*.fish"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "fortran",
        name: "Fortran",
        parser: "fortran",
        packageName: "@lumis-sh/wasm-fortran",
        aliases: [],
        extensions: ["*.f", "*.f03", "*.f08", "*.f90", "*.f95", "*.for", "*.ftn"],
        globs: ["*.f", "*.f03", "*.f08", "*.f90", "*.f95", "*.for", "*.ftn"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "fsharp",
        name: "F#",
        parser: "fsharp",
        packageName: "@lumis-sh/wasm-fsharp",
        aliases: ["f#"],
        extensions: ["*.fs", "*.fsx", "*.fsi"],
        globs: ["*.fs", "*.fsx", "*.fsi"],
        emacsModes: ["fsharp"],
        shebangs: [],
      },
      {
        id: "gitattributes",
        name: "Git Attributes",
        parser: "gitattributes",
        packageName: "@lumis-sh/wasm-gitattributes",
        aliases: [],
        extensions: [],
        globs: [".gitattributes", "gitattributes"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "gitignore",
        name: "Git Ignore",
        parser: "gitignore",
        packageName: "@lumis-sh/wasm-gitignore",
        aliases: [],
        extensions: [],
        globs: [".gitignore", ".ignore", ".fdignore", ".rgignore"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "gleam",
        name: "Gleam",
        parser: "gleam",
        packageName: "@lumis-sh/wasm-gleam",
        aliases: [],
        extensions: ["*.gleam"],
        globs: ["*.gleam"],
        emacsModes: ["gleam"],
        shebangs: [],
      },
      {
        id: "glimmer",
        name: "Glimmer",
        parser: "glimmer",
        packageName: "@lumis-sh/wasm-glimmer",
        aliases: ["ember", "handlebars"],
        extensions: ["*.hbs", "*.handlebars", "*.html.handlebars", "*.glimmer"],
        globs: ["*.hbs", "*.handlebars", "*.html.handlebars", "*.glimmer"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "glsl",
        name: "GLSL",
        parser: "glsl",
        packageName: "@lumis-sh/wasm-glsl",
        aliases: [],
        extensions: ["*.comp", "*.frag", "*.geom", "*.glsl", "*.tesc", "*.tese", "*.vert"],
        globs: ["*.comp", "*.frag", "*.geom", "*.glsl", "*.tesc", "*.tese", "*.vert"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "go",
        name: "Go",
        parser: "go",
        packageName: "@lumis-sh/wasm-go",
        aliases: ["golang"],
        extensions: ["*.go"],
        globs: ["*.go"],
        emacsModes: ["go"],
        shebangs: [],
      },
      {
        id: "graphql",
        name: "GraphQL",
        parser: "graphql",
        packageName: "@lumis-sh/wasm-graphql",
        aliases: ["gql"],
        extensions: ["*.graphql", "*.gql", "*.graphqls"],
        globs: ["*.graphql", "*.gql", "*.graphqls"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "groovy",
        name: "Groovy",
        parser: "groovy",
        packageName: "@lumis-sh/wasm-groovy",
        aliases: [],
        extensions: ["*.gradle", "*.groovy"],
        globs: ["*.gradle", "*.groovy", "Jenkinsfile"],
        emacsModes: ["groovy"],
        shebangs: ["groovy"],
      },
      {
        id: "haskell",
        name: "Haskell",
        parser: "haskell",
        packageName: "@lumis-sh/wasm-haskell",
        aliases: [],
        extensions: ["*.hs", "*.hs-boot"],
        globs: ["*.hs", "*.hs-boot"],
        emacsModes: ["haskell"],
        shebangs: ["runghc", "runhaskell", "runhugs"],
      },
      {
        id: "hcl",
        name: "HCL",
        parser: "hcl",
        packageName: "@lumis-sh/wasm-hcl",
        aliases: [],
        extensions: ["*.hcl", "*.nomad", "*.workflow"],
        globs: ["*.hcl", "*.nomad", "*.workflow"],
        emacsModes: ["hcl"],
        shebangs: [],
      },
      {
        id: "heex",
        name: "HEEx",
        parser: "heex",
        packageName: "@lumis-sh/wasm-heex",
        aliases: [],
        extensions: ["*.heex", "*.neex"],
        globs: ["*.heex", "*.neex"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "html",
        name: "HTML",
        parser: "html",
        packageName: "@lumis-sh/wasm-html",
        aliases: [],
        extensions: ["*.html", "*.htm", "*.xhtml"],
        globs: ["*.html", "*.htm", "*.xhtml"],
        emacsModes: ["html"],
        shebangs: [],
      },
      {
        id: "htmldjango",
        name: "Django HTML",
        parser: "htmldjango",
        packageName: "@lumis-sh/wasm-htmldjango",
        aliases: ["django"],
        extensions: ["*.djhtml", "*.html.django"],
        globs: ["*.djhtml", "*.html.django"],
        emacsModes: ["django"],
        shebangs: [],
      },
      {
        id: "http",
        name: "HTTP",
        parser: "http",
        packageName: "@lumis-sh/wasm-http",
        aliases: [],
        extensions: ["*.http", "*.rest"],
        globs: ["*.http", "*.rest"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "hurl",
        name: "Hurl",
        parser: "hurl",
        packageName: "@lumis-sh/wasm-hurl",
        aliases: [],
        extensions: ["*.hurl"],
        globs: ["*.hurl"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "iex",
        name: "IEx",
        parser: "iex",
        packageName: "@lumis-sh/wasm-iex",
        aliases: [],
        extensions: ["*.iex"],
        globs: ["*.iex"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "ini",
        name: "INI",
        parser: "ini",
        packageName: "@lumis-sh/wasm-ini",
        aliases: [],
        extensions: ["*.ini", "*.cfg", "*.cnf"],
        globs: ["*.ini", "*.cfg", "*.cnf", ".gitmodules", ".npmrc"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "java",
        name: "Java",
        parser: "java",
        packageName: "@lumis-sh/wasm-java",
        aliases: [],
        extensions: ["*.java"],
        globs: ["*.java"],
        emacsModes: ["java"],
        shebangs: [],
      },
      {
        id: "javadoc",
        name: "Javadoc",
        parser: "javadoc",
        packageName: "@lumis-sh/wasm-javadoc",
        aliases: [],
        extensions: [],
        globs: [],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "javascript",
        name: "JavaScript",
        parser: "javascript",
        packageName: "@lumis-sh/wasm-javascript",
        aliases: ["js", "jsx"],
        extensions: ["*.cjs", "*.js", "*.mjs", "*.snap", "*.jsx"],
        globs: ["*.cjs", "*.js", "*.mjs", "*.snap", "*.jsx"],
        emacsModes: ["js", "js2"],
        shebangs: ["node", "bun"],
      },
      {
        id: "jinja",
        name: "Jinja",
        parser: "jinja",
        packageName: "@lumis-sh/wasm-jinja",
        aliases: ["jinja2"],
        extensions: ["*.j2", "*.jinja", "*.jinja2"],
        globs: ["*.j2", "*.jinja", "*.jinja2"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "jinja_inline",
        name: "Jinja Inline",
        parser: "jinja_inline",
        packageName: "@lumis-sh/wasm-jinja_inline",
        aliases: [],
        extensions: [],
        globs: [],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "jq",
        name: "jq",
        parser: "jq",
        packageName: "@lumis-sh/wasm-jq",
        aliases: [],
        extensions: ["*.jq"],
        globs: ["*.jq"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "json",
        name: "JSON",
        parser: "json",
        packageName: "@lumis-sh/wasm-json",
        aliases: ["jsonc", "jsonld"],
        extensions: [
          "*.json",
          "*.jsonc",
          "*.avsc",
          "*.geojson",
          "*.gltf",
          "*.har",
          "*.ice",
          "*.JSON-tmLanguage",
          "*.jsonl",
          "*.mcmeta",
          "*.tfstate",
          "*.tfstate.backup",
          "*.topojson",
          "*.webapp",
          "*.webmanifest",
        ],
        globs: [
          "*.json",
          "*.jsonc",
          "*.avsc",
          "*.geojson",
          "*.gltf",
          "*.har",
          "*.ice",
          "*.JSON-tmLanguage",
          "*.jsonl",
          "*.mcmeta",
          "*.tfstate",
          "*.tfstate.backup",
          "*.topojson",
          "*.webapp",
          "*.webmanifest",
          ".arcconfig",
          ".auto-changelog",
          ".c8rc",
          ".htmlhintrc",
          ".imgbotconfig",
          ".nycrc",
          ".tern-config",
          ".tern-project",
          ".watchmanconfig",
          "Pipfile.lock",
          "composer.lock",
          "mcmod.info",
          "flake.lock",
        ],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "json5",
        name: "JSON5",
        parser: "json5",
        packageName: "@lumis-sh/wasm-json5",
        aliases: [],
        extensions: ["*.json5"],
        globs: ["*.json5"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "julia",
        name: "Julia",
        parser: "julia",
        packageName: "@lumis-sh/wasm-julia",
        aliases: [],
        extensions: ["*.jl"],
        globs: ["*.jl"],
        emacsModes: ["julia"],
        shebangs: [],
      },
      {
        id: "just",
        name: "Just",
        parser: "just",
        packageName: "@lumis-sh/wasm-just",
        aliases: [],
        extensions: ["*.just"],
        globs: [
          "*.just",
          ".just",
          ".justfile",
          ".JUSTFILE",
          ".Justfile",
          "justfile",
          "JUSTFILE",
          "Justfile",
        ],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "kdl",
        name: "KDL",
        parser: "kdl",
        packageName: "@lumis-sh/wasm-kdl",
        aliases: [],
        extensions: ["*.kdl"],
        globs: ["*.kdl"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "kotlin",
        name: "Kotlin",
        parser: "kotlin",
        packageName: "@lumis-sh/wasm-kotlin",
        aliases: [],
        extensions: ["*.kt", "*.ktm", "*.kts"],
        globs: ["*.kt", "*.ktm", "*.kts"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "latex",
        name: "LaTeX",
        parser: "latex",
        packageName: "@lumis-sh/wasm-latex",
        aliases: ["tex"],
        extensions: ["*.aux", "*.cls", "*.sty", "*.tex"],
        globs: ["*.aux", "*.cls", "*.sty", "*.tex"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "liquid",
        name: "Liquid",
        parser: "liquid",
        packageName: "@lumis-sh/wasm-liquid",
        aliases: [],
        extensions: [],
        globs: ["*liquid"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "llvm",
        name: "LLVM",
        parser: "llvm",
        packageName: "@lumis-sh/wasm-llvm",
        aliases: [],
        extensions: ["*.llvm", "*.ll"],
        globs: ["*.llvm", "*.ll"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "lua",
        name: "Lua",
        parser: "lua",
        packageName: "@lumis-sh/wasm-lua",
        aliases: [],
        extensions: ["*.lua"],
        globs: ["*.lua"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "luadoc",
        name: "LuaDoc",
        parser: "luadoc",
        packageName: "@lumis-sh/wasm-luadoc",
        aliases: [],
        extensions: [],
        globs: [],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "make",
        name: "Make",
        parser: "make",
        packageName: "@lumis-sh/wasm-make",
        aliases: [],
        extensions: ["*.mak", "*.d", "*.make", "*.makefile", "*.mk", "*.mkfile", "*.dsp"],
        globs: [
          "*.mak",
          "*.d",
          "*.make",
          "*.makefile",
          "*.mk",
          "*.mkfile",
          "*.dsp",
          "BSDmakefile",
          "GNUmakefile",
          "Kbuild",
          "Makefile",
          "MAKEFILE",
          "Makefile.am",
          "Makefile.boot",
          "Makefile.frag",
          "Makefile*.in",
          "Makefile.inc",
          "Makefile.wat",
          "makefile",
          "makefile.sco",
          "mkfile",
        ],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "markdown",
        name: "Markdown",
        parser: "markdown",
        packageName: "@lumis-sh/wasm-markdown",
        aliases: [],
        extensions: ["*.md", "*.markdown", "*.mdown", "*.mkd"],
        globs: ["*.md", "*.markdown", "*.mdown", "*.mkd", ".MD", "README", "LICENSE"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "markdown_inline",
        name: "Markdown Inline",
        parser: "markdown_inline",
        packageName: "@lumis-sh/wasm-markdown_inline",
        aliases: [],
        extensions: [],
        globs: [],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "matlab",
        name: "MATLAB",
        parser: "matlab",
        packageName: "@lumis-sh/wasm-matlab",
        aliases: [],
        extensions: ["*.m"],
        globs: ["*.m"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "mdx",
        name: "MDX",
        parser: "markdown",
        packageName: "@lumis-sh/wasm-markdown",
        aliases: [],
        extensions: ["*.mdx"],
        globs: ["*.mdx"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "mermaid",
        name: "Mermaid",
        parser: "mermaid",
        packageName: "@lumis-sh/wasm-mermaid",
        aliases: [],
        extensions: ["*.mmd", "*.mermaid"],
        globs: ["*.mmd", "*.mermaid"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "nginx",
        name: "Nginx",
        parser: "nginx",
        packageName: "@lumis-sh/wasm-nginx",
        aliases: [],
        extensions: ["*.nginx"],
        globs: ["*.nginx", "nginx.conf"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "nim",
        name: "Nim",
        parser: "nim",
        packageName: "@lumis-sh/wasm-nim",
        aliases: [],
        extensions: ["*.nim", "*.nims", "*.nimble"],
        globs: ["*.nim", "*.nims", "*.nimble"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "nix",
        name: "Nix",
        parser: "nix",
        packageName: "@lumis-sh/wasm-nix",
        aliases: [],
        extensions: ["*.nix"],
        globs: ["*.nix"],
        emacsModes: ["nix"],
        shebangs: [],
      },
      {
        id: "nushell",
        name: "Nushell",
        parser: "nushell",
        packageName: "@lumis-sh/wasm-nushell",
        aliases: ["nu"],
        extensions: ["*.nu"],
        globs: ["*.nu"],
        emacsModes: [],
        shebangs: ["nu"],
      },
      {
        id: "objc",
        name: "Objective-C",
        parser: "objc",
        packageName: "@lumis-sh/wasm-objc",
        aliases: ["objective-c"],
        extensions: ["*.m", "*.objc"],
        globs: ["*.m", "*.objc"],
        emacsModes: ["objc"],
        shebangs: [],
      },
      {
        id: "ocaml",
        name: "OCaml",
        parser: "ocaml",
        packageName: "@lumis-sh/wasm-ocaml",
        aliases: [],
        extensions: ["*.ml"],
        globs: ["*.ml"],
        emacsModes: ["tuareg"],
        shebangs: ["ocaml", "ocamlrun", "ocamlscript"],
      },
      {
        id: "ocaml_interface",
        name: "OCaml Interface",
        parser: "ocaml_interface",
        packageName: "@lumis-sh/wasm-ocaml_interface",
        aliases: [],
        extensions: ["*.mli"],
        globs: ["*.mli"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "pascal",
        name: "Pascal",
        parser: "pascal",
        packageName: "@lumis-sh/wasm-pascal",
        aliases: [],
        extensions: ["*.pas", "*.pp", "*.lpr", "*.dpr"],
        globs: ["*.pas", "*.pp", "*.lpr", "*.dpr"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "perl",
        name: "Perl",
        parser: "perl",
        packageName: "@lumis-sh/wasm-perl",
        aliases: [],
        extensions: ["*.pm", "*.pl", "*.t"],
        globs: ["*.pm", "*.pl", "*.t"],
        emacsModes: ["perl"],
        shebangs: ["perl"],
      },
      {
        id: "php",
        name: "PHP",
        parser: "php",
        packageName: "@lumis-sh/wasm-php",
        aliases: [],
        extensions: ["*.php", "*.phtml", "*.php3", "*.php4", "*.php5", "*.php7", "*.phps"],
        globs: ["*.php", "*.phtml", "*.php3", "*.php4", "*.php5", "*.php7", "*.phps"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "plaintext",
        name: "Plain Text",
        aliases: ["text", "txt", "plain"],
        extensions: [],
        globs: [],
        emacsModes: ["fundamental", "text"],
        shebangs: [],
      },
      {
        id: "powershell",
        name: "PowerShell",
        parser: "powershell",
        packageName: "@lumis-sh/wasm-powershell",
        aliases: ["pwsh"],
        extensions: ["*.ps1", "*.psm1"],
        globs: ["*.ps1", "*.psm1"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "prisma",
        name: "Prisma",
        parser: "prisma",
        packageName: "@lumis-sh/wasm-prisma",
        aliases: [],
        extensions: ["*.prisma"],
        globs: ["*.prisma"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "protobuf",
        name: "Protocol Buffer",
        parser: "protobuf",
        packageName: "@lumis-sh/wasm-protobuf",
        aliases: [],
        extensions: ["*.proto", "*.protobuf", "*.proto2", "*.proto3"],
        globs: ["*.proto", "*.protobuf", "*.proto2", "*.proto3"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "puppet",
        name: "Puppet",
        parser: "puppet",
        packageName: "@lumis-sh/wasm-puppet",
        aliases: [],
        extensions: ["*.pp"],
        globs: ["*.pp", "Puppetfile"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "python",
        name: "Python",
        parser: "python",
        packageName: "@lumis-sh/wasm-python",
        aliases: ["python3"],
        extensions: ["*.py", "*.py3", "*.pyi", "*.bzl"],
        globs: ["*.py", "*.py3", "*.pyi", "*.bzl", "TARGETS", "BUCK", "DEPS"],
        emacsModes: ["python"],
        shebangs: ["python", "python2", "python3"],
      },
      {
        id: "qmljs",
        name: "QML/JS",
        parser: "qmljs",
        packageName: "@lumis-sh/wasm-qmljs",
        aliases: ["qml"],
        extensions: ["*.qml", "*.qmljs", "*.qmltypes"],
        globs: ["*.qml", "*.qmljs", "*.qmltypes"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "r",
        name: "R",
        parser: "r",
        packageName: "@lumis-sh/wasm-r",
        aliases: [],
        extensions: ["*.R", "*.r", "*.rd", "*.rsx"],
        globs: ["*.R", "*.r", "*.rd", "*.rsx", ".Rprofile", "expr-dist"],
        emacsModes: [],
        shebangs: ["Rscript"],
      },
      {
        id: "racket",
        name: "Racket",
        parser: "racket",
        packageName: "@lumis-sh/wasm-racket",
        aliases: [],
        extensions: ["*.rkt", "*.rktd", "*.rktl"],
        globs: ["*.rkt", "*.rktd", "*.rktl"],
        emacsModes: [],
        shebangs: ["racket"],
      },
      {
        id: "regex",
        name: "Regex",
        parser: "regex",
        packageName: "@lumis-sh/wasm-regex",
        aliases: [],
        extensions: ["*.regex"],
        globs: ["*.regex"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "rst",
        name: "reStructuredText",
        parser: "rst",
        packageName: "@lumis-sh/wasm-rst",
        aliases: ["restructuredtext"],
        extensions: ["*.rst"],
        globs: ["*.rst"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "ruby",
        name: "Ruby",
        parser: "ruby",
        packageName: "@lumis-sh/wasm-ruby",
        aliases: [],
        extensions: ["*.rb", "*.builder", "*.spec", "*.rake"],
        globs: ["*.rb", "*.builder", "*.spec", "*.rake", "Gemfile", "Rakefile"],
        emacsModes: ["ruby"],
        shebangs: ["ruby", "macruby", "rake", "jruby", "rbx"],
      },
      {
        id: "rust",
        name: "Rust",
        parser: "rust",
        packageName: "@lumis-sh/wasm-rust",
        aliases: [],
        extensions: ["*.rs"],
        globs: ["*.rs"],
        emacsModes: ["rust"],
        shebangs: [],
      },
      {
        id: "scala",
        name: "Scala",
        parser: "scala",
        packageName: "@lumis-sh/wasm-scala",
        aliases: [],
        extensions: ["*.scala", "*.sbt", "*.sc"],
        globs: ["*.scala", "*.sbt", "*.sc"],
        emacsModes: ["scala"],
        shebangs: [],
      },
      {
        id: "scheme",
        name: "Scheme",
        parser: "scheme",
        packageName: "@lumis-sh/wasm-scheme",
        aliases: [],
        extensions: ["*.scm", "*.sld", "*.ss"],
        globs: ["*.scm", "*.sld", "*.ss"],
        emacsModes: [],
        shebangs: ["guile", "scheme"],
      },
      {
        id: "scss",
        name: "SCSS",
        parser: "scss",
        packageName: "@lumis-sh/wasm-scss",
        aliases: [],
        extensions: ["*.scss"],
        globs: ["*.scss"],
        emacsModes: ["scss"],
        shebangs: [],
      },
      {
        id: "slim",
        name: "Slim",
        parser: "slim",
        packageName: "@lumis-sh/wasm-slim",
        aliases: [],
        extensions: ["*.slim"],
        globs: ["*.slim"],
        emacsModes: ["slim"],
        shebangs: [],
      },
      {
        id: "solidity",
        name: "Solidity",
        parser: "solidity",
        packageName: "@lumis-sh/wasm-solidity",
        aliases: [],
        extensions: ["*.sol"],
        globs: ["*.sol"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "sql",
        name: "SQL",
        parser: "sql",
        packageName: "@lumis-sh/wasm-sql",
        aliases: ["psql"],
        extensions: ["*.sql", "*.pgsql"],
        globs: ["*.sql", "*.pgsql"],
        emacsModes: ["sql"],
        shebangs: [],
      },
      {
        id: "surface",
        name: "Surface",
        parser: "surface",
        packageName: "@lumis-sh/wasm-surface",
        aliases: [],
        extensions: ["*.surface", "*.sface"],
        globs: ["*.surface", "*.sface"],
        emacsModes: ["surface"],
        shebangs: [],
      },
      {
        id: "svelte",
        name: "Svelte",
        parser: "svelte",
        packageName: "@lumis-sh/wasm-svelte",
        aliases: [],
        extensions: ["*.svelte"],
        globs: ["*.svelte"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "swift",
        name: "Swift",
        parser: "swift",
        packageName: "@lumis-sh/wasm-swift",
        aliases: [],
        extensions: ["*.swift"],
        globs: ["*.swift"],
        emacsModes: ["swift"],
        shebangs: ["swift"],
      },
      {
        id: "systemverilog",
        name: "SystemVerilog",
        parser: "systemverilog",
        packageName: "@lumis-sh/wasm-systemverilog",
        aliases: ["verilog"],
        extensions: ["*.sv", "*.svh"],
        globs: ["*.sv", "*.svh"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "tcl",
        name: "Tcl",
        parser: "tcl",
        packageName: "@lumis-sh/wasm-tcl",
        aliases: [],
        extensions: ["*.itcl", "*.tcl", "*.tk"],
        globs: ["*.itcl", "*.tcl", "*.tk"],
        emacsModes: [],
        shebangs: ["tclsh", "wish"],
      },
      {
        id: "terraform",
        name: "Terraform",
        parser: "terraform",
        packageName: "@lumis-sh/wasm-terraform",
        aliases: [],
        extensions: ["*.tf", "*.tfvars", "*.tfvars.json"],
        globs: ["*.tf", "*.tfvars", "*.tfvars.json"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "tlaplus",
        name: "TLA+",
        parser: "tlaplus",
        packageName: "@lumis-sh/wasm-tlaplus",
        aliases: ["tla", "tla+", "pluscal"],
        extensions: ["*.tla"],
        globs: ["*.tla"],
        emacsModes: ["tla", "tla+"],
        shebangs: [],
      },
      {
        id: "toml",
        name: "TOML",
        parser: "toml",
        packageName: "@lumis-sh/wasm-toml",
        aliases: [],
        extensions: ["*.toml"],
        globs: [
          "*.toml",
          "Cargo.lock",
          "Gopkg.lock",
          "Pipfile",
          "pdm.lock",
          "poetry.lock",
          "uv.lock",
        ],
        emacsModes: ["toml"],
        shebangs: [],
      },
      {
        id: "toon",
        name: "TOON",
        parser: "toon",
        packageName: "@lumis-sh/wasm-toon",
        aliases: [],
        extensions: ["*.toon"],
        globs: ["*.toon"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "tsx",
        name: "TSX",
        parser: "tsx",
        packageName: "@lumis-sh/wasm-tsx",
        aliases: [],
        extensions: ["*.tsx"],
        globs: ["*.tsx"],
        emacsModes: ["tsx"],
        shebangs: [],
      },
      {
        id: "typescript",
        name: "TypeScript",
        parser: "typescript",
        packageName: "@lumis-sh/wasm-typescript",
        aliases: ["ts"],
        extensions: ["*.ts", "*.mts", "*.cts"],
        globs: ["*.ts", "*.mts", "*.cts"],
        emacsModes: ["typescript"],
        shebangs: ["deno", "ts-node"],
      },
      {
        id: "typst",
        name: "Typst",
        parser: "typst",
        packageName: "@lumis-sh/wasm-typst",
        aliases: [],
        extensions: ["*.typ", "*.typst"],
        globs: ["*.typ", "*.typst"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "vhdl",
        name: "VHDL",
        parser: "vhdl",
        packageName: "@lumis-sh/wasm-vhdl",
        aliases: [],
        extensions: ["*.vhd", "*.vhdl"],
        globs: ["*.vhd", "*.vhdl"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "vim",
        name: "Vim",
        parser: "vim",
        packageName: "@lumis-sh/wasm-vim",
        aliases: ["viml", "vimscript"],
        extensions: ["*.vim", "*.viml"],
        globs: ["*.vim", "*.viml"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "vue",
        name: "Vue",
        parser: "vue",
        packageName: "@lumis-sh/wasm-vue",
        aliases: [],
        extensions: ["*.vue"],
        globs: ["*.vue"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "wat",
        name: "WAT",
        parser: "wat",
        packageName: "@lumis-sh/wasm-wat",
        aliases: ["wasm", "webassembly"],
        extensions: ["*.wat"],
        globs: ["*.wat"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "wgsl",
        name: "WGSL",
        parser: "wgsl",
        packageName: "@lumis-sh/wasm-wgsl",
        aliases: [],
        extensions: ["*.wgsl"],
        globs: ["*.wgsl"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "xml",
        name: "XML",
        parser: "xml",
        packageName: "@lumis-sh/wasm-xml",
        aliases: [],
        extensions: [
          "*.ant",
          "*.csproj",
          "*.mjml",
          "*.plist",
          "*.resx",
          "*.svg",
          "*.ui",
          "*.vbproj",
          "*.xaml",
          "*.xml",
          "*.xsd",
          "*.xsl",
          "*.xslt",
          "*.zcml",
          "*.rng",
        ],
        globs: [
          "*.ant",
          "*.csproj",
          "*.mjml",
          "*.plist",
          "*.resx",
          "*.svg",
          "*.ui",
          "*.vbproj",
          "*.xaml",
          "*.xml",
          "*.xsd",
          "*.xsl",
          "*.xslt",
          "*.zcml",
          "*.rng",
          "App.config",
          "nuget.config",
          "packages.config",
          ".classpath",
          ".cproject",
          ".project",
        ],
        emacsModes: ["nxml"],
        shebangs: [],
      },
      {
        id: "yaml",
        name: "YAML",
        parser: "yaml",
        packageName: "@lumis-sh/wasm-yaml",
        aliases: [],
        extensions: ["*.yaml", "*.yml"],
        globs: ["*.yaml", "*.yml"],
        emacsModes: ["yaml"],
        shebangs: [],
      },
      {
        id: "zig",
        name: "Zig",
        parser: "zig",
        packageName: "@lumis-sh/wasm-zig",
        aliases: [],
        extensions: ["*.zig"],
        globs: ["*.zig"],
        emacsModes: ["zig"],
        shebangs: [],
      },
      {
        id: "zsh",
        name: "Zsh",
        parser: "zsh",
        packageName: "@lumis-sh/wasm-zsh",
        aliases: [],
        extensions: ["*.zsh"],
        globs: [
          "*.zsh",
          ".zshrc",
          ".zshenv",
          ".zprofile",
          ".zlogin",
          ".zlogout",
          "zshrc",
          "zshenv",
          "zprofile",
          "zlogin",
          "zlogout",
        ],
        emacsModes: [],
        shebangs: ["zsh"],
      },
    ];
  }))();
}

// node_modules/semver/internal/lrucache.js
var require_lrucache = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var LRUCache = class {
    constructor() {
      this.max = 1e3;
      this.map = /* @__PURE__ */ new Map();
    }
    get(key) {
      const value = this.map.get(key);
      if (value === void 0) return;
      else {
        this.map.delete(key);
        this.map.set(key, value);
        return value;
      }
    }
    delete(key) {
      return this.map.delete(key);
    }
    set(key, value) {
      if (!this.delete(key) && value !== void 0) {
        if (this.map.size >= this.max) {
          const firstKey = this.map.keys().next().value;
          this.delete(firstKey);
        }
        this.map.set(key, value);
      }
      return this;
    }
  };
  module.exports = LRUCache;
});

// node_modules/semver/internal/parse-options.js
var require_parse_options = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const looseOption = Object.freeze({ loose: true });
  const emptyOpts = Object.freeze({});
  const parseOptions = (options) => {
    if (!options) return emptyOpts;
    if (typeof options !== "object") return looseOption;
    return options;
  };
  module.exports = parseOptions;
});

// node_modules/semver/internal/constants.js
var require_constants = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const SEMVER_SPEC_VERSION = "2.0.0";
  const MAX_LENGTH = 256;
  const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */ 9007199254740991;
  const MAX_SAFE_COMPONENT_LENGTH = 16;
  const MAX_SAFE_BUILD_LENGTH = 250;
  const RELEASE_TYPES = [
    "major",
    "premajor",
    "minor",
    "preminor",
    "patch",
    "prepatch",
    "prerelease",
  ];
  module.exports = {
    MAX_LENGTH,
    MAX_SAFE_COMPONENT_LENGTH,
    MAX_SAFE_BUILD_LENGTH,
    MAX_SAFE_INTEGER,
    RELEASE_TYPES,
    SEMVER_SPEC_VERSION,
    FLAG_INCLUDE_PRERELEASE: 1,
    FLAG_LOOSE: 2,
  };
});

// node_modules/semver/internal/debug.js
var require_debug = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const debug =
    typeof process === "object" &&
    process.env &&
    process.env.NODE_DEBUG &&
    /\bsemver\b/i.test(process.env.NODE_DEBUG)
      ? (...args) => console.error("SEMVER", ...args)
      : () => {};
  module.exports = debug;
});

// node_modules/semver/internal/re.js
var require_re = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const { MAX_SAFE_COMPONENT_LENGTH, MAX_SAFE_BUILD_LENGTH, MAX_LENGTH } = require_constants();
  const debug = require_debug();
  exports = module.exports = {};
  const re = (exports.re = []);
  const safeRe = (exports.safeRe = []);
  const src = (exports.src = []);
  const safeSrc = (exports.safeSrc = []);
  const t = (exports.t = {});
  let R = 0;
  const LETTERDASHNUMBER = "[a-zA-Z0-9-]";
  const safeRegexReplacements = [
    ["\\s", 1],
    ["\\d", MAX_LENGTH],
    [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH],
  ];
  const makeSafeRegex = (value) => {
    for (const [token, max] of safeRegexReplacements)
      value = value
        .split(`${token}*`)
        .join(`${token}{0,${max}}`)
        .split(`${token}+`)
        .join(`${token}{1,${max}}`);
    return value;
  };
  const createToken = (name, value, isGlobal) => {
    const safe = makeSafeRegex(value);
    const index = R++;
    debug(name, index, value);
    t[name] = index;
    src[index] = value;
    safeSrc[index] = safe;
    re[index] = new RegExp(value, isGlobal ? "g" : void 0);
    safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
  };
  createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
  createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
  createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
  createToken(
    "MAINVERSION",
    `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`,
  );
  createToken(
    "MAINVERSIONLOOSE",
    `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`,
  );
  createToken(
    "PRERELEASEIDENTIFIER",
    `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`,
  );
  createToken(
    "PRERELEASEIDENTIFIERLOOSE",
    `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`,
  );
  createToken(
    "PRERELEASE",
    `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`,
  );
  createToken(
    "PRERELEASELOOSE",
    `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`,
  );
  createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
  createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
  createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
  createToken("FULL", `^${src[t.FULLPLAIN]}$`);
  createToken(
    "LOOSEPLAIN",
    `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`,
  );
  createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
  createToken("GTLT", "((?:<|>)?=?)");
  createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
  createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
  createToken(
    "XRANGEPLAIN",
    `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`,
  );
  createToken(
    "XRANGEPLAINLOOSE",
    `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`,
  );
  createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
  createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
  createToken(
    "COERCEPLAIN",
    `(^|[^\\d])(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`,
  );
  createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
  createToken(
    "COERCEFULL",
    src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`,
  );
  createToken("COERCERTL", src[t.COERCE], true);
  createToken("COERCERTLFULL", src[t.COERCEFULL], true);
  createToken("LONETILDE", "(?:~>?)");
  createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
  exports.tildeTrimReplace = "$1~";
  createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
  createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
  createToken("LONECARET", "(?:\\^)");
  createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
  exports.caretTrimReplace = "$1^";
  createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
  createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
  createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
  createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
  createToken(
    "COMPARATORTRIM",
    `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`,
    true,
  );
  exports.comparatorTrimReplace = "$1$2$3";
  createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
  createToken(
    "HYPHENRANGELOOSE",
    `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`,
  );
  createToken("STAR", "(<|>)?=?\\s*\\*");
  createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
  createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
});

// node_modules/semver/internal/identifiers.js
var require_identifiers = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const numeric = /^[0-9]+$/;
  const compareIdentifiers = (a, b) => {
    if (typeof a === "number" && typeof b === "number") return a === b ? 0 : a < b ? -1 : 1;
    const anum = numeric.test(a);
    const bnum = numeric.test(b);
    if (anum && bnum) {
      a = +a;
      b = +b;
    }
    return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
  };
  const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
  module.exports = {
    compareIdentifiers,
    rcompareIdentifiers,
  };
});

// node_modules/semver/classes/semver.js
var require_semver = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const debug = require_debug();
  const { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
  const { safeRe: re, t } = require_re();
  const parseOptions = require_parse_options();
  const { compareIdentifiers } = require_identifiers();
  const isPrereleaseIdentifier = (prerelease, identifier) => {
    const identifiers = identifier.split(".");
    if (identifiers.length > prerelease.length) return false;
    for (let i = 0; i < identifiers.length; i++)
      if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) return false;
    return true;
  };
  var SemVer = class SemVer {
    constructor(version, options) {
      options = parseOptions(options);
      if (version instanceof SemVer) {
        if (
          version.loose === !!options.loose &&
          version.includePrerelease === !!options.includePrerelease
        )
          return version;
        else version = version.version;
      } else if (typeof version !== "string")
        throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
      if (version.length > MAX_LENGTH)
        throw new TypeError(`version is longer than ${MAX_LENGTH} characters`);
      debug("SemVer", version, options);
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
      if (!m) throw new TypeError(`Invalid Version: ${version}`);
      this.raw = version;
      this.major = +m[1];
      this.minor = +m[2];
      this.patch = +m[3];
      if (this.major > MAX_SAFE_INTEGER || this.major < 0)
        throw new TypeError("Invalid major version");
      if (this.minor > MAX_SAFE_INTEGER || this.minor < 0)
        throw new TypeError("Invalid minor version");
      if (this.patch > MAX_SAFE_INTEGER || this.patch < 0)
        throw new TypeError("Invalid patch version");
      if (!m[4]) this.prerelease = [];
      else
        this.prerelease = m[4].split(".").map((id) => {
          if (/^[0-9]+$/.test(id)) {
            const num = +id;
            if (num >= 0 && num < MAX_SAFE_INTEGER) return num;
          }
          return id;
        });
      this.build = m[5] ? m[5].split(".") : [];
      this.format();
    }
    format() {
      this.version = `${this.major}.${this.minor}.${this.patch}`;
      if (this.prerelease.length) this.version += `-${this.prerelease.join(".")}`;
      return this.version;
    }
    toString() {
      return this.version;
    }
    compare(other) {
      debug("SemVer.compare", this.version, this.options, other);
      if (!(other instanceof SemVer)) {
        if (typeof other === "string" && other === this.version) return 0;
        other = new SemVer(other, this.options);
      }
      if (other.version === this.version) return 0;
      return this.compareMain(other) || this.comparePre(other);
    }
    compareMain(other) {
      if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
      if (this.major < other.major) return -1;
      if (this.major > other.major) return 1;
      if (this.minor < other.minor) return -1;
      if (this.minor > other.minor) return 1;
      if (this.patch < other.patch) return -1;
      if (this.patch > other.patch) return 1;
      return 0;
    }
    comparePre(other) {
      if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
      if (this.prerelease.length && !other.prerelease.length) return -1;
      else if (!this.prerelease.length && other.prerelease.length) return 1;
      else if (!this.prerelease.length && !other.prerelease.length) return 0;
      let i = 0;
      do {
        const a = this.prerelease[i];
        const b = other.prerelease[i];
        debug("prerelease compare", i, a, b);
        if (a === void 0 && b === void 0) return 0;
        else if (b === void 0) return 1;
        else if (a === void 0) return -1;
        else if (a === b) continue;
        else return compareIdentifiers(a, b);
      } while (++i);
    }
    compareBuild(other) {
      if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
      let i = 0;
      do {
        const a = this.build[i];
        const b = other.build[i];
        debug("build compare", i, a, b);
        if (a === void 0 && b === void 0) return 0;
        else if (b === void 0) return 1;
        else if (a === void 0) return -1;
        else if (a === b) continue;
        else return compareIdentifiers(a, b);
      } while (++i);
    }
    inc(release, identifier, identifierBase) {
      if (release.startsWith("pre")) {
        if (!identifier && identifierBase === false)
          throw new Error("invalid increment argument: identifier is empty");
        if (identifier) {
          const match = `-${identifier}`.match(
            this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE],
          );
          if (!match || match[1] !== identifier)
            throw new Error(`invalid identifier: ${identifier}`);
        }
      }
      switch (release) {
        case "premajor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor = 0;
          this.major++;
          this.inc("pre", identifier, identifierBase);
          break;
        case "preminor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor++;
          this.inc("pre", identifier, identifierBase);
          break;
        case "prepatch":
          this.prerelease.length = 0;
          this.inc("patch", identifier, identifierBase);
          this.inc("pre", identifier, identifierBase);
          break;
        case "prerelease":
          if (this.prerelease.length === 0) this.inc("patch", identifier, identifierBase);
          this.inc("pre", identifier, identifierBase);
          break;
        case "release":
          if (this.prerelease.length === 0)
            throw new Error(`version ${this.raw} is not a prerelease`);
          this.prerelease.length = 0;
          break;
        case "major":
          if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) this.major++;
          this.minor = 0;
          this.patch = 0;
          this.prerelease = [];
          break;
        case "minor":
          if (this.patch !== 0 || this.prerelease.length === 0) this.minor++;
          this.patch = 0;
          this.prerelease = [];
          break;
        case "patch":
          if (this.prerelease.length === 0) this.patch++;
          this.prerelease = [];
          break;
        case "pre": {
          const base = Number(identifierBase) ? 1 : 0;
          if (this.prerelease.length === 0) this.prerelease = [base];
          else {
            let i = this.prerelease.length;
            while (--i >= 0)
              if (typeof this.prerelease[i] === "number") {
                this.prerelease[i]++;
                i = -2;
              }
            if (i === -1) {
              if (identifier === this.prerelease.join(".") && identifierBase === false)
                throw new Error("invalid increment argument: identifier already exists");
              this.prerelease.push(base);
            }
          }
          if (identifier) {
            let prerelease = [identifier, base];
            if (identifierBase === false) prerelease = [identifier];
            if (isPrereleaseIdentifier(this.prerelease, identifier)) {
              const prereleaseBase = this.prerelease[identifier.split(".").length];
              if (isNaN(prereleaseBase)) this.prerelease = prerelease;
            } else this.prerelease = prerelease;
          }
          break;
        }
        default:
          throw new Error(`invalid increment argument: ${release}`);
      }
      this.raw = this.format();
      if (this.build.length) this.raw += `+${this.build.join(".")}`;
      return this;
    }
  };
  module.exports = SemVer;
});

// node_modules/semver/functions/compare.js
var require_compare = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const SemVer = require_semver();
  const compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
  module.exports = compare;
});

// node_modules/semver/functions/eq.js
var require_eq = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const compare = require_compare();
  const eq = (a, b, loose) => compare(a, b, loose) === 0;
  module.exports = eq;
});

// node_modules/semver/functions/neq.js
var require_neq = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const compare = require_compare();
  const neq = (a, b, loose) => compare(a, b, loose) !== 0;
  module.exports = neq;
});

// node_modules/semver/functions/gt.js
var require_gt = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const compare = require_compare();
  const gt = (a, b, loose) => compare(a, b, loose) > 0;
  module.exports = gt;
});

// node_modules/semver/functions/gte.js
var require_gte = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const compare = require_compare();
  const gte = (a, b, loose) => compare(a, b, loose) >= 0;
  module.exports = gte;
});

// node_modules/semver/functions/lt.js
var require_lt = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const compare = require_compare();
  const lt = (a, b, loose) => compare(a, b, loose) < 0;
  module.exports = lt;
});

// node_modules/semver/functions/lte.js
var require_lte = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const compare = require_compare();
  const lte = (a, b, loose) => compare(a, b, loose) <= 0;
  module.exports = lte;
});

// node_modules/semver/functions/cmp.js
var require_cmp = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const eq = require_eq();
  const neq = require_neq();
  const gt = require_gt();
  const gte = require_gte();
  const lt = require_lt();
  const lte = require_lte();
  const cmp = (a, op, b, loose) => {
    switch (op) {
      case "===":
        if (typeof a === "object") a = a.version;
        if (typeof b === "object") b = b.version;
        return a === b;
      case "!==":
        if (typeof a === "object") a = a.version;
        if (typeof b === "object") b = b.version;
        return a !== b;
      case "":
      case "=":
      case "==":
        return eq(a, b, loose);
      case "!=":
        return neq(a, b, loose);
      case ">":
        return gt(a, b, loose);
      case ">=":
        return gte(a, b, loose);
      case "<":
        return lt(a, b, loose);
      case "<=":
        return lte(a, b, loose);
      default:
        throw new TypeError(`Invalid operator: ${op}`);
    }
  };
  module.exports = cmp;
});

// node_modules/semver/classes/comparator.js
var require_comparator = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const ANY = Symbol("SemVer ANY");
  var Comparator = class Comparator {
    static get ANY() {
      return ANY;
    }
    constructor(comp, options) {
      options = parseOptions(options);
      if (comp instanceof Comparator) {
        if (comp.loose === !!options.loose) return comp;
        else comp = comp.value;
      }
      comp = comp.trim().split(/\s+/).join(" ");
      debug("comparator", comp, options);
      this.options = options;
      this.loose = !!options.loose;
      this.parse(comp);
      if (this.semver === ANY) this.value = "";
      else this.value = this.operator + this.semver.version;
      debug("comp", this);
    }
    parse(comp) {
      const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
      const m = comp.match(r);
      if (!m) throw new TypeError(`Invalid comparator: ${comp}`);
      this.operator = m[1] !== void 0 ? m[1] : "";
      if (this.operator === "=") this.operator = "";
      if (!m[2]) this.semver = ANY;
      else this.semver = new SemVer(m[2], this.options.loose);
    }
    toString() {
      return this.value;
    }
    test(version) {
      debug("Comparator.test", version, this.options.loose);
      if (this.semver === ANY || version === ANY) return true;
      if (typeof version === "string")
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      return cmp(version, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
      if (!(comp instanceof Comparator)) throw new TypeError("a Comparator is required");
      if (this.operator === "") {
        if (this.value === "") return true;
        return new Range(comp.value, options).test(this.value);
      } else if (comp.operator === "") {
        if (comp.value === "") return true;
        return new Range(this.value, options).test(comp.semver);
      }
      options = parseOptions(options);
      if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0"))
        return false;
      if (
        !options.includePrerelease &&
        (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))
      )
        return false;
      if (this.operator.startsWith(">") && comp.operator.startsWith(">")) return true;
      if (this.operator.startsWith("<") && comp.operator.startsWith("<")) return true;
      if (
        this.semver.version === comp.semver.version &&
        this.operator.includes("=") &&
        comp.operator.includes("=")
      )
        return true;
      if (
        cmp(this.semver, "<", comp.semver, options) &&
        this.operator.startsWith(">") &&
        comp.operator.startsWith("<")
      )
        return true;
      if (
        cmp(this.semver, ">", comp.semver, options) &&
        this.operator.startsWith("<") &&
        comp.operator.startsWith(">")
      )
        return true;
      return false;
    }
  };
  module.exports = Comparator;
  const parseOptions = require_parse_options();
  const { safeRe: re, t } = require_re();
  const cmp = require_cmp();
  const debug = require_debug();
  const SemVer = require_semver();
  const Range = require_range();
});

// node_modules/semver/classes/range.js
var require_range = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const SPACE_CHARACTERS = /\s+/g;
  var Range = class Range {
    constructor(range, options) {
      options = parseOptions(options);
      if (range instanceof Range) {
        if (
          range.loose === !!options.loose &&
          range.includePrerelease === !!options.includePrerelease
        )
          return range;
        else return new Range(range.raw, options);
      }
      if (range instanceof Comparator) {
        this.raw = range.value;
        this.set = [[range]];
        this.formatted = void 0;
        return this;
      }
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
      this.set = this.raw
        .split("||")
        .map((r) => this.parseRange(r.trim()))
        .filter((c) => c.length);
      if (!this.set.length) throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      if (this.set.length > 1) {
        const first = this.set[0];
        this.set = this.set.filter((c) => !isNullSet(c[0]));
        if (this.set.length === 0) this.set = [first];
        else if (this.set.length > 1) {
          for (const c of this.set)
            if (c.length === 1 && isAny(c[0])) {
              this.set = [c];
              break;
            }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let i = 0; i < this.set.length; i++) {
          if (i > 0) this.formatted += "||";
          const comps = this.set[i];
          for (let k = 0; k < comps.length; k++) {
            if (k > 0) this.formatted += " ";
            this.formatted += comps[k].toString().trim();
          }
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(range) {
      range = range.replace(BUILDSTRIPRE, "");
      const memoKey =
        ((this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) |
          (this.options.loose && FLAG_LOOSE)) +
        ":" +
        range;
      const cached = cache.get(memoKey);
      if (cached) return cached;
      const loose = this.options.loose;
      const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
      range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
      debug("hyphen replace", range);
      range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
      debug("comparator trim", range);
      range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
      debug("tilde trim", range);
      range = range.replace(re[t.CARETTRIM], caretTrimReplace);
      debug("caret trim", range);
      let rangeList = range
        .split(" ")
        .map((comp) => parseComparator(comp, this.options))
        .join(" ")
        .split(/\s+/)
        .map((comp) => replaceGTE0(comp, this.options));
      if (loose)
        rangeList = rangeList.filter((comp) => {
          debug("loose invalid filter", comp, this.options);
          return !!comp.match(re[t.COMPARATORLOOSE]);
        });
      debug("range list", rangeList);
      const rangeMap = /* @__PURE__ */ new Map();
      const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
      for (const comp of comparators) {
        if (isNullSet(comp)) return [comp];
        rangeMap.set(comp.value, comp);
      }
      if (rangeMap.size > 1 && rangeMap.has("")) rangeMap.delete("");
      const result = [...rangeMap.values()];
      cache.set(memoKey, result);
      return result;
    }
    intersects(range, options) {
      if (!(range instanceof Range)) throw new TypeError("a Range is required");
      return this.set.some((thisComparators) => {
        return (
          isSatisfiable(thisComparators, options) &&
          range.set.some((rangeComparators) => {
            return (
              isSatisfiable(rangeComparators, options) &&
              thisComparators.every((thisComparator) => {
                return rangeComparators.every((rangeComparator) => {
                  return thisComparator.intersects(rangeComparator, options);
                });
              })
            );
          })
        );
      });
    }
    test(version) {
      if (!version) return false;
      if (typeof version === "string")
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      for (let i = 0; i < this.set.length; i++)
        if (testSet(this.set[i], version, this.options)) return true;
      return false;
    }
  };
  module.exports = Range;
  const cache = new (require_lrucache())();
  const parseOptions = require_parse_options();
  const Comparator = require_comparator();
  const debug = require_debug();
  const SemVer = require_semver();
  const {
    safeRe: re,
    src,
    t,
    comparatorTrimReplace,
    tildeTrimReplace,
    caretTrimReplace,
  } = require_re();
  const { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
  const BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
  const isNullSet = (c) => c.value === "<0.0.0-0";
  const isAny = (c) => c.value === "";
  const isSatisfiable = (comparators, options) => {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while (result && remainingComparators.length) {
      result = remainingComparators.every((otherComparator) => {
        return testComparator.intersects(otherComparator, options);
      });
      testComparator = remainingComparators.pop();
    }
    return result;
  };
  const parseComparator = (comp, options) => {
    comp = comp.replace(re[t.BUILD], "");
    debug("comp", comp, options);
    comp = replaceCarets(comp, options);
    debug("caret", comp);
    comp = replaceTildes(comp, options);
    debug("tildes", comp);
    comp = replaceXRanges(comp, options);
    debug("xrange", comp);
    comp = replaceStars(comp, options);
    debug("stars", comp);
    return comp;
  };
  const isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
  const invalidXRangeOrder = (M, m, p) => (isX(M) && !isX(m)) || (isX(m) && p && !isX(p));
  const replaceTildes = (comp, options) => {
    return comp
      .trim()
      .split(/\s+/)
      .map((c) => replaceTilde(c, options))
      .join(" ");
  };
  const replaceTilde = (comp, options) => {
    const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
    const z = options.includePrerelease ? "-0" : "";
    return comp.replace(r, (_, M, m, p, pr) => {
      debug("tilde", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) ret = "";
      else if (isX(m)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
      else if (isX(p)) ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
      else if (pr) {
        debug("replaceTilde pr", pr);
        ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
      } else ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
      debug("tilde return", ret);
      return ret;
    });
  };
  const replaceCarets = (comp, options) => {
    return comp
      .trim()
      .split(/\s+/)
      .map((c) => replaceCaret(c, options))
      .join(" ");
  };
  const replaceCaret = (comp, options) => {
    debug("caret", comp, options);
    const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
    const z = options.includePrerelease ? "-0" : "";
    return comp.replace(r, (_, M, m, p, pr) => {
      debug("caret", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) ret = "";
      else if (isX(m)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
      else if (isX(p)) {
        if (M === "0") ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
        else ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
      } else if (pr) {
        debug("replaceCaret pr", pr);
        if (M === "0") {
          if (m === "0") ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
          else ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
      } else {
        debug("no pr");
        if (M === "0") {
          if (m === "0") ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
          else ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        } else ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
      }
      debug("caret return", ret);
      return ret;
    });
  };
  const replaceXRanges = (comp, options) => {
    debug("replaceXRanges", comp, options);
    return comp
      .split(/\s+/)
      .map((c) => replaceXRange(c, options))
      .join(" ");
  };
  const replaceXRange = (comp, options) => {
    comp = comp.trim();
    const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
    return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
      debug("xRange", comp, ret, gtlt, M, m, p, pr);
      if (invalidXRangeOrder(M, m, p)) return comp;
      const xM = isX(M);
      const xm = xM || isX(m);
      const xp = xm || isX(p);
      const anyX = xp;
      if (gtlt === "=" && anyX) gtlt = "";
      pr = options.includePrerelease ? "-0" : "";
      if (xM) {
        if (gtlt === ">" || gtlt === "<") ret = "<0.0.0-0";
        else ret = "*";
      } else if (gtlt && anyX) {
        if (xm) m = 0;
        p = 0;
        if (gtlt === ">") {
          gtlt = ">=";
          if (xm) {
            M = +M + 1;
            m = 0;
            p = 0;
          } else {
            m = +m + 1;
            p = 0;
          }
        } else if (gtlt === "<=") {
          gtlt = "<";
          if (xm) M = +M + 1;
          else m = +m + 1;
        }
        if (gtlt === "<") pr = "-0";
        ret = `${gtlt + M}.${m}.${p}${pr}`;
      } else if (xm) ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
      else if (xp) ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
      debug("xRange return", ret);
      return ret;
    });
  };
  const replaceStars = (comp, options) => {
    debug("replaceStars", comp, options);
    return comp.trim().replace(re[t.STAR], "");
  };
  const replaceGTE0 = (comp, options) => {
    debug("replaceGTE0", comp, options);
    return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
  };
  const hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
    if (isX(fM)) from = "";
    else if (isX(fm)) from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
    else if (isX(fp)) from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
    else if (fpr) from = `>=${from}`;
    else from = `>=${from}${incPr ? "-0" : ""}`;
    if (isX(tM)) to = "";
    else if (isX(tm)) to = `<${+tM + 1}.0.0-0`;
    else if (isX(tp)) to = `<${tM}.${+tm + 1}.0-0`;
    else if (tpr) to = `<=${tM}.${tm}.${tp}-${tpr}`;
    else if (incPr) to = `<${tM}.${tm}.${+tp + 1}-0`;
    else to = `<=${to}`;
    return `${from} ${to}`.trim();
  };
  const testSet = (set, version, options) => {
    for (let i = 0; i < set.length; i++) if (!set[i].test(version)) return false;
    if (version.prerelease.length && !options.includePrerelease) {
      for (let i = 0; i < set.length; i++) {
        debug(set[i].semver);
        if (set[i].semver === Comparator.ANY) continue;
        if (set[i].semver.prerelease.length > 0) {
          const allowed = set[i].semver;
          if (
            allowed.major === version.major &&
            allowed.minor === version.minor &&
            allowed.patch === version.patch
          )
            return true;
        }
      }
      return false;
    }
    return true;
  };
});

// node_modules/semver/functions/satisfies.js
var require_satisfies = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const Range = require_range();
  const satisfies = (version, range, options) => {
    try {
      range = new Range(range, options);
    } catch (er) {
      return false;
    }
    return range.test(version);
  };
  module.exports = satisfies;
});

// node_modules/semver/ranges/min-version.js
var require_min_version = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const SemVer = require_semver();
  const Range = require_range();
  const gt = require_gt();
  const minVersion = (range, loose) => {
    range = new Range(range, loose);
    let minver = new SemVer("0.0.0");
    if (range.test(minver)) return minver;
    minver = new SemVer("0.0.0-0");
    if (range.test(minver)) return minver;
    minver = null;
    for (let i = 0; i < range.set.length; ++i) {
      const comparators = range.set[i];
      let setMin = null;
      comparators.forEach((comparator) => {
        const compver = new SemVer(comparator.semver.version);
        switch (comparator.operator) {
          case ">":
            if (compver.prerelease.length === 0) compver.patch++;
            else compver.prerelease.push(0);
            compver.raw = compver.format();
          case "":
          case ">=":
            if (!setMin || gt(compver, setMin)) setMin = compver;
            break;
          case "<":
          case "<=":
            break;
          /* istanbul ignore next */
          default:
            throw new Error(`Unexpected operation: ${comparator.operator}`);
        }
      });
      if (setMin && (!minver || gt(minver, setMin))) minver = setMin;
    }
    if (minver && range.test(minver)) return minver;
    return null;
  };
  module.exports = minVersion;
});

// node_modules/@noble/hashes/_u64.js
function setU64FromNum(view, byteOffset, n, isLE) {
  const h = fromNumH(n);
  const l = fromNumL(n);
  view.setUint32(byteOffset, isLE ? l : h, isLE);
  view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
}
var fromNumH, fromNumL;
function init__u64() {
  return (init__u64 = __esmMin(() => {
    fromNumH = (n) => (n / 2 ** 32) | 0;
    fromNumL = (n) => n >>> 0;
  }))();
}

// node_modules/@noble/hashes/utils.js
/**
 * Checks if something is Uint8Array. Be careful: nodejs Buffer will return true.
 * @param a - value to test
 * @returns `true` when the value is a Uint8Array-compatible view.
 * @example
 * Check whether a value is a Uint8Array-compatible view.
 * ```ts
 * isBytes(new Uint8Array([1, 2, 3]));
 * ```
 */
function isBytes(a) {
  return (
    a instanceof Uint8Array ||
    (ArrayBuffer.isView(a) &&
      a.constructor.name === "Uint8Array" &&
      "BYTES_PER_ELEMENT" in a &&
      a.BYTES_PER_ELEMENT === 1)
  );
}
/**
 * Asserts something is a non-negative integer.
 * @param n - number to validate
 * @param title - label included in thrown errors
 * @returns The validated number.
 * @throws On wrong argument types. {@link TypeError}
 * @throws On wrong argument ranges or values. {@link RangeError}
 * @example
 * Validate a non-negative integer option.
 * ```ts
 * anumber(32, 'length');
 * ```
 */
function anumber(n, title = "") {
  if (typeof n !== "number")
    throw new TypeError(atitle(title) + "expected number, got " + typeof n);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
  return n;
}
/**
 * Asserts something is Uint8Array.
 * @param value - value to validate
 * @param length - optional exact length constraint
 * @param title - label included in thrown errors
 * @returns The validated byte array.
 * @throws On wrong argument types. {@link TypeError}
 * @throws On wrong argument ranges or values. {@link RangeError}
 * @example
 * Validate that a value is a byte array.
 * ```ts
 * abytes(new Uint8Array([1, 2, 3]));
 * ```
 */
function abytes(value, length, title = "") {
  if (isBytes(value) && (length === void 0 || value.length === length)) return value;
  if (length !== void 0) anumber(length, "length");
  const bytes = isBytes(value);
  const ofLen = length !== void 0 ? ` of length ${length}` : "";
  const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
  const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
  if (!bytes) throw new TypeError(message);
  throw new RangeError(message);
}
/**
 * Asserts a hash instance has not been destroyed or finished.
 * @param instance - hash instance to validate
 * @param checkFinished - whether to reject finalized instances
 * @throws If the hash instance has already been destroyed or finalized. {@link Error}
 * @example
 * Validate that a hash instance is still usable.
 * ```ts
 * import { aexists } from '@noble/hashes/utils.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const hash = sha256.create();
 * aexists(hash);
 * ```
 */
function aexists(instance, checkFinished = true) {
  if (instance.destroyed) throw new Error("hash was destroyed");
  if (checkFinished && instance.finished) throw new Error("digest() was already called");
}
/**
 * Asserts output is a sufficiently-sized byte array.
 * @param out - destination buffer
 * @param instance - hash instance providing output length
 * Oversized buffers are allowed; downstream code only promises to fill the first `outputLen` bytes.
 * @throws On wrong argument types. {@link TypeError}
 * @throws On wrong argument ranges or values. {@link RangeError}
 * @example
 * Validate a caller-provided digest buffer.
 * ```ts
 * import { aoutput } from '@noble/hashes/utils.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const hash = sha256.create();
 * aoutput(new Uint8Array(hash.outputLen), hash);
 * ```
 */
function aoutput(out, instance) {
  abytes(out, void 0, "output");
  const min = instance.outputLen;
  if (!(out.length >= min)) throw new RangeError('"output" expected length >= ' + min);
}
/**
 * Zeroizes typed arrays in place. Warning: JS provides no guarantees.
 * @param arrays - arrays to overwrite with zeros
 * @example
 * Zeroize sensitive buffers in place.
 * ```ts
 * clean(new Uint8Array([1, 2, 3]));
 * ```
 */
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) arrays[i].fill(0);
}
/**
 * Creates a DataView for byte-level manipulation.
 * @param arr - source typed array
 * @returns DataView over the same buffer region.
 * @example
 * Create a DataView over an existing buffer.
 * ```ts
 * createView(new Uint8Array(4));
 * ```
 */
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
/**
 * Rotate-right operation for uint32 values.
 * @param word - source word
 * @param shift - shift amount in bits
 * @returns Rotated word.
 * @example
 * Rotate a 32-bit word to the right.
 * ```ts
 * rotr(0x12345678, 8);
 * ```
 */
function rotr(word, shift) {
  return (word << (32 - shift)) | (word >>> shift);
}
/**
 * Merges default options and passed options.
 * @param defaults - base option object
 * @param opts - user overrides
 * @param title - label included in thrown override errors
 * @returns Fresh merged option object with a null prototype.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * Merge user overrides onto default options.
 * ```ts
 * checkOpts({ dkLen: 32 }, { asyncTick: 10 });
 * ```
 */
function checkOpts(defaults, opts, title = "opts") {
  aopts(defaults, "defaults");
  if (opts !== void 0) aopts(opts, title);
  return Object.assign(Object.create(null), defaults, opts);
}
/**
 * Creates a callable hash function from a stateful class constructor.
 * @param hashCons - hash constructor or factory
 * @param info - optional metadata such as DER OID
 * @returns Frozen callable hash wrapper with `.create()`.
 *   Wrapper construction eagerly calls `hashCons(undefined)` once to read
 *   `outputLen` / `blockLen`, so constructor side effects happen at module
 *   init time.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * Wrap a stateful hash constructor into a callable helper.
 * ```ts
 * import { createHasher } from '@noble/hashes/utils.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const wrapped = createHasher(sha256.create, { oid: sha256.oid });
 * wrapped(new Uint8Array([1]));
 * ```
 */
function createHasher(hashCons, info = {}) {
  if (typeof hashCons !== "function")
    throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
  info = checkOpts({}, info, "info");
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.canXOF = tmp.canXOF;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}
var atitle, aobject, aopts, oidNist;
function init_utils() {
  return (init_utils = __esmMin(() => {
    atitle = (title) => (title ? `"${title}" ` : "");
    aobject = (value, label) => {
      if (value === null || typeof value !== "object" || Array.isArray(value))
        throw new TypeError(
          (label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value,
        );
    };
    aopts = (value, label) => {
      aobject(value, label);
      const proto = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null)
        throw new TypeError(`"${label}" expected plain object`);
      if (Object.hasOwn(value, "__proto__"))
        throw new TypeError(`"${label}.__proto__" is not allowed`);
    };
    oidNist = (suffix) => ({ oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix]) });
  }))();
}

// node_modules/@noble/hashes/_md.js
/**
 * Shared 32-bit conditional boolean primitive reused by SHA-256, SHA-1, and MD5 `F`.
 * Returns bits from `b` when `a` is set, otherwise from `c`.
 * The XOR form is equivalent to MD5's `F(X,Y,Z) = XY v not(X)Z` because the masked terms never
 * set the same bit.
 * @param a - selector word
 * @param b - word chosen when selector bit is set
 * @param c - word chosen when selector bit is clear
 * @returns Mixed 32-bit word.
 * @example
 * Combine three words with the shared 32-bit choice primitive.
 * ```ts
 * Chi(0xffffffff, 0x12345678, 0x87654321);
 * ```
 */
function Chi(a, b, c) {
  return (a & b) ^ (~a & c);
}
/**
 * Shared 32-bit majority primitive reused by SHA-256 and SHA-1.
 * Returns bits shared by at least two inputs.
 * @param a - first input word
 * @param b - second input word
 * @param c - third input word
 * @returns Mixed 32-bit word.
 * @example
 * Combine three words with the shared 32-bit majority primitive.
 * ```ts
 * Maj(0xffffffff, 0x12345678, 0x87654321);
 * ```
 */
function Maj(a, b, c) {
  return (a & b) ^ (a & c) ^ (b & c);
}
var HashMD, SHA256_IV;
function init__md() {
  return (init__md = __esmMin(() => {
    init__u64();
    init_utils();
    HashMD = class {
      blockLen;
      outputLen;
      canXOF = false;
      padOffset;
      isLE;
      buffer;
      view;
      finished = false;
      length = 0;
      pos = 0;
      destroyed = false;
      constructor(blockLen, outputLen, padOffset, isLE) {
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.buffer = new Uint8Array(blockLen);
        this.view = createView(this.buffer);
      }
      update(data) {
        aexists(this);
        abytes(data);
        const { view, buffer, blockLen } = this;
        const len = data.length;
        let processed = false;
        for (let pos = 0; pos < len;) {
          const take = Math.min(blockLen - this.pos, len - pos);
          if (take === blockLen) {
            const dataView = createView(data);
            for (; blockLen <= len - pos; pos += blockLen) this.process(dataView, pos);
            processed = true;
            continue;
          }
          buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
          this.pos += take;
          pos += take;
          if (this.pos === blockLen) {
            this.process(view, 0);
            this.pos = 0;
            processed = true;
          }
        }
        this.length += data.length;
        if (processed) this.roundClean();
        return this;
      }
      digestInto(out) {
        aexists(this);
        aoutput(out, this);
        this.finished = true;
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        buffer[pos++] = 128;
        buffer.fill(0, pos);
        if (this.padOffset > blockLen - pos) {
          this.process(view, 0);
          buffer.fill(0);
        }
        setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
        this.process(view, 0);
        this.roundClean();
        const oview = out === buffer ? view : createView(out);
        const len = this.outputLen;
        const outLen = len / 4;
        const state = this.get();
        if (len % 4 || outLen > state.length) throw new Error("invalid outputLen");
        for (let i = 0; i < outLen; i++) oview.setUint32(4 * i, state[i], isLE);
      }
      digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
      }
      _cloneIntoMeta(to) {
        const { buffer, length, finished, destroyed, pos } = this;
        to.destroyed = destroyed;
        to.finished = finished;
        to.length = length;
        to.pos = pos;
        if (pos) to.buffer.set(buffer);
        return to;
      }
      clone() {
        return this._cloneInto();
      }
    };
    SHA256_IV = /* @__PURE__ */ Uint32Array.from([
      1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225,
    ]);
  }))();
}

// node_modules/@noble/hashes/sha2.js
var SHA256_K, SHA256_W, SHA2_32B, _SHA256, sha256;
function init_sha2() {
  return (init_sha2 = __esmMin(() => {
    init__md();
    init_utils();
    SHA256_K = /* @__PURE__ */ Uint32Array.from([
      1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221,
      3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580,
      3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
      2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895,
      666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037,
      2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344,
      430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779,
      1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479,
      3329325298,
    ]);
    SHA256_W = /* @__PURE__ */ new Uint32Array(64);
    SHA2_32B = class extends HashMD {
      A = 0;
      B = 0;
      C = 0;
      D = 0;
      E = 0;
      F = 0;
      G = 0;
      H = 0;
      constructor(outputLen, IV) {
        super(64, outputLen, 8, false);
        this.A = IV[0] | 0;
        this.B = IV[1] | 0;
        this.C = IV[2] | 0;
        this.D = IV[3] | 0;
        this.E = IV[4] | 0;
        this.F = IV[5] | 0;
        this.G = IV[6] | 0;
        this.H = IV[7] | 0;
      }
      get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
      }
      set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
      }
      _cloneInto(to) {
        (to ||= new this.constructor()).set(...this.get());
        return this._cloneIntoMeta(to);
      }
      process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4) SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
          const W15 = SHA256_W[i - 15];
          const W2 = SHA256_W[i - 2];
          const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3);
          const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
          SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
        }
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
          const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
          const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
          const T2 = ((rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22)) + Maj(A, B, C)) | 0;
          H = G;
          G = F;
          F = E;
          E = (D + T1) | 0;
          D = C;
          C = B;
          B = A;
          A = (T1 + T2) | 0;
        }
        A = (A + this.A) | 0;
        B = (B + this.B) | 0;
        C = (C + this.C) | 0;
        D = (D + this.D) | 0;
        E = (E + this.E) | 0;
        F = (F + this.F) | 0;
        G = (G + this.G) | 0;
        H = (H + this.H) | 0;
        this.set(A, B, C, D, E, F, G, H);
      }
      roundClean() {
        clean(SHA256_W);
      }
      destroy() {
        this.destroyed = true;
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        clean(this.buffer);
      }
    };
    _SHA256 = class extends SHA2_32B {
      constructor() {
        super(32, SHA256_IV);
      }
    };
    sha256 = /* @__PURE__ */ createHasher(() => new _SHA256(), /* @__PURE__ */ oidNist(1));
  }))();
}

// node_modules/@lumis-sh/lumis/dist/chunk-MBM7PUQ4.js
function isUtf8Boundary(bytes, offset) {
  return (
    offset === 0 ||
    offset === bytes.length ||
    (offset < bytes.length && (bytes[offset] & 192) !== 128)
  );
}
function validateByteOffset(sourceIndex, index, offset) {
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new RangeError(`annotation ${index} byte offset must be a non-negative integer`);
  if (offset > sourceIndex.sourceBytes.length)
    throw new RangeError(
      `annotation ${index} ends at byte ${offset}, beyond source length ${sourceIndex.sourceBytes.length}`,
    );
  if (!isUtf8Boundary(sourceIndex.sourceBytes, offset))
    throw new RangeError(`annotation ${index} offset ${offset} is not a UTF-8 character boundary`);
}
function validatePosition(index, position) {
  if (
    !Number.isSafeInteger(position.line) ||
    position.line < 0 ||
    !Number.isSafeInteger(position.column) ||
    position.column < 0
  )
    throw new RangeError(
      `annotation ${index} position must contain non-negative integer line and column values`,
    );
}
function lineByteRange(sourceIndex, index, line) {
  const lineStartIndex = sourceIndex.lineStarts[line];
  if (lineStartIndex === void 0)
    throw new RangeError(
      `annotation ${index} line ${line} is outside the source's ${sourceIndex.lineStarts.length} lines`,
    );
  const nextLineStartIndex = sourceIndex.lineStarts[line + 1];
  const nextLineStart =
    nextLineStartIndex === void 0 ? void 0 : sourceIndex.utf8Offsets[nextLineStartIndex];
  return {
    start: sourceIndex.utf8Offsets[lineStartIndex] ?? 0,
    end: nextLineStart === void 0 ? sourceIndex.sourceBytes.length : nextLineStart - 1,
  };
}
function resolvePosition(sourceIndex, index, position) {
  validatePosition(index, position);
  const line = lineByteRange(sourceIndex, index, position.line);
  const lineStart = line.start;
  const lineLength = line.end - lineStart;
  if (position.column > lineLength)
    throw new RangeError(
      `annotation ${index} column ${position.column} is beyond line ${position.line} byte length ${lineLength}`,
    );
  const offset = lineStart + position.column;
  validateByteOffset(sourceIndex, index, offset);
  return offset;
}
function resolveRange(sourceIndex, index, range) {
  let start;
  let end;
  if (range.type === "offset") {
    start = range.start;
    end = range.end;
    validateByteOffset(sourceIndex, index, start);
    validateByteOffset(sourceIndex, index, end);
  } else if (range.type === "position") {
    start = resolvePosition(sourceIndex, index, range.start);
    end = resolvePosition(sourceIndex, index, range.end);
  } else throw new RangeError(`annotation ${index} has an unknown range type`);
  if (start > end)
    throw new RangeError(
      `annotation ${index} range start must not be after its end: ${start}..${end}`,
    );
  return {
    start,
    end,
  };
}
function resolveAnnotations(sourceIndex, annotations) {
  return annotations.map((annotation, index) => ({
    range: resolveRange(sourceIndex, index, annotation.range),
    data: annotation.data,
  }));
}
function annotationBoundaries(annotations) {
  const boundaries = /* @__PURE__ */ new Map();
  const at = (offset) => {
    const boundary = boundaries.get(offset) ?? {
      starts: [],
      ends: [],
      points: [],
    };
    boundaries.set(offset, boundary);
    return boundary;
  };
  annotations.forEach((annotation, index) => {
    if (annotation.range.start === annotation.range.end) {
      at(annotation.range.start).points.push(index);
      return;
    }
    at(annotation.range.start).starts.push(index);
    at(annotation.range.end).ends.push(index);
  });
  return boundaries;
}
function applyBoundary(boundary, active) {
  for (const index of boundary.ends) active.delete(index);
  for (const index of boundary.starts) active.add(index);
}
function advanceBoundaries(boundaries, active, from, limit) {
  let index = from;
  while (index < boundaries.offsets.length && boundaries.offsets[index] <= limit) {
    applyBoundary(boundaries.byOffset.get(boundaries.offsets[index]), active);
    index += 1;
  }
  return index;
}
function sameLayer(left, right) {
  if (left.type === "annotation") return right.type === "annotation" && left.index === right.index;
  return right.type !== "annotation" && left.id === right.id;
}
function desiredLayers(activeAnnotations, annotations, inputLayers, placement) {
  const annotationLayers = [...activeAnnotations]
    .sort((left, right) => left - right)
    .map((index) => ({
      type: "annotation",
      index,
      annotation: annotations[index],
    }));
  return placement === "outermost"
    ? [...annotationLayers, ...inputLayers]
    : [...inputLayers, ...annotationLayers];
}
function transitionLayers(output, current, desired) {
  let common = 0;
  while (
    common < current.length &&
    common < desired.length &&
    sameLayer(current[common], desired[common])
  )
    common += 1;
  for (let index = current.length - 1; index >= common; index -= 1)
    output.push(closeLayerEvent(current[index]));
  for (const layer of desired.slice(common)) output.push(openLayerEvent(layer));
  return desired;
}
function closeLayerEvent(layer) {
  if (layer.type === "syntax") return { type: "end" };
  if (layer.type === "decoration") return { type: "decorationEnd" };
  return { type: "annotationEnd" };
}
function openLayerEvent(layer) {
  if (layer.type === "syntax")
    return {
      type: "start",
      scope: layer.scope,
      language: layer.language,
    };
  if (layer.type === "decoration")
    return {
      type: "decorationStart",
      decoration: layer.decoration,
    };
  return {
    type: "annotationStart",
    range: layer.annotation.range,
    data: layer.annotation.data,
  };
}
function emitPoints(output, boundaries, annotations, pending, offset) {
  if (!pending.delete(offset)) return;
  for (const index of boundaries.byOffset.get(offset).points) {
    const annotation = annotations[index];
    output.push(
      {
        type: "annotationStart",
        range: annotation.range,
        data: annotation.data,
      },
      { type: "annotationEnd" },
    );
  }
}
function composeSourceEvent(
  event,
  state,
  boundaries,
  activeAnnotations,
  annotations,
  inputLayers,
  placement,
  output,
) {
  state.boundaryIndex = advanceBoundaries(
    boundaries,
    activeAnnotations,
    state.boundaryIndex,
    event.start,
  );
  let cursor = event.start;
  while (cursor < event.end) {
    const boundary = boundaries.offsets[state.boundaryIndex];
    const next = boundary !== void 0 && boundary < event.end ? boundary : event.end;
    state.activeLayers = transitionLayers(
      output,
      state.activeLayers,
      desiredLayers(activeAnnotations, annotations, inputLayers, placement),
    );
    emitPoints(output, boundaries, annotations, state.pendingPoints, cursor);
    if (cursor < next)
      output.push({
        type: "source",
        start: cursor,
        end: next,
      });
    cursor = next;
    state.boundaryIndex = advanceBoundaries(
      boundaries,
      activeAnnotations,
      state.boundaryIndex,
      cursor,
    );
  }
}
function composeAnnotations(events, annotations, sourceIndex) {
  return composeAnnotationsWithPlacement(events, annotations, sourceIndex, "outermost");
}
function composeAnnotationsInnermost(events, annotations, sourceIndex) {
  return composeAnnotationsWithPlacement(events, annotations, sourceIndex, "innermost");
}
function composeAnnotationsWithPlacement(events, annotations, sourceIndex, placement) {
  if (annotations.length === 0) return [...events];
  const resolvedAnnotations = resolveAnnotations(sourceIndex, annotations);
  const byOffset = annotationBoundaries(resolvedAnnotations);
  const boundaries = {
    byOffset,
    offsets: [...byOffset.keys()].sort((left, right) => left - right),
  };
  const activeAnnotations = /* @__PURE__ */ new Set();
  const inputLayers = [];
  const output = [];
  const state = {
    boundaryIndex: 0,
    activeLayers: [],
    pendingPoints: new Set(
      [...byOffset].filter(([, boundary]) => boundary.points.length > 0).map(([offset]) => offset),
    ),
  };
  let nextInputId = 0;
  for (const event of events)
    if (event.type === "source")
      composeSourceEvent(
        event,
        state,
        boundaries,
        activeAnnotations,
        resolvedAnnotations,
        inputLayers,
        placement,
        output,
      );
    else nextInputId = applyInputEvent(event, inputLayers, nextInputId);
  transitionLayers(output, state.activeLayers, []);
  for (const offset of [...state.pendingPoints].sort((left, right) => left - right))
    emitPoints(output, boundaries, resolvedAnnotations, state.pendingPoints, offset);
  return output;
}
function applyInputEvent(event, layers, nextId) {
  switch (event.type) {
    case "start":
      layers.push({
        type: "syntax",
        id: nextId,
        scope: event.scope,
        language: event.language,
      });
      return nextId + 1;
    case "end":
      if (layers.at(-1)?.type === "syntax") layers.pop();
      return nextId;
    case "decorationStart":
      layers.push({
        type: "decoration",
        id: nextId,
        decoration: event.decoration,
      });
      return nextId + 1;
    case "decorationEnd":
      if (layers.at(-1)?.type === "decoration") layers.pop();
      return nextId;
  }
  throw new Error("Unhandled highlight event type");
}
function rainbowBracketScope$1(depth) {
  return RAINBOW_BRACKET_SCOPES$1[
    (Number.isSafeInteger(depth) && depth >= 0 ? depth : 0) % RAINBOW_BRACKET_SCOPES$1.length
  ];
}
function diffWordScope$1(kind) {
  return kind === "removed" ? "diff.minus.word" : "diff.plus.word";
}
function decorationScope$1(decoration) {
  return decoration.type === "diffWord"
    ? diffWordScope$1(decoration.kind)
    : rainbowBracketScope$1(decoration.depth);
}
function composeRainbowDecorations(events, ranges, sourceIndex) {
  return composeInnermostDecorations(
    events,
    ranges.map((range) => ({
      range: {
        type: "offset",
        start: range.startByte,
        end: range.endByte,
      },
      data: {
        type: "rainbowBracket",
        depth: range.depth,
      },
    })),
    sourceIndex,
  );
}
function composeDiffWordDecorations(events, ranges, sourceIndex) {
  return composeInnermostDecorations(
    events,
    ranges.map((range) => ({
      range: {
        type: "offset",
        start: range.startByte,
        end: range.endByte,
      },
      data: {
        type: "diffWord",
        kind: range.kind,
      },
    })),
    sourceIndex,
  );
}
function composeInnermostDecorations(events, annotations, sourceIndex) {
  if (annotations.length === 0) return [...events];
  const composed = composeAnnotationsInnermost(events, annotations, sourceIndex);
  const output = [];
  for (const event of composed)
    if (event.type === "annotationStart")
      output.push({
        type: "decorationStart",
        decoration: event.data,
      });
    else if (event.type === "annotationEnd") output.push({ type: "decorationEnd" });
    else output.push(event);
  return output;
}
function diffWordRanges(sourceBytes, lines, stop = () => false) {
  const ranges = [];
  let start = 0;
  while (start < lines.length) {
    const end = runEnd(lines, start);
    let split = start;
    while (split < end && lines[split].kind === "removed") split += 1;
    const ran = diffRun(sourceBytes, lines.slice(start, split), lines.slice(split, end), stop);
    if (!ran) return void 0;
    for (const range of ran) ranges.push(range);
    start = end;
  }
  return ranges;
}
function runEnd(lines, start) {
  let end = start + 1;
  while (end < lines.length) {
    const previous = lines[end - 1];
    const line = lines[end];
    const startsNewRun = previous.kind === "added" && line.kind === "removed";
    if (line.row !== previous.row + 1 || startsNewRun) break;
    end += 1;
  }
  return end;
}
function sideBytes(lines) {
  return lines.reduce((total, line) => total + line.endByte - line.startByte, 0);
}
function diffRun(sourceBytes, removed, added, stop) {
  if (stop()) return void 0;
  if (sideBytes(removed) > MAX_RUN_SIDE_BYTES || sideBytes(added) > MAX_RUN_SIDE_BYTES) return [];
  const decoder4 = new TextDecoder("utf-8", { ignoreBOM: true });
  const tokenizeWorded = (lines) =>
    lines.map((line) => tokenize(sourceBytes, line, decoder4)).filter((t) => nonSpace(t) > 0);
  const old = tokenizeWorded(removed);
  const neu = tokenizeWorded(added);
  if (old.length === 0 || neu.length === 0) return [];
  const removedRanges = [];
  const addedRanges = [];
  const pairs = pairLines(old, neu, stop);
  if (!pairs) return void 0;
  for (const [i, j, comparison] of pairs) {
    markLine(old[i], comparison.oldChanged, "removed", removedRanges);
    markLine(neu[j], comparison.newChanged, "added", addedRanges);
  }
  return [...removedRanges, ...addedRanges];
}
function pairLines(old, neu, stop) {
  const table = pairingTable(old, neu, stop);
  return table && walkPairs(old, neu, table);
}
function pairingTable(old, neu, stop) {
  const width = neu.length + 1;
  const newWords = neu.map((line) => nonSpace(line));
  const kept = [];
  const best = Array.from({ length: width }, () => 0);
  for (const [i, oldLine] of old.entries()) {
    if (stop()) return void 0;
    const oldWords = nonSpace(oldLine);
    const row = (i + 1) * width;
    best.push(0);
    for (const [j, newLine] of neu.entries()) {
      const shared = sharedTokens(oldLine, oldWords, newLine, newWords[j], stop);
      if (shared === void 0) return void 0;
      kept.push(shared);
      const paired = shared > 0 ? best[row - width + j] + shared : 0;
      best.push(Math.max(paired, best[row - width + j + 1], best[row + j]));
    }
  }
  return {
    kept,
    best,
  };
}
function sharedTokens(oldLine, oldWords, newLine, newWords, stop) {
  if (stop()) return void 0;
  const shared = compare(oldLine, newLine).kept;
  return shared > 0 && shared * 3 >= oldWords && shared * 3 >= newWords ? shared : 0;
}
function walkPairs(old, neu, { kept, best }) {
  const columns = neu.length;
  const at = (i2, j2) => best[i2 * (columns + 1) + j2];
  const pairs = [];
  let i = old.length;
  let j = columns;
  while (i > 0 && j > 0) {
    const shared = kept[(i - 1) * columns + j - 1];
    if (shared > 0 && at(i, j) === at(i - 1, j - 1) + shared) {
      pairs.unshift([i - 1, j - 1, compare(old[i - 1], neu[j - 1])]);
      i -= 1;
      j -= 1;
    } else if (at(i, j) === at(i - 1, j)) i -= 1;
    else j -= 1;
  }
  return pairs;
}
function nonSpace(tokens) {
  return tokens.filter((token) => token.class !== "space").length;
}
function compare(old, neu) {
  const oldChanged = Array.from({ length: old.length }, () => false);
  const newChanged = Array.from({ length: neu.length }, () => false);
  const [prefix, suffix] = commonEnds(old, neu);
  const middle = {
    old: old.slice(prefix, old.length - suffix),
    neu: neu.slice(prefix, neu.length - suffix),
  };
  const table = lcsTable(middle.old, middle.neu);
  const width = middle.old.length + 1;
  let o = 0;
  let n = 0;
  while (n < middle.neu.length && o < middle.old.length)
    if (middle.neu[n].text === middle.old[o].text) {
      o += 1;
      n += 1;
    } else if (table[n * width + o + 1] >= table[(n + 1) * width + o]) {
      oldChanged[prefix + o] = true;
      o += 1;
    } else {
      newChanged[prefix + n] = true;
      n += 1;
    }
  oldChanged.fill(true, prefix + o, prefix + middle.old.length);
  newChanged.fill(true, prefix + n, prefix + middle.neu.length);
  return {
    oldChanged,
    newChanged,
    kept: old.filter((token, index) => !oldChanged[index] && token.class !== "space").length,
  };
}
function commonEnds(old, neu) {
  const shortest = Math.min(old.length, neu.length);
  let prefix = 0;
  while (prefix < shortest && old[prefix].text === neu[prefix].text) prefix += 1;
  let suffix = 0;
  while (
    suffix < shortest - prefix &&
    old[old.length - 1 - suffix].text === neu[neu.length - 1 - suffix].text
  )
    suffix += 1;
  return [prefix, suffix];
}
function lcsTable(old, neu) {
  const width = old.length + 1;
  const table = new Uint32Array((neu.length + 1) * width);
  for (let n = neu.length - 1; n >= 0; n -= 1)
    for (let o = old.length - 1; o >= 0; o -= 1)
      table[n * width + o] =
        neu[n].text === old[o].text
          ? table[(n + 1) * width + o + 1] + 1
          : Math.max(table[(n + 1) * width + o], table[n * width + o + 1]);
  return table;
}
function tokenize(sourceBytes, line, decoder4) {
  const text = decoder4.decode(sourceBytes.subarray(line.startByte, line.endByte));
  const tokens = [];
  let offset = line.startByte;
  for (const char of text) {
    const length = utf8Length(char);
    const tokenClass = classOf(char);
    const last = tokens.at(-1);
    if (last && tokenClass !== "other" && last.class === tokenClass) {
      last.endByte = offset + length;
      last.text += char;
    } else
      tokens.push({
        startByte: offset,
        endByte: offset + length,
        text: char,
        class: tokenClass,
      });
    offset += length;
  }
  return tokens;
}
function utf8Length(char) {
  const codePoint = char.codePointAt(0);
  if (codePoint < 128) return 1;
  if (codePoint < 2048) return 2;
  return codePoint < 65536 ? 3 : 4;
}
function classOf(char) {
  if (WORD.test(char)) return "word";
  return SPACE.test(char) ? "space" : "other";
}
function markLine(tokens, changed, kind, out) {
  const segments = [];
  for (let index = 0; index < changed.length; index += 1) {
    if (!changed[index]) continue;
    const last = segments.at(-1);
    if (
      last &&
      (last[1] + 1 === index || (last[1] + 2 === index && tokens[last[1] + 1].class === "space"))
    )
      last[1] = index;
    else segments.push([index, index]);
  }
  for (const [first, last] of segments)
    out.push({
      startByte: tokens[first].startByte,
      endByte: tokens[last].endByte,
      kind,
    });
}
function utf8ByteLength(codePoint) {
  if (codePoint <= 127) return 1;
  if (codePoint <= 2047) return 2;
  if (codePoint <= 65535) return 3;
  return 4;
}
function buildUtf8OffsetMap(source) {
  const offsets = Array.from({ length: source.length + 1 });
  offsets[0] = 0;
  let codeUnitOffset = 0;
  let byteOffset = 0;
  for (const char of source) {
    offsets[codeUnitOffset] = byteOffset;
    const codePoint = char.codePointAt(0);
    const charCodeUnits = char.length;
    const charBytes = utf8ByteLength(codePoint);
    for (let i = 1; i < charCodeUnits; i += 1) offsets[codeUnitOffset + i] = byteOffset;
    codeUnitOffset += charCodeUnits;
    byteOffset += charBytes;
    offsets[codeUnitOffset] = byteOffset;
  }
  return offsets;
}
function warnUnresolvedInjection(id, advice = "Load it up front.") {
  if (!catalogNames.has(id.toLowerCase())) return;
  if (warnedUnresolved.has(id)) return;
  warnedUnresolved.add(id);
  console.warn(
    `Lumis could not load "${id}", injected inside the document being highlighted. ${advice} See https://docs.lumis.sh/languages`,
  );
}
function buildLineStartMap(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) if (source[i] === "\n") starts.push(i + 1);
  return starts;
}
function buildSourceMaps(source) {
  const utf8Offsets = buildUtf8OffsetMap(source);
  const lineStarts = buildLineStartMap(source);
  const sourceUtf8ByteLength = utf8Offsets[source.length] ?? 0;
  const utf16Indices = Array.from({ length: sourceUtf8ByteLength + 1 });
  for (const [index, byte] of utf8Offsets.entries()) utf16Indices[byte] ??= index;
  return {
    utf8Offsets,
    utf16Indices,
    lineStarts,
    byteLineStarts: lineStarts.map((index) => utf8Offsets[index] ?? 0),
    sourceBytes: encoder.encode(source),
    sourceLength: source.length,
    sourceUtf8ByteLength,
  };
}
function buildSourceIndex(source) {
  return buildSourceMaps(source);
}
function nodeStartByte(node, maps) {
  return maps.utf8Offsets[node.startIndex] ?? 0;
}
function nodeEndByte(node, maps) {
  return maps.utf8Offsets[node.endIndex] ?? 0;
}
function snapshotCapturesWithMatches(
  captures,
  matches,
  maps,
  firstHighlightPattern,
  captureOffsets,
) {
  const queues = buildCaptureMatchQueues(matches, firstHighlightPattern);
  const result = [];
  let nextMatchIndex = matches.length;
  for (const capture of captures) {
    if (capture.patternIndex < firstHighlightPattern) continue;
    const queue = queues.get(capture.patternIndex)?.get(capture.node.id)?.get(capture.name);
    let matchIndex = queue?.indexes[queue.cursor];
    if (queue && matchIndex != null) queue.cursor += 1;
    else {
      matchIndex = nextMatchIndex;
      nextMatchIndex += 1;
    }
    result.push(snapshotCapture(capture, matchIndex, maps, captureOffsets));
  }
  return {
    captures: result,
    matchCount: nextMatchIndex,
  };
}
function buildCaptureMatchQueues(matches, firstHighlightPattern) {
  const queues = /* @__PURE__ */ new Map();
  for (const [matchIndex, match] of matches.entries()) {
    if (match.patternIndex < firstHighlightPattern) continue;
    for (const capture of match.captures) {
      let nodes = queues.get(capture.patternIndex);
      if (!nodes) {
        nodes = /* @__PURE__ */ new Map();
        queues.set(capture.patternIndex, nodes);
      }
      let names = nodes.get(capture.node.id);
      if (!names) {
        names = /* @__PURE__ */ new Map();
        nodes.set(capture.node.id, names);
      }
      const queue = names.get(capture.name);
      if (queue) queue.indexes.push(matchIndex);
      else
        names.set(capture.name, {
          indexes: [matchIndex],
          cursor: 0,
        });
    }
  }
  return queues;
}
function snapshotCapturesFromMatches(matches, maps, firstHighlightPattern, captureOffsets) {
  const entries = [];
  for (const [matchIndex, match] of matches.entries()) {
    if (match.patternIndex < firstHighlightPattern) continue;
    for (const [position, capture] of match.captures.entries())
      entries.push({
        capture,
        match,
        matchIndex,
        position,
        startByte: nodeStartByte(capture.node, maps),
      });
  }
  entries.sort(
    (a, b) =>
      a.startByte - b.startByte ||
      a.capture.patternIndex - b.capture.patternIndex ||
      a.matchIndex - b.matchIndex ||
      a.position - b.position,
  );
  return {
    captures: entries.map((entry) =>
      snapshotCapture(
        entry.capture,
        entry.matchIndex,
        maps,
        captureOffsets,
        entry.match.setProperties,
      ),
    ),
    matchCount: matches.length,
  };
}
function snapshotCapture(
  capture,
  matchIndex,
  maps,
  captureOffsets,
  setProperties = capture.setProperties,
) {
  const offset = captureOffsets[capture.patternIndex]?.[capture.name];
  const adjusted = offset ? applyCaptureOffset(nodeToRange(capture.node), offset, maps) : void 0;
  return {
    matchIndex,
    patternIndex: capture.patternIndex,
    name: capture.name,
    nodeId: capture.node.id,
    startByte: adjusted
      ? (maps.utf8Offsets[adjusted.startIndex] ?? nodeStartByte(capture.node, maps))
      : nodeStartByte(capture.node, maps),
    endByte: adjusted
      ? (maps.utf8Offsets[adjusted.endIndex] ?? nodeEndByte(capture.node, maps))
      : nodeEndByte(capture.node, maps),
    isMissing: capture.node.isMissing,
    setProperties,
  };
}
function resolveInjection(source, match, language, maps, parentLanguageName) {
  const offsets = language.config.captureOffsets[match.patternIndex];
  const captured = readInjectionCaptures(source, match, language, maps, offsets);
  const setProperties = match.setProperties ?? {};
  const includeChildren = "injection.include-children" in setProperties;
  const ranges = captured.contentCaptures.flatMap((capture) =>
    getCaptureRanges(capture, maps, includeChildren, offsets?.[capture.name]),
  );
  return {
    languageName: injectionLanguageName(captured, setProperties, language, parentLanguageName),
    ranges,
    combined: "injection.combined" in setProperties,
  };
}
function readInjectionCaptures(source, match, language, maps, offsets) {
  let languageName;
  let filenameLanguage;
  const contentCaptures = [];
  for (const capture of match.captures) {
    const metadata = language.config.captureMetadata[capture.name];
    if (!metadata) continue;
    if (metadata.isInjectionContent) contentCaptures.push(capture);
    else if (metadata.isInjectionLanguage) languageName ??= capture.node.text;
    else if (metadata.isInjectionFilename)
      filenameLanguage ??= filenameCaptureLanguage(source, capture, maps, offsets);
  }
  return {
    languageName,
    filenameLanguage,
    contentCaptures,
  };
}
function filenameCaptureLanguage(source, capture, maps, offsets) {
  const range = applyCaptureOffset(nodeToRange(capture.node), offsets?.[capture.name], maps);
  return languageIdForFilename(source.slice(range.startIndex, range.endIndex));
}
function injectionLanguageName(captured, setProperties, language, parentLanguageName) {
  let languageName = captured.languageName ?? captured.filenameLanguage;
  if (!languageName) languageName = setProperties["injection.language"] ?? void 0;
  if (!languageName && "injection.self" in setProperties) languageName = language.definition.id;
  if (!languageName && "injection.parent" in setProperties) languageName = parentLanguageName;
  return languageName;
}
function parseWithin(language, source, budget, includedRanges, progressCallback) {
  let tree;
  try {
    tree = language.parser.parse(source, null, {
      includedRanges,
      progressCallback,
    });
  } catch (cause) {
    if (!(cause instanceof WebAssembly.RuntimeError)) throw cause;
    throw new Error(`parser returned no tree for language '${language.definition.id}'`, { cause });
  }
  if (!tree) {
    language.parser.reset();
    if (!budget.deadline?.passed())
      throw new Error(`parser returned no tree for language '${language.definition.id}'`);
    return null;
  }
  if (budget.deadline?.passed()) {
    tree.delete();
    language.parser.reset();
    return null;
  }
  return tree;
}
function snapshotCaptures(language, rootNode, queryOptions, queryMatches, maps, budget) {
  if (language.config.replayCapturesFromMatches)
    return snapshotCapturesFromMatches(
      queryMatches,
      maps,
      language.config.injectionPatternEnd,
      language.config.captureOffsets,
    );
  const captures = language.config.query.captures(rootNode, queryOptions);
  if (language.config.query.didExceedMatchLimit?.()) budget.exceededMatchLimit = true;
  return snapshotCapturesWithMatches(
    captures,
    queryMatches,
    maps,
    language.config.injectionPatternEnd,
    language.config.captureOffsets,
  );
}
function queryWithin(language, rootNode, queryOptions, maps, budget) {
  const queryMatches = language.config.query.matches(rootNode, queryOptions);
  if (language.config.query.didExceedMatchLimit?.()) budget.exceededMatchLimit = true;
  const snapshot = snapshotCaptures(language, rootNode, queryOptions, queryMatches, maps, budget);
  if (budget.deadline?.passed()) return null;
  return {
    queryMatches,
    snapshot,
  };
}
function collectHighlightLayers(
  source,
  maps,
  runtime2,
  language,
  depth,
  matchLimit,
  budget,
  includedRanges,
  parentLanguageName,
) {
  const progressCallback = budget.deadline ? () => budget.deadline?.passed() ?? false : void 0;
  const tree = parseWithin(language, source, budget, includedRanges, progressCallback);
  if (!tree) return [];
  try {
    const queryOptions = {
      matchLimit,
      ...(progressCallback ? { progressCallback } : {}),
    };
    const queried = queryWithin(language, tree.rootNode, queryOptions, maps, budget);
    if (!queried) return [];
    const { queryMatches, snapshot } = queried;
    const localDefinitionValueEnds = collectLocalDefinitionValueEnds(
      queryMatches,
      language,
      maps,
      snapshot.matchCount,
    );
    const layers = [
      {
        depth,
        language,
        captures: snapshot.captures,
        localDefinitionValueEnds,
      },
    ];
    if (language.config.injectionPatternEnd === 0) return layers;
    layers.push(
      ...collectInjectedLayers(
        queryMatches,
        source,
        maps,
        runtime2,
        language,
        depth,
        matchLimit,
        budget,
        parentLanguageName,
      ),
    );
    return layers;
  } finally {
    tree.delete();
  }
}
function collectInjectedLayers(
  queryMatches,
  source,
  maps,
  runtime2,
  language,
  depth,
  matchLimit,
  budget,
  parentLanguageName,
) {
  const layers = [];
  const combined = /* @__PURE__ */ new Map();
  const inject = (languageName, ranges) => {
    layers.push(
      ...injectedLayers(
        languageName,
        ranges,
        source,
        maps,
        runtime2,
        language,
        depth,
        matchLimit,
        budget,
      ),
    );
  };
  for (const match of queryMatches) {
    if (match.patternIndex >= language.config.injectionPatternEnd) continue;
    const resolved = resolveInjection(source, match, language, maps, parentLanguageName);
    if (!resolved.languageName || resolved.ranges.length === 0) continue;
    if (resolved.combined)
      addCombinedInjection(combined, match.patternIndex, resolved.languageName, resolved.ranges);
    else inject(resolved.languageName, resolved.ranges);
  }
  for (const { languageName, ranges } of combined.values()) {
    ranges.sort((a, b) => a.startIndex - b.startIndex);
    inject(languageName, ranges);
  }
  return layers;
}
function injectedLayers(
  languageName,
  ranges,
  source,
  maps,
  runtime2,
  language,
  depth,
  matchLimit,
  budget,
) {
  const injectedLanguage = resolveInjectedLanguage(runtime2, languageName, budget);
  if (!injectedLanguage) {
    warnUnresolvedInjection(languageName);
    return [];
  }
  if (injectedLanguage.kind !== "wasm") return [];
  return collectHighlightLayers(
    source,
    maps,
    runtime2,
    injectedLanguage,
    depth + 1,
    matchLimit,
    budget,
    ranges,
    language.definition.id,
  );
}
function resolveInjectedLanguage(runtime2, languageName, budget) {
  const loaded = runtime2.getLoadedLanguage(languageName);
  if (loaded || !runtime2.loadInjectedLanguage) return loaded;
  const started = Date.now();
  try {
    return runtime2.loadInjectedLanguage(languageName);
  } finally {
    budget.deadline?.extend(Date.now() - started);
  }
}
function collectLocalDefinitionValueEnds(queryMatches, language, maps, matchCount) {
  const ends = new Uint32Array(matchCount);
  for (const [matchIndex, match] of queryMatches.entries()) {
    const value = match.captures.find(
      (capture) => language.config.captureMetadata[capture.name]?.isLocalDefinitionValue,
    );
    if (value) ends[matchIndex] = nodeEndByte(value.node, maps);
  }
  return ends;
}
function addCombinedInjection(combined, patternIndex, languageName, ranges) {
  const group = combined.get(patternIndex);
  if (group) group.ranges.push(...ranges);
  else
    combined.set(patternIndex, {
      languageName,
      ranges: [...ranges],
    });
}
function getCaptureRanges(capture, maps, includeChildren, offset) {
  const range = applyCaptureOffset(nodeToRange(capture.node), offset, maps);
  if (includeChildren || capture.node.childCount === 0) return [range];
  return maskNamedChildren(capture, range, maps);
}
function maskNamedChildren(capture, range, maps) {
  const ranges = [];
  let startIndex = range.startIndex;
  for (const child of capture.node.children) {
    if (!child?.isNamed) continue;
    const maskStart = Math.max(child.startIndex, range.startIndex);
    const maskEnd = Math.min(child.endIndex, range.endIndex);
    if (maskStart >= maskEnd || maskEnd <= startIndex) continue;
    if (maskStart > startIndex) ranges.push(makeRangeAt(startIndex, maskStart, maps));
    startIndex = maskEnd;
  }
  if (startIndex < range.endIndex) ranges.push(makeRangeAt(startIndex, range.endIndex, maps));
  return ranges;
}
function applyCaptureOffset(range, offset, maps) {
  if (!offset) return range;
  const start = shiftEndpoint(
    range.startIndex,
    range.startPosition.row,
    offset.startRow,
    offset.startColumn,
    maps,
  );
  const end = shiftEndpoint(
    range.endIndex,
    range.endPosition.row,
    offset.endRow,
    offset.endColumn,
    maps,
  );
  if (!start || !end || start.byte > end.byte) return range;
  return makeRange(start.index, end.index, start.position, end.position);
}
function shiftEndpoint(index, row, rowDelta, columnDelta, maps) {
  const byte = maps.utf8Offsets[index];
  const originalLineStart = maps.byteLineStarts[row];
  const targetRow = row + rowDelta;
  const targetLineStart = maps.byteLineStarts[targetRow];
  if (byte == null || originalLineStart == null || targetLineStart == null) return void 0;
  const byteColumn = byte - originalLineStart + columnDelta;
  if (!isSafeColumn(targetRow, byteColumn)) return void 0;
  const targetByte = targetLineStart + byteColumn;
  if (!Number.isSafeInteger(targetByte) || targetByte > endpointLimit(targetRow, rowDelta, maps))
    return;
  const targetIndex = maps.utf16Indices[targetByte];
  const targetUtf16LineStart = maps.lineStarts[targetRow];
  if (targetIndex == null || targetUtf16LineStart == null) return void 0;
  return {
    byte: targetByte,
    index: targetIndex,
    position: {
      row: targetRow,
      column: targetIndex - targetUtf16LineStart,
    },
  };
}
function isSafeColumn(targetRow, byteColumn) {
  return Number.isSafeInteger(targetRow) && Number.isSafeInteger(byteColumn) && byteColumn >= 0;
}
function endpointLimit(targetRow, rowDelta, maps) {
  const nextLineStart = maps.byteLineStarts[targetRow + 1];
  if (rowDelta === 0) return nextLineStart ?? maps.sourceUtf8ByteLength;
  return nextLineStart == null ? maps.sourceUtf8ByteLength : nextLineStart - 1;
}
function indexToPoint(index, lineStarts) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lineStart = lineStarts[mid] ?? 0;
    const nextLineStart = lineStarts[mid + 1] ?? Number.POSITIVE_INFINITY;
    if (index < lineStart) high = mid - 1;
    else if (index >= nextLineStart) low = mid + 1;
    else
      return {
        row: mid,
        column: index - lineStart,
      };
  }
  throw new Error(`Invalid source index ${index}`);
}
function makeRangeAt(startIndex, endIndex, maps) {
  return makeRange(
    startIndex,
    endIndex,
    indexToPoint(startIndex, maps.lineStarts),
    indexToPoint(endIndex, maps.lineStarts),
  );
}
function nodeToRange(node) {
  return makeRange(node.startIndex, node.endIndex, node.startPosition, node.endPosition);
}
function makeRange(startIndex, endIndex, startPosition, endPosition) {
  return {
    startIndex,
    endIndex,
    startPosition,
    endPosition,
  };
}
function assertMatchLimit(matchLimit) {
  if (matchLimit === void 0) return;
  if (!Number.isInteger(matchLimit) || matchLimit < 1 || matchLimit > 65536)
    throw new Error(
      `budget.matchLimit must be an integer from 1 to ${MAX_MATCH_LIMIT}, got ${matchLimit}`,
    );
}
function deadlineIn(timeLimitMs) {
  let at = Date.now() + timeLimitMs;
  const deadline = {
    expired: false,
    extend: (ms) => {
      at += ms;
    },
    passed: () => {
      if (!deadline.expired && Date.now() >= at) deadline.expired = true;
      return deadline.expired;
    },
  };
  return deadline;
}
function assertTimeLimit(timeLimit) {
  if (timeLimit === void 0) return;
  if (!Number.isInteger(timeLimit) || timeLimit < 0)
    throw new Error(`budget.timeLimit must be a whole number of milliseconds, got ${timeLimit}`);
}
function assertBudget(budget) {
  assertMatchLimit(budget?.matchLimit);
  assertTimeLimit(budget?.timeLimit);
}
function buildHighlightEventsWithSourceIndex(source, language, runtime2, options = {}) {
  assertBudget(options.budget);
  const limits = options.budget ?? {};
  const matchLimit = limits.matchLimit ?? 8192;
  const timeLimit = limits.timeLimit ?? 5e3;
  const maps = buildSourceMaps(source);
  const budget = {
    deadline: timeLimit > 0 ? deadlineIn(timeLimit) : void 0,
    exceededMatchLimit: false,
  };
  return finishHighlight(
    source,
    language,
    maps,
    matchLimit,
    budget,
    collectHighlightLayers(source, maps, runtime2, language, 0, matchLimit, budget),
    options,
  );
}
function finishHighlight(source, language, maps, matchLimit, budget, layers, options) {
  const plain = () => ({
    events: [
      {
        type: "source",
        start: 0,
        end: maps.sourceUtf8ByteLength,
      },
    ],
    sourceIndex: maps,
    budget: "time",
  });
  if (budget.deadline?.expired) return plain();
  const events = decorate(source, buildNestedEvents(layers, maps), language, maps, {
    ...options,
    matchLimit,
    budget,
  });
  if (!events) return plain();
  return {
    events,
    sourceIndex: maps,
    budget: budget.exceededMatchLimit ? "matches" : void 0,
  };
}
function queryRainbowBracketRanges(source, language, maps, matchLimit, budget) {
  if (!language.brackets) return [];
  const progressCallback = budget.deadline ? () => budget.deadline?.passed() ?? false : void 0;
  const tree = parseWithin(language, source, budget, void 0, progressCallback);
  if (!tree) return [];
  try {
    const queryOptions = {
      matchLimit,
      ...(progressCallback ? { progressCallback } : {}),
    };
    const pairs = [];
    for (const match of language.brackets.query.matches(tree.rootNode, queryOptions)) {
      if (language.brackets.rainbowExcludePatterns[match.patternIndex]) continue;
      pairs.push(...matchBracketPairs(match, language.brackets.captureMetadata, maps));
    }
    if (language.brackets.query.didExceedMatchLimit?.()) budget.exceededMatchLimit = true;
    return colorizeBracketPairs(pairs);
  } finally {
    tree.delete();
  }
}
function matchBracketPairs(match, captureMetadata, maps) {
  const opens = [];
  const closes = [];
  for (const capture of match.captures) {
    const metadata = captureMetadata[capture.name];
    const range = {
      startByte: nodeStartByte(capture.node, maps),
      endByte: nodeEndByte(capture.node, maps),
    };
    if (metadata?.isOpen) opens.push(range);
    else if (metadata?.isClose) closes.push(range);
  }
  const pairs = [];
  for (let index = 0; index < Math.min(opens.length, closes.length); index += 1) {
    const open = opens[index];
    const close = closes[index];
    if (isBracketPair(open, close))
      pairs.push({
        open,
        close,
      });
  }
  return pairs;
}
function isBracketPair(open, close) {
  return (
    open.startByte < close.endByte &&
    (open.endByte - open.startByte === 1 || close.endByte - close.startByte === 1)
  );
}
function colorizeBracketPairs(pairs) {
  const opens = pairs
    .map((pair) => pair.open)
    .sort((a, b) => a.startByte - b.startByte || a.endByte - b.endByte)
    .filter((range, index, all) => {
      const previous = all[index - 1];
      return (
        !previous || previous.startByte !== range.startByte || previous.endByte !== range.endByte
      );
    });
  const colorPairs = pairs.slice().sort((a, b) => a.close.endByte - b.close.endByte);
  const openStack = [];
  const ranges = [];
  let openIndex = 0;
  for (const pair of colorPairs) {
    while (openIndex < opens.length && opens[openIndex].startByte < pair.close.startByte) {
      openStack.push(opens[openIndex]);
      openIndex += 1;
    }
    const lastOpen = openStack.at(-1);
    if (
      lastOpen &&
      lastOpen.startByte === pair.open.startByte &&
      lastOpen.endByte === pair.open.endByte
    ) {
      const depth = openStack.length - 1;
      ranges.push(
        {
          startByte: pair.open.startByte,
          endByte: pair.open.endByte,
          depth,
        },
        {
          startByte: pair.close.startByte,
          endByte: pair.close.endByte,
          depth,
        },
      );
      openStack.pop();
    }
  }
  return ranges.sort((a, b) => a.startByte - b.startByte || a.endByte - b.endByte);
}
function applyRainbowBrackets(source, events, language, maps, matchLimit, budget) {
  return composeRainbowDecorations(
    events,
    queryRainbowBracketRanges(source, language, maps, matchLimit, budget),
    maps,
  );
}
function decorate(source, events, language, maps, options) {
  const { budget } = options;
  let decorated = events;
  if (options.wordDiff && language.definition.id === DIFF_LANGUAGE) {
    decorated = applyDiffWords(source, decorated, language, maps, budget);
    if (budget.deadline?.passed()) return void 0;
  }
  if (options.rainbowBrackets) {
    decorated = applyRainbowBrackets(source, decorated, language, maps, options.matchLimit, budget);
    if (budget.deadline?.expired) return void 0;
  }
  return decorated;
}
function applyDiffWords(source, events, language, maps, budget) {
  const tree = parseWithin(
    language,
    source,
    budget,
    void 0,
    budget.deadline ? () => budget.deadline?.passed() ?? false : void 0,
  );
  if (!tree) return events;
  try {
    const lines = [];
    let markers = 0;
    for (const node of tree.rootNode.descendantsOfType(["deletion", "addition", "special"])) {
      if (node.type === "special") {
        markers += 1;
        continue;
      }
      lines.push({
        kind: node.type === "deletion" ? "removed" : "added",
        row: node.startPosition.row - markers,
        startByte: nodeStartByte(node, maps) + 1,
        endByte: nodeEndByte(node, maps),
      });
    }
    const stop = () => budget.deadline?.passed() ?? false;
    const ranges = diffWordRanges(maps.sourceBytes, lines, stop);
    return ranges ? composeDiffWordDecorations(events, ranges, maps) : events;
  } finally {
    tree.delete();
  }
}
function takeCapture(layer) {
  const capture = peekCapture(layer);
  if (capture) layer.captureIndex += 1;
  return capture;
}
function consumeLocalCaptures(layer, initialCapture, maps) {
  let capture = initialCapture;
  let definitionTarget;
  let referenceHighlight;
  while (capture.patternIndex < layer.language.config.localsPatternEnd) {
    const applied = applyLocalCapture(layer, capture, maps, definitionTarget != null);
    definitionTarget = applied.definitionTarget ?? definitionTarget;
    referenceHighlight = applied.referenceHighlight ?? referenceHighlight;
    const next = peekCapture(layer);
    if (!next || next.nodeId !== capture.nodeId) return void 0;
    capture = takeCapture(layer);
  }
  return {
    capture,
    definitionTarget,
    referenceHighlight,
  };
}
function applyLocalCapture(layer, capture, maps, hasDefinition) {
  const metadata = layer.language.config.captureMetadata[capture.name];
  if (metadata?.isLocalScope) pushLocalScope(layer, capture);
  else if (metadata?.isLocalDefinition)
    return { definitionTarget: pushLocalDefinition(layer, capture, maps) };
  else if (metadata?.isLocalReference && !hasDefinition)
    return { referenceHighlight: findReferenceHighlight(layer, capture, maps) };
  return {};
}
function chooseHighlightCapture(layer, initialCapture, isLocal) {
  let capture = initialCapture;
  while (true) {
    const next = peekCapture(layer);
    if (!next || next.nodeId !== capture.nodeId) break;
    const following = takeCapture(layer);
    if (isLocal && layer.language.config.nonLocalVariablePatterns[following.patternIndex]) continue;
    if (!layer.language.config.captureMetadata[following.name]?.highlightScope) continue;
    layer.removedMatches[capture.matchIndex] = 1;
    capture = following;
  }
  return capture;
}
function consumeNextHighlight(layer, lastRange, maps) {
  let capture = takeCapture(layer);
  if (!capture) return void 0;
  while (layer.scopeStack.length > 1 && capture.startByte > layer.scopeStack.at(-1).endByte)
    layer.scopeStack.pop();
  const localCaptures = consumeLocalCaptures(layer, capture, maps);
  if (!localCaptures) return void 0;
  ({ capture } = localCaptures);
  const { definitionTarget, referenceHighlight } = localCaptures;
  if (shadowedByShallowerLayer(capture, layer, lastRange)) return void 0;
  capture = chooseHighlightCapture(layer, capture, Boolean(definitionTarget ?? referenceHighlight));
  if (capture.isMissing) return void 0;
  return highlightCapture(layer, capture, definitionTarget, referenceHighlight);
}
function highlightCapture(layer, capture, definitionTarget, referenceHighlight) {
  const scope = layer.language.config.captureMetadata[capture.name]?.highlightScope;
  if (definitionTarget) definitionTarget.highlight = scope;
  const effectiveScope = referenceHighlight ?? scope;
  if (!effectiveScope) return void 0;
  return {
    startByte: capture.startByte,
    endByte: capture.endByte,
    scope: effectiveScope,
    language: layer.language.definition.id,
  };
}
function shadowedByShallowerLayer(capture, layer, lastRange) {
  return (
    lastRange != null &&
    capture.startByte === lastRange.startByte &&
    capture.endByte === lastRange.endByte &&
    layer.depth < lastRange.depth
  );
}
function pushLocalScope(layer, capture) {
  const inheritsValue = capture.setProperties?.["local.scope-inherits"];
  layer.scopeStack.push({
    inherits: inheritsValue == null || inheritsValue === "true",
    endByte: capture.endByte,
    localDefs: [],
  });
}
function pushLocalDefinition(layer, capture, maps) {
  const definition = {
    name: decoder.decode(maps.sourceBytes.subarray(capture.startByte, capture.endByte)),
    valueEndByte: layer.localDefinitionValueEnds[capture.matchIndex],
  };
  layer.scopeStack.at(-1).localDefs.push(definition);
  return definition;
}
function nextBoundary(layer) {
  const nextStart = peekCapture(layer)?.startByte;
  const nextEnd = layer.highlightEndStack.at(-1);
  if (nextStart != null && nextEnd != null)
    return nextStart < nextEnd
      ? {
          offset: nextStart,
          isStart: true,
        }
      : {
          offset: nextEnd,
          isStart: false,
        };
  if (nextStart != null)
    return {
      offset: nextStart,
      isStart: true,
    };
  if (nextEnd != null)
    return {
      offset: nextEnd,
      isStart: false,
    };
}
function findReferenceHighlight(layer, capture, maps) {
  const name = decoder.decode(maps.sourceBytes.subarray(capture.startByte, capture.endByte));
  for (let scopeIndex = layer.scopeStack.length - 1; scopeIndex >= 0; scopeIndex -= 1) {
    const scope = layer.scopeStack[scopeIndex];
    for (let defIndex = scope.localDefs.length - 1; defIndex >= 0; defIndex -= 1) {
      const definition = scope.localDefs[defIndex];
      if (definition.name === name && capture.startByte >= definition.valueEndByte)
        return definition.highlight;
    }
    if (!scope.inherits) break;
  }
}
function peekCapture(layer) {
  while (layer.captureIndex < layer.captures.length) {
    const capture = layer.captures[layer.captureIndex];
    if (layer.removedMatches[capture.matchIndex] !== 0) {
      layer.captureIndex += 1;
      continue;
    }
    return capture;
  }
}
function precedes(candidate, candidateDepth, current, currentDepth) {
  if (candidate.offset !== current.offset) return candidate.offset < current.offset;
  if (candidate.isStart !== current.isStart) return !candidate.isStart;
  return candidateDepth > currentDepth;
}
function nextLayerBoundary(layers) {
  let layer;
  let boundary;
  for (const candidate of layers) {
    const candidateBoundary = nextBoundary(candidate);
    if (
      candidateBoundary &&
      (!boundary || !layer || precedes(candidateBoundary, candidate.depth, boundary, layer.depth))
    ) {
      layer = candidate;
      boundary = candidateBoundary;
    }
  }
  return layer && boundary
    ? {
        layer,
        boundary,
      }
    : void 0;
}
function buildNestedEvents(inputLayers, maps) {
  const events = new Coalescing();
  const layers = inputLayers.map((layer) => ({
    ...layer,
    captureIndex: 0,
    removedMatches: new Uint8Array(layer.localDefinitionValueEnds.length),
    scopeStack: [
      {
        inherits: false,
        endByte: Number.POSITIVE_INFINITY,
        localDefs: [],
      },
    ],
    highlightEndStack: [],
  }));
  let cursor = 0;
  let lastHighlightRange;
  function emitSource(endByte) {
    if (endByte > cursor) {
      events.source(cursor, endByte);
      cursor = endByte;
    }
  }
  while (true) {
    const next = nextLayerBoundary(layers);
    if (!next) break;
    const { layer, boundary } = next;
    if (!boundary.isStart) {
      layer.highlightEndStack.pop();
      emitSource(boundary.offset);
      events.end();
      continue;
    }
    const capture = consumeNextHighlight(layer, lastHighlightRange, maps);
    if (!capture) continue;
    emitSource(capture.startByte);
    events.start(capture.scope, capture.language);
    layer.highlightEndStack.push(capture.endByte);
    lastHighlightRange = {
      startByte: capture.startByte,
      endByte: capture.endByte,
      depth: layer.depth,
    };
  }
  emitSource(maps.sourceUtf8ByteLength);
  return events.finish();
}
function compileBracketConfig(language, QueryCtor, bracketsQuery) {
  if (!bracketsQuery) return void 0;
  let query;
  try {
    query = new QueryCtor(language, bracketsQuery);
  } catch {
    return;
  }
  const captureMetadata = {};
  for (const captureName of query.captureNames)
    captureMetadata[captureName] = {
      isOpen: matchesSpecialCapture(captureName, "open"),
      isClose: matchesSpecialCapture(captureName, "close"),
    };
  const rainbowExcludePatterns = Array.from({ length: query.patternCount() }, (_, patternIndex) => {
    const properties = query.setProperties[patternIndex];
    return properties != null && "rainbow.exclude" in properties;
  });
  return {
    query,
    captureMetadata,
    rainbowExcludePatterns,
  };
}
function notDeclared(what, install) {
  return /* @__PURE__ */ new Error(`${what} could not be resolved from the imported packages or working directory ${(void 0).cwd()}
  install or update ${install}, or pass its language or bundle to createHighlighter()`);
}
function notImported(what, packageName) {
  return /* @__PURE__ */ new Error(`${what} was not imported
  import ${packageName} and pass the whole package to withWasm(), updating it if it has
  no \`languagePackage\` export, or configure a resolver`);
}
async function fetchFromCdns(primary, isDefault) {
  const urls = isDefault ? CDNS.map((base) => primary.replace(CDNS[0], base)) : [primary];
  const failures = [];
  for (const url of urls)
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      failures.push(`HTTP ${response.status} ${response.statusText}`.trim());
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  throw new Error([...new Set(failures)].join("; "));
}
function createSharedRuntimeCache() {
  return {
    wasmBytes: /* @__PURE__ */ new Map(),
    wasmLoads: /* @__PURE__ */ new Map(),
    packages: /* @__PURE__ */ new Map(),
    packageLoads: /* @__PURE__ */ new Map(),
  };
}
function cacheKey(ref) {
  return `${ref.name}-${ref.version}-${ref.sha256}`;
}
function isWasmRef(wasm) {
  return "packageName" in wasm && "name" in wasm && "version" in wasm && "sha256" in wasm;
}
function isRuntimeWasmInput(wasm) {
  return !(typeof wasm === "object" && wasm !== null && isWasmRef(wasm));
}
function parseLanguagePackage(data, expectedPackageName) {
  const value = parseLanguagePackageValue(JSON.parse(decoder2.decode(data)), expectedPackageName);
  const owners = /* @__PURE__ */ new Map();
  for (const [id, language] of Object.entries(value.languages)) {
    const owner = normalizeLanguageName(id);
    if (owners.has(owner))
      throw new Error(`Invalid Lumis language package: ${expectedPackageName}`);
    owners.set(owner, owner);
    for (const alias of language.aliases) {
      const existing = owners.get(normalizeLanguageName(alias));
      if (existing !== void 0 && existing !== owner)
        throw new Error(`Invalid Lumis language package: ${expectedPackageName}`);
      owners.set(normalizeLanguageName(alias), owner);
    }
  }
  return value;
}
function invalidLanguagePackage(expectedPackageName) {
  throw new Error(`Invalid Lumis language package: ${expectedPackageName}`);
}
function requireObject(value, expectedPackageName) {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return invalidLanguagePackage(expectedPackageName);
  return value;
}
function property(value, key) {
  return Reflect.get(value, key);
}
function requireString(value, expectedPackageName) {
  return typeof value === "string" ? value : invalidLanguagePackage(expectedPackageName);
}
function optionalString(value, expectedPackageName) {
  if (value === void 0) return void 0;
  return requireString(value, expectedPackageName);
}
function optionalNullableString(value, expectedPackageName) {
  if (value === void 0 || value === null) return void 0;
  return requireString(value, expectedPackageName);
}
function requireStringArray(value, expectedPackageName) {
  if (!Array.isArray(value)) return invalidLanguagePackage(expectedPackageName);
  return value.map((entry) => requireString(entry, expectedPackageName));
}
function parsePackagedLanguage(value, expectedPackageName) {
  const language = requireObject(value, expectedPackageName);
  return {
    aliases: requireStringArray(property(language, "aliases"), expectedPackageName),
    highlights: requireString(property(language, "highlights"), expectedPackageName),
    injections: optionalString(property(language, "injections"), expectedPackageName),
    locals: optionalString(property(language, "locals"), expectedPackageName),
    brackets: optionalString(property(language, "brackets"), expectedPackageName),
  };
}
function parseLanguagePackageValue(value, expectedPackageName) {
  const packageValue = requireObject(value, expectedPackageName);
  const packageName = requireString(property(packageValue, "packageName"), expectedPackageName);
  const version = requireString(property(packageValue, "version"), expectedPackageName);
  const parserValue = requireObject(property(packageValue, "parser"), expectedPackageName);
  const parserName = requireString(property(parserValue, "name"), expectedPackageName);
  const grammarName = requireString(property(parserValue, "grammarName"), expectedPackageName);
  const parserSha256 = requireString(property(parserValue, "sha256"), expectedPackageName);
  const languagesValue = requireObject(property(packageValue, "languages"), expectedPackageName);
  if (
    !isValidPackageManifest({
      packageName,
      expectedPackageName,
      version,
      parserName,
      grammarName,
      parserSha256,
    })
  )
    return invalidLanguagePackage(expectedPackageName);
  const entries = Object.keys(languagesValue).map((id) => [
    id,
    parsePackagedLanguage(property(languagesValue, id), expectedPackageName),
  ]);
  const languages = Object.fromEntries(entries);
  Object.setPrototypeOf(languages, null);
  if (Object.keys(languages).length === 0) return invalidLanguagePackage(expectedPackageName);
  return {
    packageName,
    version,
    parser: {
      name: parserName,
      grammarName,
      upstreamVersion: optionalNullableString(
        property(parserValue, "upstreamVersion"),
        expectedPackageName,
      ),
      revision: optionalNullableString(property(parserValue, "revision"), expectedPackageName),
      sha256: parserSha256,
    },
    languages,
  };
}
function isValidPackageManifest(fields) {
  return (
    fields.packageName === fields.expectedPackageName &&
    isValidPackageName(fields.expectedPackageName) &&
    isSafePackagePathSegment(fields.version) &&
    isSafePackagePathSegment(fields.parserName) &&
    fields.grammarName.length > 0 &&
    /^[0-9a-f]{64}$/u.test(fields.parserSha256)
  );
}
function isValidPackageName(value) {
  if (value.length === 0 || encoder2.encode(value).byteLength > 214) return false;
  let segments;
  if (value.startsWith("@")) {
    const scoped = value.slice(1);
    const slash = scoped.indexOf("/");
    if (slash < 0 || scoped.includes("/", slash + 1)) return false;
    segments = [scoped.slice(0, slash), scoped.slice(slash + 1)];
  } else {
    if (value.includes("/")) return false;
    segments = [value];
  }
  return segments.every((segment) => /^[a-z0-9][a-z0-9._-]*$/u.test(segment));
}
function isSafePackagePathSegment(value) {
  const stem = value.split(".", 1)[0].replace(/[ .]+$/u, "");
  let hasForbiddenCharacter = false;
  for (let index = 0; index < value.length; index += 1)
    if (value.charCodeAt(index) <= 31 || '<>:"/\\|?*'.includes(value[index])) {
      hasForbiddenCharacter = true;
      break;
    }
  return (
    value !== "" &&
    value !== "." &&
    value !== ".." &&
    !/[ .]$/u.test(value) &&
    !hasForbiddenCharacter &&
    !/^(?:con|prn|aux|nul|clock\$|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])$/u.test(
      normalizeLanguageName(stem),
    )
  );
}
function isCompatibleLanguagePackageVersion(version) {
  return (0, import_satisfies.default)(version, LANGUAGE_PACKAGE_VERSION_RANGE);
}
function incompatiblePackageVersion(packageMetadata) {
  return /* @__PURE__ */ new Error(
    `Language package ${packageMetadata.packageName}@${packageMetadata.version} does not satisfy the supported range ${LANGUAGE_PACKAGE_VERSION_RANGE}`,
  );
}
function packagedLanguage(language, packageMetadata) {
  const requested = normalizeLanguageName(language.id);
  for (const [id, definition] of Object.entries(packageMetadata.languages))
    if (
      normalizeLanguageName(id) === requested ||
      definition.aliases.some((alias) => normalizeLanguageName(alias) === requested)
    )
      return [id, definition];
  throw new Error(
    `Language "${language.id}" is not provided by ${packageMetadata.packageName}@${packageMetadata.version}`,
  );
}
async function loadTreeSitter() {
  treeSitterPromise ??= import("./web-tree-sitter-PL55ZHCW-C4sC36Bi.js").then((module) => {
    treeSitterModule = module;
    return module;
  });
  return treeSitterPromise;
}
async function trackLoad(loads, key, promise) {
  loads.set(key, promise);
  try {
    return await promise;
  } finally {
    loads.delete(key);
  }
}
function hex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(data) {
  if (!globalThis.crypto?.subtle) return hex(sha256(data));
  return hex(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", ownedBuffer(data))));
}
function ownedBuffer(data) {
  return data.buffer instanceof ArrayBuffer &&
    data.byteOffset === 0 &&
    data.byteLength === data.buffer.byteLength
    ? data.buffer
    : data.slice().buffer;
}
async function handedParser(bytes) {
  return {
    bytes,
    digest: await sha256Hex(bytes),
  };
}
function wasmReader(bytes) {
  let offset = 0;
  const take = (length) => {
    if (offset + length > bytes.length) throw new RangeError("truncated WebAssembly module");
    offset += length;
    return bytes.subarray(offset - length, offset);
  };
  const byte = () => take(1)[0];
  const u32 = () => {
    let value = 0;
    for (let shift = 0; shift < 35; shift += 7) {
      const next = byte();
      value += (next & 127) * 2 ** shift;
      if (next < 128) return value;
    }
    throw new RangeError("malformed WebAssembly integer");
  };
  return {
    take,
    byte,
    u32,
    done: () => offset >= bytes.length,
  };
}
function exportedFunctionNames(bytes) {
  const module = wasmReader(bytes);
  if (!WASM_MAGIC.every((expected) => module.byte() === expected))
    throw new TypeError("not a WebAssembly module");
  module.take(4);
  while (!module.done()) {
    const id = module.byte();
    const section = wasmReader(module.take(module.u32()));
    if (id === EXPORT_SECTION) return functionExports(section);
  }
  return [];
}
function functionExports(section) {
  const names = [];
  for (let count = section.u32(); count > 0; count -= 1) {
    const name = decoder2.decode(section.take(section.u32()));
    const kind = section.byte();
    section.u32();
    if (kind === FUNCTION_EXPORT) names.push(name);
  }
  return names;
}
function inspectParserGrammar(data) {
  let exports;
  try {
    exports = exportedFunctionNames(data);
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  const names = exports
    .filter((name) => name.startsWith("tree_sitter_"))
    .map((name) => name.slice(12))
    .filter((name) => !name.startsWith("external_scanner_"));
  return names.length === 1
    ? {
        ok: true,
        name: names[0],
      }
    : {
        ok: false,
        detail: `expected one grammar export, got ${names.length}`,
      };
}
async function downloadParserWasm(source, languageId2, packageName) {
  const response = await fetch(source);
  if (!response.ok)
    throw parserDownloadError(
      `could not download parser WASM for ${languageId2}: HTTP ${response.status} ${response.statusText}`,
      source,
      packageName,
    );
  const data = new Uint8Array(await response.arrayBuffer());
  if (!WASM_MAGIC.every((byte, index) => data[index] === byte)) {
    const type = response.headers.get("content-type");
    throw parserDownloadError(
      `the ${languageId2} parser at ${source} is not WebAssembly: the server sent ${data.byteLength} bytes${type ? ` of ${type}` : ""}`,
      source,
      packageName,
    );
  }
  return data;
}
function parserDownloadError(message, source, packageName) {
  return new Error(
    underViteDeps(source)
      ? `${message}
  Vite 7 and older pre-bundle ${packageName} away from its parser file: add it to optimizeDeps.exclude, or upgrade to Vite 8`
      : message,
  );
}
function underViteDeps(source) {
  try {
    return /\/deps\/[^/]+\.wasm$/u.test(new URL(source, globalThis.location?.href).pathname);
  } catch {
    return false;
  }
}
function requireParserGrammar(cached, data, parser, expected) {
  cached.grammar ??= inspectParserGrammar(data);
  if (!cached.grammar.ok)
    throw new Error(`invalid parser grammar export for '${parser.name}': ${cached.grammar.detail}`);
  if (cached.grammar.name !== expected)
    throw new Error(
      `invalid parser grammar for '${parser.name}': expected '${expected}', got '${cached.grammar.name}'`,
    );
}
async function verifyWasm(ref, data) {
  const actual = await sha256Hex(data);
  if (actual !== ref.sha256)
    throw new Error(
      `Invalid WASM integrity for ${ref.name}@${ref.version}: expected sha256-${ref.sha256}, got sha256-${actual}`,
    );
  return data;
}
function matchesSpecialCapture(name, base) {
  return name === base;
}
function isNonHighlightCapture(name) {
  return (
    name.length === 0 ||
    name.startsWith("_") ||
    NON_HIGHLIGHT_CAPTURES.some((special) => matchesSpecialCapture(name, special))
  );
}
function resolveHighlightName(captureName) {
  const name = captureName.startsWith("@") ? captureName.slice(1) : captureName;
  if (isNonHighlightCapture(name)) return void 0;
  if (HIGHLIGHT_NAMES_SET.has(name)) return name;
  const captureParts = new Set(name.split("."));
  let best;
  let bestLen = 0;
  for (const recognized of HIGHLIGHT_NAMES) {
    const recognizedParts = recognized.split(".");
    if (
      recognizedParts.length > bestLen &&
      recognizedParts.every((part) => captureParts.has(part))
    ) {
      best = recognized;
      bestLen = recognizedParts.length;
    }
  }
  return best;
}
function isLuaExponent(value) {
  if (value === void 0) return true;
  const magnitude = value.replace(/^[+-]/u, "").replace(/^0+/u, "");
  return (
    magnitude.length < MAX_LUA_EXPONENT.length ||
    (magnitude.length === MAX_LUA_EXPONENT.length && magnitude <= MAX_LUA_EXPONENT)
  );
}
function parseBinaryOffset(match) {
  let value = 0;
  for (const digit of match[2]) value = value * 2 + Number(digit);
  return match[1] === "-" ? -value : value;
}
function parseHexOffset(match) {
  const exponent = { value: Number(match[3] ?? 0) };
  const mantissa = parseHexMantissa(match[2], exponent);
  const negative = match[1] === "-";
  if (mantissa.significand === 0n) return negative ? -0 : 0;
  return hexBitsToFloat(
    roundHexSignificand(
      mantissa.inexact ? mantissa.significand | 1n : mantissa.significand,
      exponent,
    ),
    exponent,
    negative,
  );
}
function parseHexMantissa(mantissa, exponent) {
  let significand = 0n;
  let seenPoint = false;
  let inexact = false;
  for (const character of mantissa) {
    if (character === ".") {
      seenPoint = true;
      continue;
    }
    const digit = BigInt(Number.parseInt(character, 16));
    if (significand >> 124n === 0n) significand = (significand << 4n) | digit;
    else {
      exponent.value += 4;
      inexact ||= digit !== 0n;
    }
    if (seenPoint) exponent.value -= 4;
  }
  return {
    significand,
    inexact,
  };
}
function roundHexSignificand(significand, exponent) {
  let roundBits = significand.toString(2).length - 1 - SIGNIFICAND_BITS;
  if (exponent.value < MINIMUM_SUBNORMAL_EXPONENT - roundBits)
    roundBits = MINIMUM_SUBNORMAL_EXPONENT - exponent.value;
  exponent.value += roundBits;
  if (roundBits < 0) return significand << BigInt(-roundBits);
  if (roundBits === 0) return significand;
  const shifted = shiftForRounding(significand, roundBits);
  const trailing = Number(shifted & 7n);
  return (shifted >> 2n) + BigInt((200 >> trailing) & 1);
}
function shiftForRounding(significand, roundBits) {
  if (roundBits === 1) return significand << 1n;
  if (roundBits <= 2) return significand;
  const shift = roundBits - 2;
  if (shift >= 128) return 1n;
  const discarded = significand & ((1n << BigInt(shift)) - 1n);
  return (significand >> BigInt(shift)) | BigInt(discarded !== 0n);
}
function hexBitsToFloat(significand, exponent, negative = false) {
  let bits = significand + (BigInt(exponent.value - MINIMUM_SUBNORMAL_EXPONENT) << 52n);
  if (bits >= INFINITY_BITS) bits = INFINITY_BITS;
  if (negative) bits |= 1n << 63n;
  const view = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
  view.setBigUint64(0, bits);
  return view.getFloat64(0);
}
function parseOffsetDelta(input) {
  const value = input.replace(/^[\t\n\v\f\r ]+/u, "").replace(/[\t\n\v\f\r ]+$/u, "");
  if (value.length === 0) return void 0;
  const binary = BINARY_OFFSET.exec(value);
  const hexadecimal = HEX_OFFSET.exec(value);
  const decimal = DECIMAL_OFFSET.exec(value);
  let parsed = NaN;
  if (binary) parsed = parseBinaryOffset(binary);
  else if (hexadecimal && isLuaExponent(hexadecimal[3])) parsed = parseHexOffset(hexadecimal);
  else if (decimal && isLuaExponent(decimal[1])) parsed = Number(value);
  return Number.isSafeInteger(parsed) ? (parsed === 0 ? 0 : parsed) : void 0;
}
function compileHighlightConfig(
  language,
  QueryCtor,
  highlightsQuery,
  injectionsQuery = "",
  localsQuery = "",
) {
  const replayCapturesFromMatches = highlightsQuery.includes("inherits: html_tags");
  const querySource = `${injectionsQuery}${localsQuery}${highlightsQuery}`;
  const localsQueryOffset = injectionsQuery.length;
  const highlightsQueryOffset = injectionsQuery.length + localsQuery.length;
  const query = new QueryCtor(language, querySource);
  let injectionPatternEnd = 0;
  let localsPatternEnd = 0;
  for (let i = 0; i < query.patternCount(); i += 1) {
    const patternOffset = query.startIndexForPattern(i);
    if (patternOffset < highlightsQueryOffset) localsPatternEnd += 1;
    if (patternOffset < localsQueryOffset) injectionPatternEnd += 1;
  }
  const captureMetadata = {};
  for (const captureName of query.captureNames)
    captureMetadata[captureName] = {
      highlightScope: resolveHighlightName(captureName),
      isInjectionContent: matchesSpecialCapture(captureName, "injection.content"),
      isInjectionLanguage: matchesSpecialCapture(captureName, "injection.language"),
      isInjectionFilename: matchesSpecialCapture(captureName, "injection.filename"),
      isLocalScope: matchesSpecialCapture(captureName, "local.scope"),
      isLocalDefinition: matchesSpecialCapture(captureName, "local.definition"),
      isLocalDefinitionValue: matchesSpecialCapture(captureName, "local.definition-value"),
      isLocalReference: matchesSpecialCapture(captureName, "local.reference"),
    };
  const nonLocalVariablePatterns = Array.from({ length: query.patternCount() }, (_, index) => {
    const refuted = query.refutedProperties[index] ?? {};
    return Object.prototype.hasOwnProperty.call(refuted, "local");
  });
  function parseOffsetDeltas(deltas) {
    const values = [0, 0, 0, 0];
    for (const [index, delta] of deltas.slice(0, values.length).entries()) {
      let value;
      if (delta.type === "capture") {
        const captureIndex = query.captureIndexForName(delta.name);
        value = captureIndex >= 0 ? captureIndex + 1 : void 0;
      } else value = parseOffsetDelta(delta.value);
      if (value === void 0) return void 0;
      values[index] = value;
    }
    return {
      startRow: values[0],
      startColumn: values[1],
      endRow: values[2],
      endColumn: values[3],
    };
  }
  const captureOffsets = Array.from({ length: query.patternCount() }, (_, patternIndex) => {
    let offsets;
    for (const predicate of query.predicatesForPattern(patternIndex) ?? []) {
      if (predicate.operator !== "offset!") continue;
      const [captureStep, ...deltas] = predicate.operands;
      if (captureStep?.type !== "capture") continue;
      const parsed = parseOffsetDeltas(deltas);
      if (!parsed) continue;
      offsets ??= {};
      offsets[captureStep.name] = parsed;
    }
    return offsets;
  });
  return {
    query,
    injectionPatternEnd,
    localsPatternEnd,
    replayCapturesFromMatches,
    captureMetadata,
    nonLocalVariablePatterns,
    captureOffsets,
  };
}
function createLanguagesModule(runtime2) {
  let configuredDefaultResolver = DEFAULT_RESOLVER;
  let configuredLanguagePackageResolver = DEFAULT_LANGUAGE_PACKAGE_RESOLVER;
  const moduleCache = createSharedRuntimeCache();
  const parserModules = /* @__PURE__ */ new Map();
  const injectable = /* @__PURE__ */ new Map();
  function shareInjectable(prepared) {
    const { id } = prepared.definition;
    const aliases = prepared.definition.aliases.filter(
      (alias) => CATALOG_LANGUAGE_IDS.get(normalizeLanguageName(alias)) === id,
    );
    const shared = {
      ...prepared,
      definition: {
        ...prepared.definition,
        aliases,
      },
    };
    for (const name of [id, ...aliases]) injectable.set(normalizeLanguageName(name), shared);
  }
  function parserModuleFor(digest) {
    let parserModule = parserModules.get(digest);
    if (!parserModule) {
      parserModule = {};
      parserModules.set(digest, parserModule);
    }
    return parserModule;
  }
  function instantiateParserSync(Language, parserModule, bytes) {
    try {
      parserModule.language = Language.loadSync(new WebAssembly.Module(ownedBuffer(bytes)));
      return parserModule.language;
    } catch (error) {
      parserModule.failure = { error };
      throw error;
    }
  }
  async function loadParserLanguage(Language, parser, packaged) {
    const parserModule = parserModuleFor(parser.digest);
    requireParserGrammar(parserModule, parser.bytes, packaged.wasm, packaged.grammarName);
    if (parserModule.language) return parserModule.language;
    if (parserModule.failure) throw parserModule.failure.error;
    if (parserModule.loading) return parserModule.loading;
    if (parser.bytes.byteLength <= SYNC_INSTANTIATE_LIMIT)
      return instantiateParserSync(Language, parserModule, parser.bytes);
    parserModule.loading = Language.load(parser.bytes).then(
      (language) => {
        parserModule.language = language;
        return language;
      },
      (error) => {
        parserModule.failure = { error };
        throw error;
      },
    );
    return parserModule.loading;
  }
  class HighlighterRuntime {
    explicitResolver;
    explicitLanguagePackageResolver;
    sharedCache;
    loadedLanguages = /* @__PURE__ */ new Map();
    aliasMap = /* @__PURE__ */ new Map();
    languageLoads = /* @__PURE__ */ new Map();
    bracketCompilers = /* @__PURE__ */ new WeakMap();
    constructor(options = {}) {
      this.explicitResolver = options.wasmResolver;
      this.explicitLanguagePackageResolver = options.languagePackageResolver;
      this.sharedCache = options.sharedCache ?? moduleCache;
      for (const alias of PLAINTEXT_ALIASES)
        this.aliasMap.set(normalizeLanguageName(alias), PLAINTEXT_LANG_ID);
    }
    get resolver() {
      return this.explicitResolver ?? configuredDefaultResolver;
    }
    get languagePackageResolver() {
      return this.explicitLanguagePackageResolver ?? configuredLanguagePackageResolver;
    }
    /** Whether the caller supplied either resolver, and so said where parsers come from. */
    get callerResolved() {
      return (
        this.resolver !== DEFAULT_RESOLVER ||
        this.languagePackageResolver !== DEFAULT_LANGUAGE_PACKAGE_RESOLVER
      );
    }
    acceptsPackage(packageMetadata) {
      return isCompatibleLanguagePackageVersion(packageMetadata.version);
    }
    /**
     * The language package an imported package carries, checked the way one
     * read from disk or a resolver is. It is the package's own, so nothing is
     * resolved.
     */
    importedPackage(languagePackage, packageName) {
      const packageMetadata = parseLanguagePackage(
        encoder2.encode(JSON.stringify(languagePackage)),
        packageName,
      );
      if (!this.acceptsPackage(packageMetadata)) throw incompatiblePackageVersion(packageMetadata);
      return packageMetadata;
    }
    /**
     * The manifest an installed `@lumis-sh/wasm-*` package ships, if one is.
     *
     * Resolved through the package's `./lumis.json` export rather than read off
     * its default export: in Node that entry point *is* the parser bytes, so
     * there was never a URL there to derive a path from. The export map is what
     * the package actually publishes the manifest under.
     */
    async loadInstalledLanguagePackage(packageName) {
      const resolved = await runtime2.resolveInstalledManifest?.(packageName);
      if (!resolved) return void 0;
      const bytes = await runtime2.readResolvedWasmFromDisk(resolved);
      if (!bytes) return void 0;
      try {
        return parseLanguagePackage(bytes, packageName);
      } catch {
        return;
      }
    }
    async fetchLanguagePackage(packageName) {
      const resolver = this.languagePackageResolver;
      const source = resolver(packageName, LANGUAGE_PACKAGE_VERSION_RANGE);
      const disk = await runtime2.readResolvedWasmFromDisk(source);
      if (disk) {
        const packageMetadata2 = parseLanguagePackage(disk, packageName);
        if (this.acceptsPackage(packageMetadata2)) return packageMetadata2;
        throw incompatiblePackageVersion(packageMetadata2);
      }
      const response = await fetchFromCdns(
        typeof source === "string" ? source : source.href,
        resolver === DEFAULT_LANGUAGE_PACKAGE_RESOLVER,
      ).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`could not download language package ${packageName}: ${message}`);
      });
      const packageMetadata = parseLanguagePackage(
        new Uint8Array(await response.arrayBuffer()),
        packageName,
      );
      if (!this.acceptsPackage(packageMetadata)) throw incompatiblePackageVersion(packageMetadata);
      return packageMetadata;
    }
    async resolvePackage(packageName) {
      if (this.languagePackageResolver !== DEFAULT_LANGUAGE_PACKAGE_RESOLVER)
        return this.fetchLanguagePackage(packageName);
      const memory = this.sharedCache.packages.get(packageName);
      if (memory) return memory;
      const inFlight = this.sharedCache.packageLoads.get(packageName);
      if (inFlight) return inFlight;
      const load2 = (async () => {
        if (!runtime2.resolveInstalledManifest) throw notImported(packageName, packageName);
        const installed = await this.loadInstalledLanguagePackage(packageName);
        if (!installed) throw notDeclared(packageName, packageName);
        if (!this.acceptsPackage(installed)) throw incompatiblePackageVersion(installed);
        return installed;
      })().then((value) => {
        this.sharedCache.packages.set(packageName, value);
        return value;
      });
      return trackLoad(this.sharedCache.packageLoads, packageName, load2);
    }
    async readVerifiedCache(ref, key) {
      const fsCached = await runtime2.readFsCache(key);
      if (fsCached)
        try {
          return await verifyWasm(ref, fsCached);
        } catch {}
    }
    /**
     * The parser beside the manifest a project installed, which is what the
     * native addon reads, when that manifest names these bytes. An `import()`
     * from here would resolve from Lumis's own directory, and under pnpm that
     * is not where the project's packages are.
     */
    async readInstalledParser(ref) {
      const manifest = await runtime2.resolveInstalledManifest?.(ref.packageName);
      if (!manifest) return void 0;
      try {
        const installed = await runtime2.readResolvedWasmFromDisk(manifest);
        if (
          !installed ||
          parseLanguagePackage(installed, ref.packageName).parser.sha256 !== ref.sha256
        )
          return;
        return await runtime2.readResolvedWasmFromDisk(new URL(`${ref.name}.wasm`, manifest));
      } catch {
        return;
      }
    }
    async fetchResolvedWasm(language, ref) {
      const url = this.resolver(language, ref);
      const diskData = await runtime2.readResolvedWasmFromDisk(url);
      if (diskData) return diskData;
      if (!this.callerResolved) {
        const what = `${ref.name}@${ref.version}`;
        throw runtime2.resolveInstalledManifest
          ? notDeclared(what, ref.packageName)
          : notImported(what, ref.packageName);
      }
      const response = await fetchFromCdns(
        typeof url === "string" ? url : url.href,
        this.resolver === DEFAULT_RESOLVER,
      ).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`could not download parser WASM ${ref.name}@${ref.version}: ${message}`);
      });
      return new Uint8Array(await response.arrayBuffer());
    }
    async loadWasmBytes(language, ref, key) {
      if (this.resolver === DEFAULT_RESOLVER) {
        const installed = await this.readInstalledParser(ref);
        if (installed) return installed;
      }
      const fsCached = await this.readVerifiedCache(ref, key);
      if (fsCached) return fsCached;
      return runtime2.withFsCacheLock(key, async () => {
        const lockedCache = await this.readVerifiedCache(ref, key);
        if (lockedCache) return lockedCache;
        const data = await verifyWasm(ref, await this.fetchResolvedWasm(language, ref));
        await runtime2.writeFsCache(key, data);
        return data;
      });
    }
    async readParserWasm(resolved, packaged, requestedId) {
      const { wasm } = resolved;
      if (typeof wasm === "object" && isWasmRef(wasm))
        return {
          bytes: await this.resolveParserWasm(resolved.definition.id, wasm),
          digest: wasm.sha256,
        };
      if (!isRuntimeWasmInput(wasm))
        throw new Error(`Unsupported WASM input for language "${requestedId}"`);
      const source = await runtime2.resolveWasm(wasm);
      if (source instanceof Uint8Array) return handedParser(source);
      const disk = await runtime2.readResolvedWasmFromDisk(source);
      if (disk) return handedParser(disk);
      return {
        bytes: await verifyWasm(
          packaged,
          await downloadParserWasm(source, resolved.definition.id, packaged.packageName),
        ),
        digest: packaged.sha256,
      };
    }
    async resolveImportedLanguage(opts) {
      return !this.callerResolved &&
        opts.languagePackage !== void 0 &&
        opts.packageName !== void 0 &&
        LANGUAGE_PACKAGES[normalizeLanguageName(opts.definition.id)] === opts.packageName &&
        Boolean(await runtime2.resolveInstalledManifest?.(opts.packageName))
        ? {
            definition: opts.definition,
            packageName: opts.packageName,
          }
        : opts;
    }
    /**
     * Everything asynchronous about loading a language: its package resolved,
     * its parser read and instantiated. What is left, {@link finishLanguage},
     * is synchronous.
     */
    async prepareLanguage(input) {
      await this.initParser();
      const opts = await this.resolveImportedLanguage(input);
      if (!opts.packageName) throw new Error(`Language "${opts.definition.id}" has no packageName`);
      const packaged = await this.resolveLanguagePackage(
        opts.definition,
        opts.packageName,
        opts.languagePackage,
      );
      const resolved = {
        ...packaged,
        ...(opts.wasm === void 0 ? {} : { wasm: opts.wasm }),
      };
      if (!resolved.wasm || resolved.highlights === void 0)
        throw new Error(`Language package "${opts.packageName}" has no parser or highlights query`);
      const parserWasm = await this.readParserWasm(resolved, packaged.wasm, opts.definition.id);
      const { Language } = await loadTreeSitter();
      await loadParserLanguage(Language, parserWasm, packaged);
      return {
        definition: packaged.definition,
        digest: parserWasm.digest,
        resolved: packaged,
      };
    }
    /**
     * Whether a prepared language is its catalog package's own parser, reached
     * without a caller's resolver, so any runtime that also uses no resolver of
     * its own would have loaded exactly this.
     */
    isCanonicalParser({ definition, digest, resolved }) {
      return (
        !this.callerResolved &&
        digest === resolved.wasm.sha256 &&
        LANGUAGE_PACKAGES[normalizeLanguageName(definition.id)] === resolved.wasm.packageName
      );
    }
    finishLanguage(prepared, { Parser, Query }) {
      const existing = this.loadedLanguages.get(prepared.definition.id);
      if (existing) return existing;
      const language = parserModules.get(prepared.digest)?.language;
      if (!language) throw new Error(`Parser for "${prepared.definition.id}" is not instantiated`);
      const { resolved } = prepared;
      const config = compileHighlightConfig(
        language,
        Query,
        resolved.highlights,
        resolved.injections,
        resolved.locals,
      );
      let parser;
      try {
        parser = new Parser();
        parser.setLanguage(language);
      } catch (error) {
        config.query.delete();
        parser?.delete();
        throw error;
      }
      const loaded = {
        kind: "wasm",
        definition: prepared.definition,
        parser,
        language,
        config,
      };
      if (resolved.brackets)
        this.bracketCompilers.set(loaded, () =>
          compileBracketConfig(language, Query, resolved.brackets),
        );
      this.loadedLanguages.set(prepared.definition.id, loaded);
      this.registerLanguage(prepared.definition);
      return loaded;
    }
    async createLoadedLanguage(input) {
      const prepared = await this.prepareLanguage(input);
      const loaded = this.finishLanguage(prepared, await loadTreeSitter());
      if (this.isCanonicalParser(prepared)) shareInjectable(prepared);
      return loaded;
    }
    /**
     * An injected language this runtime has not loaded, made ready inside the
     * walk when another runtime in this realm already prepared its canonical
     * parser. Fetching is the only asynchronous step, so once the bytes are
     * here nothing has to wait.
     */
    loadInjectedLanguage(nameOrAlias) {
      if (this.callerResolved || !treeSitterModule) return void 0;
      const prepared = injectable.get(normalizeLanguageName(nameOrAlias));
      if (!prepared) return void 0;
      try {
        return this.finishLanguage(prepared, treeSitterModule);
      } catch {
        return;
      }
    }
    configureWasmResolver(fn) {
      this.explicitResolver = fn;
    }
    configureLanguagePackageResolver(fn) {
      this.explicitLanguagePackageResolver = fn;
    }
    async resolveLanguagePackage(language, packageName, languagePackage) {
      const packageMetadata = languagePackage
        ? this.importedPackage(languagePackage, packageName)
        : await this.resolvePackage(packageName);
      const [id, packaged] = packagedLanguage(language, packageMetadata);
      return {
        definition: {
          id,
          aliases: packaged.aliases,
        },
        wasm: {
          packageName: packageMetadata.packageName,
          name: packageMetadata.parser.name,
          version: packageMetadata.version,
          sha256: packageMetadata.parser.sha256,
        },
        grammarName: packageMetadata.parser.grammarName,
        highlights: packaged.highlights,
        injections: packaged.injections,
        locals: packaged.locals,
        brackets: packaged.brackets,
      };
    }
    registerPackageRoot(source) {
      runtime2.registerPackageRoot?.(source);
      return Promise.resolve();
    }
    async initParser() {
      this.sharedCache.parserInit ??= Promise.all([
        loadTreeSitter(),
        runtime2.parserInitOptions?.() ?? Promise.resolve(void 0),
      ]).then(([treeSitter, initOptions]) => treeSitter.Parser.init(initOptions));
      await this.sharedCache.parserInit;
    }
    registerLanguage(def) {
      this.aliasMap.set(normalizeLanguageName(def.id), def.id);
      for (const alias of def.aliases) this.aliasMap.set(normalizeLanguageName(alias), def.id);
    }
    resolveLanguageId(nameOrAlias) {
      return this.aliasMap.get(normalizeLanguageName(nameOrAlias)) ?? nameOrAlias;
    }
    getLoadedLanguage(nameOrAlias) {
      const id = this.resolveLanguageId(nameOrAlias);
      return this.loadedLanguages.get(id);
    }
    getLoadedLanguageIds() {
      return [...this.loadedLanguages.keys()];
    }
    async resolveParserWasm(language, ref) {
      const key = cacheKey(ref);
      const cached = this.sharedCache.wasmBytes.get(key);
      if (cached) return cached;
      const existingLoad = this.sharedCache.wasmLoads.get(key);
      if (existingLoad) return existingLoad;
      const load2 = this.loadWasmBytes(language, ref, key).then((data) => {
        this.sharedCache.wasmBytes.set(key, data);
        return data;
      });
      return trackLoad(this.sharedCache.wasmLoads, key, load2);
    }
    async loadLanguage(opts) {
      if (opts.definition.id === "plaintext") return this.createPlaintext(opts.definition);
      const existing = this.getLoadedLanguage(opts.definition.id);
      if (existing) return existing;
      const loadKey = normalizeLanguageName(opts.definition.id);
      const inFlight = this.languageLoads.get(loadKey);
      if (inFlight) return inFlight;
      return trackLoad(this.languageLoads, loadKey, this.createLoadedLanguage(opts));
    }
    async loadPlaintext() {
      return this.createPlaintext({
        id: PLAINTEXT_LANG_ID,
        aliases: PLAINTEXT_ALIASES,
      });
    }
    createPlaintext(definition) {
      const existing = this.loadedLanguages.get(PLAINTEXT_LANG_ID);
      if (existing) return existing;
      const loaded = {
        kind: "plaintext",
        definition,
      };
      this.loadedLanguages.set(PLAINTEXT_LANG_ID, loaded);
      this.registerLanguage(definition);
      return loaded;
    }
    highlightEvents(source, language, options = {}, report) {
      if (language.kind === "plaintext")
        return [
          {
            type: "source",
            start: 0,
            end: encoder2.encode(source).byteLength,
          },
        ];
      if (language.kind === "native")
        throw new Error("Native languages cannot be highlighted by the WebAssembly runtime");
      if (options.rainbowBrackets && !language.brackets) {
        const compile = this.bracketCompilers.get(language);
        if (compile) {
          this.bracketCompilers.delete(language);
          language.brackets = compile();
        }
      }
      const built = buildHighlightEventsWithSourceIndex(source, language, this, options);
      if (report) report.budget = built.budget;
      return built.events;
    }
  }
  const defaultRuntime = new HighlighterRuntime();
  return {
    createRuntime(options = {}) {
      return new HighlighterRuntime(options);
    },
    configureWasmResolver(fn) {
      configuredDefaultResolver = fn;
      defaultRuntime.configureWasmResolver(fn);
    },
    configureLanguagePackageResolver(fn) {
      configuredLanguagePackageResolver = fn;
      defaultRuntime.configureLanguagePackageResolver(fn);
    },
    initParser() {
      return defaultRuntime.initParser();
    },
    registerLanguage(def) {
      defaultRuntime.registerLanguage(def);
    },
    resolveLanguageId(nameOrAlias) {
      return defaultRuntime.resolveLanguageId(nameOrAlias);
    },
    loadLanguage(opts) {
      return defaultRuntime.loadLanguage(opts);
    },
    resolveLanguagePackage(language, packageName, manifest) {
      return defaultRuntime.resolveLanguagePackage(language, packageName, manifest);
    },
    resolveParserWasm(language, wasm) {
      return defaultRuntime.resolveParserWasm(language, wasm);
    },
    loadPlaintext() {
      return defaultRuntime.loadPlaintext();
    },
    getLoadedLanguage(nameOrAlias) {
      return defaultRuntime.getLoadedLanguage(nameOrAlias);
    },
    getLoadedLanguageIds() {
      return defaultRuntime.getLoadedLanguageIds();
    },
    availableLanguages() {
      return LANGUAGES.map((language) => cloneLanguageInfo(language));
    },
    getDefaultRuntime() {
      return defaultRuntime;
    },
  };
}
function languageId$1(language) {
  return typeof language === "string" ? language : language.id;
}
function getThemeStyle$1(theme, scope) {
  if (!theme) return RAINBOW_BRACKET_FALLBACKS$1[scope];
  let current = scope;
  while (current.length > 0) {
    const style = theme.highlights[current];
    if (style) return style;
    const fallback = RAINBOW_BRACKET_FALLBACKS$1[current];
    if (fallback) return fallback;
    const idx = current.lastIndexOf(".");
    if (idx === -1) break;
    current = current.slice(0, idx);
  }
}
function getScopedThemeStyle$1(theme, scope, language) {
  if (language === void 0) return getThemeStyle$1(theme, scope);
  return (
    getThemeStyle$1(theme, `${scope}.${languageId$1(language)}`) ?? getThemeStyle$1(theme, scope)
  );
}
function inheritStyle(style, parent) {
  return {
    fg: style.fg ?? parent.fg,
    bg: style.bg ?? parent.bg,
    bold: style.bold ? true : parent.bold,
    italic: style.italic ? true : parent.italic,
    underline: style.underline === false ? parent.underline : (style.underline ?? parent.underline),
    strikethrough: style.strikethrough ? true : parent.strikethrough,
  };
}
function resolveStackStyle(theme, scopes) {
  let resolved;
  for (const { scope, language } of scopes) {
    const style = getScopedThemeStyle$1(theme, scope, language);
    if (!style) continue;
    resolved = resolved ? inheritStyle(style, resolved) : style;
  }
  return resolved;
}
function getBuiltinFormatter(formatter) {
  return builtins$1.get(formatter);
}
function builtinFormatterKind(formatter) {
  return getBuiltinFormatter(formatter)?.kind;
}
function decodeSlice(sourceBytes, startByte, endByte) {
  return decoder3.decode(sourceBytes.subarray(startByte, endByte));
}
async function loadLanguageDefinition(runtime2, language) {
  if (language.languagePackage && language.wasm instanceof URL)
    await runtime2.registerPackageRoot?.(language.wasm);
  for (const required of language.requires ?? []) await loadLanguageDefinition(runtime2, required);
  await runtime2.loadLanguage({
    definition: {
      id: language.id,
      aliases: language.aliases,
    },
    packageName: language.packageName,
    wasm: language.wasm,
    languagePackage: language.languagePackage,
  });
}
function resolveRefId(ref) {
  if (!ref) return PLAINTEXT_LANG_ID;
  if (typeof ref === "string") return ref;
  return ref.id;
}
function isPlaintextRef(ref) {
  return normalizeLanguageName(resolveRefId(ref)) === PLAINTEXT_LANG_ID;
}
function detectLanguageRef(source, ref) {
  if (ref && typeof ref !== "string") {
    validateLanguageBoundary(ref);
    return ref;
  }
  return guessLanguage(ref, source);
}
async function loadBuiltinLanguageById(id) {
  const loader = LANGUAGE_LOADERS[normalizeLanguageName(id)];
  if (!loader) return;
  return requireLoadableLanguage((await loader()).default, `Built-in language "${id}"`);
}
async function ensureLanguageLoaded(runtime2, ref, lazyRegistry) {
  validateLanguageBoundary(ref);
  if (isPlaintextRef(ref)) {
    await runtime2.loadPlaintext();
    return;
  }
  if (typeof ref !== "string") {
    if (!runtime2.getLoadedLanguage(ref.id)) await loadLanguageRef(runtime2, ref);
    return;
  }
  const languageId2 = ref;
  if (runtime2.getLoadedLanguage(languageId2)) return;
  const builtin = await loadBuiltinLanguageById(languageId2);
  if (builtin) await loadLanguageDefinition(runtime2, builtin);
}
async function loadLanguageRef(runtime2, ref, lazyRegistry) {
  if (isLanguage(ref)) await loadLanguageDefinition(runtime2, ref);
  else if (isLazyLanguage(ref))
    await loadLanguageDefinition(
      runtime2,
      requireLoadableLanguage(await ref(), `Lazy language "${ref.id}"`),
    );
  else await ensureLanguageLoaded(runtime2, ref.id);
}
function resolveLoadedLanguage(runtime2, ref) {
  const languageId2 = resolveRefId(ref);
  const loaded = runtime2.getLoadedLanguage(languageId2);
  if (!loaded) {
    if (languageId2 === "plaintext")
      throw new Error(
        `Language "${languageId2}" is not loaded. Load the plaintext bundle before using omitted/plaintext sync highlighting.`,
      );
    throw new Error(
      `Language "${languageId2}" is not loaded. Pass it to createHighlighter({ languages: [...] }) or call hl.loadLanguage(bundle).`,
    );
  }
  return loaded;
}
function applyIteratorLayerEvent(event, scopeStack, decorations, language) {
  switch (event.type) {
    case "start":
      scopeStack.push({
        scope: event.scope,
        language: event.language,
      });
      break;
    case "end":
      scopeStack.pop();
      break;
    case "decorationStart":
      decorations.push(event.decoration);
      if (event.decoration.type !== "line")
        scopeStack.push({
          scope: decorationScope$1(event.decoration),
          language,
        });
      break;
    case "decorationEnd": {
      const decoration = decorations.pop();
      if (decoration !== void 0 && decoration.type !== "line") scopeStack.pop();
      break;
    }
  }
}
function runHighlightIter(runtime2, source, language, theme, onToken, options = {}) {
  const loaded = resolveLoadedLanguage(runtime2, language);
  const events = runtime2.highlightEvents(source, loaded, {
    rainbowBrackets: options.rainbowBrackets,
    wordDiff: options.wordDiff,
    budget: options.budget,
  });
  const bytes = buildSourceIndex(source).sourceBytes;
  const scopeStack = [];
  const decorations = [];
  for (const event of events)
    if (event.type === "source")
      emitToken(event, scopeStack, bytes, theme, loaded.definition.id, onToken);
    else applyIteratorLayerEvent(event, scopeStack, decorations, loaded.definition.id);
}
function emitToken(event, scopeStack, bytes, theme, documentLanguage, onToken) {
  const active = scopeStack.at(-1);
  const scope = active?.scope ?? "";
  const tokenLanguage = active?.language ?? documentLanguage;
  onToken(
    decodeSlice(bytes, event.start, event.end),
    tokenLanguage,
    {
      start: event.start,
      end: event.end,
    },
    scope,
    resolveStackStyle(theme, scopeStack),
  );
}
function runHighlightEvents(runtime2, source, language, options = {}, report) {
  const loaded = resolveLoadedLanguage(runtime2, language);
  const events = runtime2.highlightEvents(
    source,
    loaded,
    {
      rainbowBrackets: options.rainbowBrackets,
      wordDiff: options.wordDiff,
      budget: options.budget,
    },
    report,
  );
  const annotations = options.annotations ?? [];
  if (annotations.length === 0) return events;
  return composeAnnotations(events, annotations, buildSourceIndex(source));
}
function runFormatter(runtime2, source, fmt, detectedRef, options) {
  const loaded = resolveLoadedLanguage(runtime2, detectedRef);
  if (builtinFormatterKind(fmt)) {
    const nativeOutput = runtime2.format?.(source, loaded, fmt, options);
    if (nativeOutput !== void 0) return nativeOutput;
  }
  const report = {};
  const events = runHighlightEvents(runtime2, source, detectedRef, options, report);
  const prevRuntime = currentRuntime;
  const prevLanguage = fmt.language;
  currentRuntime = runtime2;
  fmt.language = detectedRef;
  try {
    return fmt.render(source, events, report.budget);
  } finally {
    fmt.language = prevLanguage;
    currentRuntime = prevRuntime;
  }
}
async function runFormatterAsync(runtime2, source, fmt, detectedRef, options) {
  const loaded = resolveLoadedLanguage(runtime2, detectedRef);
  if (builtinFormatterKind(fmt)) {
    const nativeOutput = await runtime2.formatAsync?.(source, loaded, fmt, options);
    if (nativeOutput !== void 0) return nativeOutput;
  }
  return runFormatter(runtime2, source, fmt, detectedRef, options);
}
function isObjectLike(value) {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}
function isLanguageLike(value) {
  return isObjectLike(value) && LANGUAGE_SHAPE_FIELDS.some((field) => field in value);
}
function isLanguageDefinition(value) {
  if (!isObjectLike(value) || !("id" in value) || !("aliases" in value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    Array.isArray(value.aliases) &&
    value.aliases.every((alias) => typeof alias === "string")
  );
}
function hasLanguageLoadFields(value) {
  return LANGUAGE_LOAD_FIELDS.some((field) => field in value);
}
function hasLoadableLanguageShape(candidate) {
  if (candidate.id === "plaintext") return !hasLanguageLoadFields(candidate);
  return (
    typeof candidate.packageName === "string" &&
    candidate.packageName.length > 0 &&
    !LANGUAGE_QUERY_FIELDS.some((field) => field in candidate)
  );
}
function malformedLanguageDefinition() {
  return /* @__PURE__ */ new Error(
    'Language definition has an invalid or missing "id" or "aliases".',
  );
}
function incompleteLanguageDefinition(id) {
  return /* @__PURE__ */ new Error(
    `Language "${id}" has an incomplete or conflicting load definition.`,
  );
}
function parserUrlGivenAsLanguage(url) {
  return /* @__PURE__ */ new Error(
    `Expected a language but got the URL ${url.href}. Older @lumis-sh/wasm-* packages export their parser's URL instead of the language; update the package it came from.`,
  );
}
function validateLanguageBoundary(value) {
  if (value instanceof URL) throw parserUrlGivenAsLanguage(value);
  if (!isLanguageLike(value)) return;
  if (!isLanguageDefinition(value)) throw malformedLanguageDefinition();
  for (const field of LANGUAGE_QUERY_FIELDS) {
    const query = Reflect.get(value, field);
    if (field in value && typeof query !== "string") throw incompleteLanguageDefinition(value.id);
  }
  if (hasLanguageLoadFields(value) && !hasLoadableLanguageShape(value))
    throw incompleteLanguageDefinition(value.id);
}
function isLanguage(value) {
  validateLanguageBoundary(value);
  return (
    typeof value === "object" &&
    value !== null &&
    isLanguageDefinition(value) &&
    hasLoadableLanguageShape(value)
  );
}
function requireLoadableLanguage(value, source) {
  validateLanguageBoundary(value);
  if (isLanguage(value)) return value;
  if (isLanguageDefinition(value)) throw incompleteLanguageDefinition(value.id);
  throw new Error(`${source} did not return a complete language definition.`);
}
function isLazyLanguage(value) {
  if (typeof value !== "function") return false;
  validateLanguageBoundary(value);
  return isLanguageDefinition(value);
}
function isLanguageBundle(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  if (LANGUAGE_SHAPE_FIELDS.some((field) => field in value) || "default" in value) return false;
  const entries = Object.entries(value);
  return entries.length > 0 && entries.every(([id, lazy]) => id.length > 0 && isLazyLanguage(lazy));
}
async function resolveInitialLanguage(input, lazyRegistry) {
  validateLanguageBoundary(input);
  if (isLanguage(input)) return input;
  if (isLazyLanguage(input))
    return requireLoadableLanguage(await input(), `Lazy language "${input.id}"`);
  if (isLanguageDefinition(input)) return resolveDefinition(input, lazyRegistry);
  if (isLanguageBundle(input)) {
    registerBundleLazily(input, lazyRegistry);
    return;
  }
  if (typeof input === "function")
    return requireLoadableLanguage((await input()).default, "Lazy language import");
  return requireLoadableLanguage((await input).default, "Language import");
}
async function resolveDefinition(input, lazyRegistry) {
  const lazy = lazyRegistry.get(normalizeLanguageName(input.id));
  if (lazy) return requireLoadableLanguage(await lazy(), `Lazy language "${lazy.id}"`);
  const builtin = await loadBuiltinLanguageById(input.id);
  if (builtin) return builtin;
  throw new Error(`Unknown language "${input.id}"`);
}
function registerBundleLazily(input, lazyRegistry) {
  for (const [id, lazy] of Object.entries(input)) {
    const key = normalizeLanguageName(id);
    if (lazyRegistry.has(key)) continue;
    lazyRegistry.set(key, lazy);
    for (const alias of lazy.aliases) lazyRegistry.set(normalizeLanguageName(alias), lazy);
  }
}
function registerLazyBundle(bundle, lazyRegistry) {
  for (const [id, lazy] of Object.entries(bundle)) {
    validateLanguageBoundary(lazy);
    const key = normalizeLanguageName(id);
    if (lazyRegistry.has(key)) continue;
    lazyRegistry.set(key, lazy);
    for (const alias of lazy.aliases) lazyRegistry.set(normalizeLanguageName(alias), lazy);
  }
}
async function loadHighlighterLanguage(input, runtime2, lazyRegistry) {
  validateLanguageBoundary(input);
  const id = typeof input === "string" ? input : input.id;
  if (runtime2.getLoadedLanguage(id)) return;
  if (isLanguage(input)) {
    await loadLanguageDefinition(runtime2, input);
    return;
  }
  if (typeof input === "string") {
    const lazy = lazyRegistry.get(normalizeLanguageName(input));
    if (lazy) {
      await loadLanguageDefinition(
        runtime2,
        requireLoadableLanguage(await lazy(), `Lazy language "${lazy.id}"`),
      );
      return;
    }
    const builtin = await loadBuiltinLanguageById(input);
    if (!builtin) throw new Error(`Unknown language "${input}"`);
    await loadLanguageDefinition(runtime2, builtin);
    return;
  }
  if (isLazyLanguage(input)) {
    await loadLanguageDefinition(
      runtime2,
      requireLoadableLanguage(await input(), `Lazy language "${input.id}"`),
    );
    return;
  }
  await loadHighlighterLanguage(input.id, runtime2, lazyRegistry);
}
function getRegisteredLanguageIds(runtime2, lazyRegistry) {
  return [.../* @__PURE__ */ new Set([...runtime2.getLoadedLanguageIds(), ...lazyRegistry.keys()])];
}
async function loadInitialLanguages(inputs, runtime2, lazyRegistry) {
  const eagerDefinitions = [];
  for (const input of inputs) {
    if (isLanguageBundle(input)) {
      const source = Reflect.get(input, /* @__PURE__ */ Symbol.for("@lumis-sh/package-url"));
      if (typeof source === "string") await runtime2.registerPackageRoot?.(new URL(source));
      registerLazyBundle(input, lazyRegistry);
      continue;
    }
    eagerDefinitions.push(resolveInitialLanguage(input, lazyRegistry));
  }
  const languages = (await Promise.all(eagerDefinitions)).filter((language) => language !== void 0);
  for (const language of languages)
    runtime2.registerLanguage({
      id: language.id,
      aliases: language.aliases,
    });
  await Promise.all([
    runtime2.loadPlaintext(),
    ...languages.map((language) => loadLanguageDefinition(runtime2, language)),
  ]);
}
async function prepareRuntimeHighlight(runtime2, source, language) {
  await runtime2.initParser();
  const detectedRef = detectLanguageRef(source, language);
  await ensureLanguageLoaded(runtime2, detectedRef);
  return detectedRef;
}
function createHighlighterModule(factory) {
  return {
    async createHighlighter(init = {}) {
      const runtime2 = factory.createRuntime({
        wasmResolver: init.wasmResolver,
        languagePackageResolver: init.languagePackageResolver,
      });
      await runtime2.initParser();
      const lazyRegistry = /* @__PURE__ */ new Map();
      await loadInitialLanguages(init.languages ?? [], runtime2, lazyRegistry);
      return {
        highlight: (source, fmt, options = {}) => {
          const detectedRef = detectLanguageRef(source, fmt.language);
          return runFormatter(runtime2, source, fmt, detectedRef, options);
        },
        highlightIter: (source, language, theme, onToken, options) => {
          runHighlightIter(
            runtime2,
            source,
            detectLanguageRef(source, language),
            theme,
            onToken,
            options,
          );
        },
        async loadLanguage(input) {
          await loadHighlighterLanguage(input, runtime2, lazyRegistry);
        },
        get languages() {
          return runtime2.getLoadedLanguageIds();
        },
        get registeredLanguages() {
          return getRegisteredLanguageIds(runtime2, lazyRegistry);
        },
      };
    },
    async highlight(source, fmt, options = {}) {
      const runtime2 = factory.getDefaultRuntime();
      return runFormatterAsync(
        runtime2,
        source,
        fmt,
        await prepareRuntimeHighlight(runtime2, source, fmt.language),
        options,
      );
    },
  };
}
function bundleMembers(name) {
  const lower = name.toLowerCase();
  if (!lower.startsWith("bundle-") && !lower.startsWith("bundle_")) return void 0;
  return BUNDLES[lower.slice(7).replaceAll("_", "-")];
}
function expandBundles(names) {
  const expanded = [];
  for (const name of names) {
    const members = bundleMembers(name);
    if (members) {
      expanded.push(...members);
      continue;
    }
    const lower = name.toLowerCase();
    if (lower.startsWith("bundle-") || lower.startsWith("bundle_"))
      throw new Error(`Unknown bundle "${name}"`);
    expanded.push(name);
  }
  return [...new Set(expanded)];
}
async function resolveLanguage(name) {
  const normalized = name.toLowerCase();
  const loader = LANGUAGE_LOADERS[EXACT_LANGUAGE_MAP[normalized] ?? normalized];
  if (!loader) throw new Error(`Unknown language "${name}"`);
  return (await loader()).default;
}
function createLoadLanguages(loadLanguage2) {
  return async function loadLanguages(names) {
    const failures = [];
    const wanted = [];
    for (const name of names)
      try {
        wanted.push(...expandBundles([name]));
      } catch (error) {
        failures.push(new Error(`could not load "${name}"`, { cause: error }));
      }
    const unique = [...new Set(wanted)];
    const settled = await Promise.allSettled(
      unique.map(async (name) => {
        const language = await resolveLanguage(name);
        await loadLanguageDefinition({ loadLanguage: loadLanguage2 }, language);
        return language.id;
      }),
    );
    const loaded = [];
    for (const [index, result] of settled.entries())
      if (result.status === "fulfilled") loaded.push(result.value);
      else failures.push(new Error(`could not load "${unique[index]}"`, { cause: result.reason }));
    if (failures.length > 0)
      throw new AggregateError(
        failures,
        `could not load ${failures.length} of ${failures.length + loaded.length} languages`,
      );
    return [...new Set(loaded)];
  };
}
function cacheRequest(key) {
  const origin = globalThis.location?.origin ?? "https://lumis.invalid";
  return new Request(`${origin}/.lumis-cache/${encodeURIComponent(key)}`);
}
function openWasmCache() {
  if (!("caches" in globalThis)) return Promise.resolve(void 0);
  return (wasmCache ??= globalThis.caches.open(WASM_CACHE_NAME).catch(() => void 0));
}
function prefersIndexedDb() {
  if (indexedDbPreferred !== void 0) return indexedDbPreferred;
  const userAgent = globalThis.navigator?.userAgent ?? "";
  indexedDbPreferred =
    /\bSafari\//u.test(userAgent) && !/\b(?:Chrome|Chromium|CriOS|Edg|OPR)\//u.test(userAgent);
  return indexedDbPreferred;
}
async function openWasmDatabase() {
  if (!("indexedDB" in globalThis)) return void 0;
  wasmDatabase ??= new Promise((resolve) => {
    const request = globalThis.indexedDB.open(WASM_DATABASE_NAME, 1);
    let settled = false;
    const finish = (database) => {
      if (settled) {
        database?.close();
        return;
      }
      settled = true;
      resolve(database);
    };
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(WASM_DATABASE_STORE))
        request.result.createObjectStore(WASM_DATABASE_STORE);
    };
    request.onsuccess = () => finish(request.result);
    request.onerror = () => finish(void 0);
    request.onblocked = () => finish(void 0);
  });
  return wasmDatabase;
}
function exactArrayBuffer(data) {
  return data.buffer instanceof ArrayBuffer &&
    data.byteOffset === 0 &&
    data.byteLength === data.buffer.byteLength
    ? data.buffer
    : data.slice().buffer;
}
async function readCacheStorage(key) {
  const cache = await openWasmCache();
  if (!cache) return void 0;
  try {
    const response = await cache.match(cacheRequest(key));
    return response ? new Uint8Array(await response.arrayBuffer()) : void 0;
  } catch {
    return;
  }
}
async function writeCacheStorage(key, data) {
  const cache = await openWasmCache();
  if (!cache) return false;
  try {
    await cache.put(
      cacheRequest(key),
      new Response(exactArrayBuffer(data), {
        headers: {
          "Content-Type": "application/wasm",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      }),
    );
    return true;
  } catch {
    return false;
  }
}
async function readIndexedDb(key) {
  const database = await openWasmDatabase();
  if (!database) return void 0;
  return new Promise((resolve) => {
    const request = database
      .transaction(WASM_DATABASE_STORE, "readonly")
      .objectStore(WASM_DATABASE_STORE)
      .get(key);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result instanceof ArrayBuffer ? new Uint8Array(result) : void 0);
    };
    request.onerror = () => resolve(void 0);
  });
}
async function writeIndexedDb(key, data) {
  const database = await openWasmDatabase();
  if (!database) return false;
  return new Promise((resolve) => {
    const transaction = database.transaction(WASM_DATABASE_STORE, "readwrite");
    transaction.objectStore(WASM_DATABASE_STORE).put(exactArrayBuffer(data), key);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
    transaction.onabort = () => resolve(false);
  });
}
function createRuntime(...args) {
  return runtime.createRuntime(...args);
}
function loadLanguage(...args) {
  return runtime.loadLanguage(...args);
}
function availableLanguages() {
  return runtime.availableLanguages();
}
function getDefaultRuntime(...args) {
  return runtime.getDefaultRuntime(...args);
}
function runtimeKind() {
  return "wasm";
}
var import_satisfies,
  import_min_version,
  RAINBOW_BRACKET_SCOPES$1,
  MAX_RUN_SIDE_BYTES,
  WORD,
  SPACE,
  encoder,
  decoder,
  warnedUnresolved,
  catalogNames,
  DIFF_LANGUAGE,
  Coalescing,
  LANGUAGE_PACKAGES,
  LANGUAGE_PACKAGE_VERSION_RANGE,
  HIGHLIGHT_NAMES,
  CDNS,
  DEFAULT_RESOLVER,
  DEFAULT_LANGUAGE_PACKAGE_RESOLVER,
  HIGHLIGHT_NAMES_SET,
  PLAINTEXT_ALIASES,
  CATALOG_LANGUAGE_IDS,
  encoder2,
  decoder2,
  treeSitterPromise,
  treeSitterModule,
  SYNC_INSTANTIATE_LIMIT,
  WASM_MAGIC,
  EXPORT_SECTION,
  FUNCTION_EXPORT,
  NON_HIGHLIGHT_CAPTURES,
  DECIMAL_OFFSET,
  BINARY_OFFSET,
  HEX_OFFSET,
  MAX_LUA_EXPONENT,
  SIGNIFICAND_BITS,
  MINIMUM_SUBNORMAL_EXPONENT,
  INFINITY_BITS,
  RAINBOW_BRACKET_FALLBACKS$1,
  LANGUAGE_LOADERS,
  builtins$1,
  decoder3,
  LANGUAGE_QUERY_FIELDS,
  LANGUAGE_LOAD_FIELDS,
  LANGUAGE_SHAPE_FIELDS,
  currentRuntime,
  BUNDLES,
  tree_sitter_wasm_default,
  WASM_CACHE_NAME,
  WASM_DATABASE_NAME,
  WASM_DATABASE_STORE,
  cacheLocks,
  wasmCache,
  wasmDatabase,
  indexedDbPreferred,
  runtime,
  load;
function init_chunk_MBM7PUQ4() {
  return (init_chunk_MBM7PUQ4 = __esmMin(() => {
    init_chunk_NB3WMMKI();
    import_satisfies = /* @__PURE__ */ __toESM(require_satisfies(), 1);
    import_min_version = require_min_version();
    init_sha2();
    RAINBOW_BRACKET_SCOPES$1 = [
      "punctuation.bracket.rainbow.1",
      "punctuation.bracket.rainbow.2",
      "punctuation.bracket.rainbow.3",
      "punctuation.bracket.rainbow.4",
      "punctuation.bracket.rainbow.5",
      "punctuation.bracket.rainbow.6",
    ];
    MAX_RUN_SIDE_BYTES = 1e3;
    WORD = /^[\p{Alphabetic}\p{N}_]$/u;
    SPACE = /^\p{White_Space}$/u;
    encoder = new TextEncoder();
    decoder = new TextDecoder();
    warnedUnresolved = /* @__PURE__ */ new Set();
    catalogNames = new Set(
      LANGUAGES.flatMap(({ id, aliases }) => aliases.concat(id)).map((name) => name.toLowerCase()),
    );
    DIFF_LANGUAGE = "diff";
    Coalescing = class {
      events = [];
      open = [];
      reopenable;
      start(scope, language) {
        const index = this.reopenable;
        this.reopenable = void 0;
        if (index !== void 0) {
          const event = this.events[index];
          if (event?.type === "start" && event.scope === scope && event.language === language) {
            this.events.pop();
            this.open.push(index);
            return;
          }
        }
        this.open.push(this.events.length);
        this.events.push({
          type: "start",
          scope,
          language,
        });
      }
      end() {
        this.reopenable = this.open.pop();
        this.events.push({ type: "end" });
      }
      source(start, end) {
        this.reopenable = void 0;
        const previous = this.events.at(-1);
        if (previous?.type === "source" && previous.end === start) {
          previous.end = end;
          return;
        }
        this.events.push({
          type: "source",
          start,
          end,
        });
      }
      finish() {
        return this.events;
      }
    };
    LANGUAGE_PACKAGES = {
      angular: "@lumis-sh/wasm-angular",
      asm: "@lumis-sh/wasm-asm",
      astro: "@lumis-sh/wasm-astro",
      bash: "@lumis-sh/wasm-bash",
      c: "@lumis-sh/wasm-c",
      caddy: "@lumis-sh/wasm-caddy",
      clojure: "@lumis-sh/wasm-clojure",
      cmake: "@lumis-sh/wasm-cmake",
      comment: "@lumis-sh/wasm-comment",
      commonlisp: "@lumis-sh/wasm-commonlisp",
      cpp: "@lumis-sh/wasm-cpp",
      csharp: "@lumis-sh/wasm-csharp",
      css: "@lumis-sh/wasm-css",
      csv: "@lumis-sh/wasm-csv",
      dart: "@lumis-sh/wasm-dart",
      diff: "@lumis-sh/wasm-diff",
      dockerfile: "@lumis-sh/wasm-dockerfile",
      eex: "@lumis-sh/wasm-eex",
      ejs: "@lumis-sh/wasm-embedded-template",
      elixir: "@lumis-sh/wasm-elixir",
      elm: "@lumis-sh/wasm-elm",
      erb: "@lumis-sh/wasm-embedded-template",
      erlang: "@lumis-sh/wasm-erlang",
      fish: "@lumis-sh/wasm-fish",
      fsharp: "@lumis-sh/wasm-fsharp",
      gleam: "@lumis-sh/wasm-gleam",
      glimmer: "@lumis-sh/wasm-glimmer",
      go: "@lumis-sh/wasm-go",
      graphql: "@lumis-sh/wasm-graphql",
      haskell: "@lumis-sh/wasm-haskell",
      hcl: "@lumis-sh/wasm-hcl",
      heex: "@lumis-sh/wasm-heex",
      html: "@lumis-sh/wasm-html",
      htmldjango: "@lumis-sh/wasm-htmldjango",
      http: "@lumis-sh/wasm-http",
      iex: "@lumis-sh/wasm-iex",
      ini: "@lumis-sh/wasm-ini",
      java: "@lumis-sh/wasm-java",
      javascript: "@lumis-sh/wasm-javascript",
      json: "@lumis-sh/wasm-json",
      julia: "@lumis-sh/wasm-julia",
      kotlin: "@lumis-sh/wasm-kotlin",
      latex: "@lumis-sh/wasm-latex",
      liquid: "@lumis-sh/wasm-liquid",
      llvm: "@lumis-sh/wasm-llvm",
      lua: "@lumis-sh/wasm-lua",
      make: "@lumis-sh/wasm-make",
      markdown: "@lumis-sh/wasm-markdown",
      markdown_inline: "@lumis-sh/wasm-markdown_inline",
      mdx: "@lumis-sh/wasm-markdown",
      nix: "@lumis-sh/wasm-nix",
      nushell: "@lumis-sh/wasm-nushell",
      objc: "@lumis-sh/wasm-objc",
      ocaml: "@lumis-sh/wasm-ocaml",
      ocaml_interface: "@lumis-sh/wasm-ocaml_interface",
      perl: "@lumis-sh/wasm-perl",
      php: "@lumis-sh/wasm-php",
      powershell: "@lumis-sh/wasm-powershell",
      protobuf: "@lumis-sh/wasm-protobuf",
      python: "@lumis-sh/wasm-python",
      r: "@lumis-sh/wasm-r",
      regex: "@lumis-sh/wasm-regex",
      ruby: "@lumis-sh/wasm-ruby",
      rust: "@lumis-sh/wasm-rust",
      scala: "@lumis-sh/wasm-scala",
      scss: "@lumis-sh/wasm-scss",
      slim: "@lumis-sh/wasm-slim",
      sql: "@lumis-sh/wasm-sql",
      surface: "@lumis-sh/wasm-surface",
      svelte: "@lumis-sh/wasm-svelte",
      swift: "@lumis-sh/wasm-swift",
      tlaplus: "@lumis-sh/wasm-tlaplus",
      toml: "@lumis-sh/wasm-toml",
      tsx: "@lumis-sh/wasm-tsx",
      typescript: "@lumis-sh/wasm-typescript",
      typst: "@lumis-sh/wasm-typst",
      vim: "@lumis-sh/wasm-vim",
      vue: "@lumis-sh/wasm-vue",
      wat: "@lumis-sh/wasm-wat",
      xml: "@lumis-sh/wasm-xml",
      yaml: "@lumis-sh/wasm-yaml",
      zig: "@lumis-sh/wasm-zig",
      arduino: "@lumis-sh/wasm-arduino",
      bicep: "@lumis-sh/wasm-bicep",
      dot: "@lumis-sh/wasm-dot",
      editorconfig: "@lumis-sh/wasm-editorconfig",
      gitattributes: "@lumis-sh/wasm-gitattributes",
      javadoc: "@lumis-sh/wasm-javadoc",
      jq: "@lumis-sh/wasm-jq",
      kdl: "@lumis-sh/wasm-kdl",
      luadoc: "@lumis-sh/wasm-luadoc",
      nim: "@lumis-sh/wasm-nim",
      pascal: "@lumis-sh/wasm-pascal",
      puppet: "@lumis-sh/wasm-puppet",
      terraform: "@lumis-sh/wasm-terraform",
      toon: "@lumis-sh/wasm-toon",
      wgsl: "@lumis-sh/wasm-wgsl",
      zsh: "@lumis-sh/wasm-zsh",
      d: "@lumis-sh/wasm-d",
      fortran: "@lumis-sh/wasm-fortran",
      gitignore: "@lumis-sh/wasm-gitignore",
      glsl: "@lumis-sh/wasm-glsl",
      groovy: "@lumis-sh/wasm-groovy",
      hurl: "@lumis-sh/wasm-hurl",
      jinja: "@lumis-sh/wasm-jinja",
      jinja_inline: "@lumis-sh/wasm-jinja_inline",
      json5: "@lumis-sh/wasm-json5",
      just: "@lumis-sh/wasm-just",
      matlab: "@lumis-sh/wasm-matlab",
      mermaid: "@lumis-sh/wasm-mermaid",
      nginx: "@lumis-sh/wasm-nginx",
      prisma: "@lumis-sh/wasm-prisma",
      qmljs: "@lumis-sh/wasm-qmljs",
      racket: "@lumis-sh/wasm-racket",
      rst: "@lumis-sh/wasm-rst",
      scheme: "@lumis-sh/wasm-scheme",
      solidity: "@lumis-sh/wasm-solidity",
      systemverilog: "@lumis-sh/wasm-systemverilog",
      tcl: "@lumis-sh/wasm-tcl",
      vhdl: "@lumis-sh/wasm-vhdl",
    };
    LANGUAGE_PACKAGE_VERSION_RANGE = "0.26";
    HIGHLIGHT_NAMES = [
      "attribute",
      "attribute.builtin",
      "attribute.c_sharp",
      "attribute.diff",
      "attribute.typescript",
      "attribute.zig",
      "boolean",
      "boolean.yaml",
      "character",
      "character.special",
      "character.special.html",
      "character.special.vim",
      "charset",
      "clicke",
      "comment",
      "comment.documentation",
      "comment.error",
      "comment.hint",
      "comment.note",
      "comment.todo",
      "comment.warning",
      "comment.warning.gitcommit",
      "constant",
      "constant.builtin",
      "constant.builtin.c",
      "constant.builtin.go",
      "constant.builtin.php",
      "constant.builtin.python",
      "constant.builtin.ruby",
      "constant.builtin.rust",
      "constant.builtin.yaml",
      "constant.c",
      "constant.cpp",
      "constant.go",
      "constant.html",
      "constant.java",
      "constant.macro",
      "constant.macro.cpp",
      "constant.regex",
      "constructor",
      "constructor.lua",
      "constructor.python",
      "constructor.tsx",
      "diff.delta",
      "diff.minus",
      "diff.minus.word",
      "diff.plus",
      "diff.plus.word",
      "error",
      "function",
      "function.builtin",
      "function.builtin.bash",
      "function.builtin.c",
      "function.builtin.go",
      "function.builtin.lua",
      "function.builtin.make",
      "function.builtin.php",
      "function.call",
      "function.call.bash",
      "function.call.yaml",
      "function.macro",
      "function.macro.vim",
      "function.method",
      "function.method.call",
      "function.scss",
      "highlighted",
      "import",
      "injection.content",
      "injection.language",
      "keyframes",
      "keyword",
      "keyword.conditional",
      "keyword.conditional.ternary",
      "keyword.coroutine",
      "keyword.cpp",
      "keyword.debug",
      "keyword.directive",
      "keyword.directive.css",
      "keyword.directive.define",
      "keyword.directive.rust",
      "keyword.dockerfile",
      "keyword.exception",
      "keyword.export",
      "keyword.function",
      "keyword.function.go",
      "keyword.function.lua",
      "keyword.function.ruby",
      "keyword.gitcommit",
      "keyword.import",
      "keyword.import.bash",
      "keyword.import.c",
      "keyword.import.cpp",
      "keyword.import.go",
      "keyword.import.javascript",
      "keyword.import.rust",
      "keyword.import.typescript",
      "keyword.modifier",
      "keyword.operator",
      "keyword.operator.lua",
      "keyword.repeat",
      "keyword.return",
      "keyword.scss",
      "keyword.type",
      "label",
      "label.c",
      "label.diff",
      "label.json",
      "label.markdown",
      "label.ruby",
      "label.yaml",
      "markup",
      "markup.environment",
      "markup.environment.name",
      "markup.heading",
      "markup.heading.1",
      "markup.heading.1.html",
      "markup.heading.1.markdown",
      "markup.heading.2",
      "markup.heading.2.html",
      "markup.heading.2.markdown",
      "markup.heading.3",
      "markup.heading.3.html",
      "markup.heading.3.markdown",
      "markup.heading.4",
      "markup.heading.4.html",
      "markup.heading.4.markdown",
      "markup.heading.5",
      "markup.heading.5.html",
      "markup.heading.5.markdown",
      "markup.heading.6",
      "markup.heading.6.html",
      "markup.heading.6.markdown",
      "markup.heading.html",
      "markup.heading.markdown",
      "markup.italic",
      "markup.italic.markdown_inline",
      "markup.link",
      "markup.link.gitcommit",
      "markup.link.label",
      "markup.link.label.html",
      "markup.link.label.markdown_inline",
      "markup.link.markdown_inline",
      "markup.link.url",
      "markup.link.url.astro",
      "markup.link.url.gitcommit",
      "markup.link.url.html",
      "markup.link.url.markdown_inline",
      "markup.link.url.svelte",
      "markup.link.url.vue",
      "markup.list",
      "markup.list.bash",
      "markup.list.checked",
      "markup.list.latex",
      "markup.list.markdown",
      "markup.list.unchecked",
      "markup.math",
      "markup.math.latex",
      "markup.quote",
      "markup.quote.markdown",
      "markup.raw",
      "markup.raw.block",
      "markup.raw.block.markdown",
      "markup.raw.markdown",
      "markup.raw.markdown_inline",
      "markup.strikethrough",
      "markup.strong",
      "markup.strong.markdown_inline",
      "markup.underline",
      "media",
      "module",
      "module.builtin",
      "module.c_sharp",
      "module.elixir",
      "module.go",
      "module.latex",
      "module.php",
      "namespace",
      "namespace.cpp",
      "namespace.go",
      "namespace.latex",
      "namespace.lua",
      "namespace.php",
      "normal",
      "number",
      "number.float",
      "operator",
      "operator.bash",
      "operator.html",
      "operator.lua",
      "operator.rust",
      "operator.toml",
      "operator.vue",
      "property",
      "property.css",
      "property.json",
      "property.lua",
      "property.scss",
      "property.toml",
      "property.yaml",
      "punctuation.bracket",
      "punctuation.bracket.lua",
      "punctuation.bracket.python",
      "punctuation.bracket.rainbow.1",
      "punctuation.bracket.rainbow.2",
      "punctuation.bracket.rainbow.3",
      "punctuation.bracket.rainbow.4",
      "punctuation.bracket.rainbow.5",
      "punctuation.bracket.rainbow.6",
      "punctuation.bracket.regex",
      "punctuation.bracket.ruby",
      "punctuation.bracket.rust",
      "punctuation.bracket.scss",
      "punctuation.bracket.tsx",
      "punctuation.bracket.typescript",
      "punctuation.bracket.yaml",
      "punctuation.delimiter",
      "punctuation.delimiter.astro",
      "punctuation.delimiter.bash",
      "punctuation.delimiter.css",
      "punctuation.delimiter.markdown_inline",
      "punctuation.delimiter.regex",
      "punctuation.delimiter.rust",
      "punctuation.delimiter.scss",
      "punctuation.delimiter.yaml",
      "punctuation.special",
      "punctuation.special.diff",
      "punctuation.special.latex",
      "punctuation.special.markdown",
      "punctuation.special.typescript",
      "punctuation.special.yaml",
      "string",
      "string.documentation",
      "string.escape",
      "string.escape.json",
      "string.escape.yaml",
      "string.json",
      "string.latex",
      "string.regex",
      "string.regexp",
      "string.scss",
      "string.special",
      "string.special.path",
      "string.special.path.diff",
      "string.special.path.gitignore",
      "string.special.path.nix",
      "string.special.symbol",
      "string.special.symbol.make",
      "string.special.uri",
      "string.special.url",
      "string.special.url.html",
      "string.toml",
      "string.yaml",
      "supports",
      "tag",
      "tag.attribute",
      "tag.attribute.html",
      "tag.attribute.tsx",
      "tag.attribute.vue",
      "tag.builtin",
      "tag.delimiter",
      "tag.delimiter.javascript",
      "tag.delimiter.tsx",
      "tag.javascript",
      "tag.jsx",
      "tag.tsx",
      "tag.typescript",
      "type",
      "type.builtin",
      "type.builtin.c",
      "type.builtin.go",
      "type.builtin.java",
      "type.builtin.python",
      "type.builtin.tsx",
      "type.builtin.typescript",
      "type.cpp",
      "type.css",
      "type.definition",
      "type.scss",
      "type.sql",
      "variable",
      "variable.builtin",
      "variable.builtin.javascript",
      "variable.builtin.lua",
      "variable.builtin.python",
      "variable.builtin.vim",
      "variable.member",
      "variable.member.python",
      "variable.member.ruby",
      "variable.member.yaml",
      "variable.parameter",
      "variable.parameter.bash",
      "variable.parameter.builtin",
      "variable.scss",
      "variable.sql",
      "variable.vim",
    ];
    CDNS = ["https://cdn.jsdelivr.net/npm", "https://unpkg.com"];
    DEFAULT_RESOLVER = (_language, wasm) =>
      `${CDNS[0]}/${wasm.packageName}@${wasm.version}/${wasm.name}.wasm`;
    DEFAULT_LANGUAGE_PACKAGE_RESOLVER = (packageName, versionRange) =>
      `${CDNS[0]}/${packageName}@${versionRange}/lumis.json`;
    HIGHLIGHT_NAMES_SET = new Set(HIGHLIGHT_NAMES);
    PLAINTEXT_ALIASES = LANGUAGES.find(({ id }) => id === "plaintext")?.aliases ?? [];
    CATALOG_LANGUAGE_IDS = new Map(
      LANGUAGES.flatMap(({ id, aliases }) =>
        [id, ...aliases].map((name) => [normalizeLanguageName(name), id]),
      ),
    );
    encoder2 = new TextEncoder();
    decoder2 = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    });
    SYNC_INSTANTIATE_LIMIT = 8388608;
    WASM_MAGIC = [0, 97, 115, 109];
    EXPORT_SECTION = 7;
    FUNCTION_EXPORT = 0;
    NON_HIGHLIGHT_CAPTURES = [
      "injection.content",
      "injection.language",
      "local.scope",
      "local.definition",
      "local.definition-value",
      "local.reference",
    ];
    DECIMAL_OFFSET = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?$/u;
    BINARY_OFFSET = /^([+-]?)0[bB]([01]+)$/u;
    HEX_OFFSET = /^([+-]?)0[xX]([\da-fA-F]+(?:\.[\da-fA-F]*)?|\.[\da-fA-F]+)(?:[pP]([+-]?\d+))?$/u;
    MAX_LUA_EXPONENT = "1048575";
    SIGNIFICAND_BITS = 52;
    MINIMUM_SUBNORMAL_EXPONENT = -1074;
    INFINITY_BITS = 2047n << 52n;
    new TextEncoder();
    new TextDecoder();
    RAINBOW_BRACKET_FALLBACKS$1 = {
      "punctuation.bracket.rainbow.1": { fg: "#e06c75" },
      "punctuation.bracket.rainbow.2": { fg: "#e5c07b" },
      "punctuation.bracket.rainbow.3": { fg: "#61afef" },
      "punctuation.bracket.rainbow.4": { fg: "#d19a66" },
      "punctuation.bracket.rainbow.5": { fg: "#98c379" },
      "punctuation.bracket.rainbow.6": { fg: "#c678dd" },
    };
    LANGUAGE_LOADERS = {
      angular: () => import("./angular-LUMSQ3MP-uNv5lN4g.js"),
      asm: () => import("./asm-4ZY3U2C5-CIcdxIwY.js"),
      astro: () => import("./astro-TZRKYVCN-Bl25rNC3.js"),
      bash: () => import("./bash-MXJTSKDX-CF0LShUG.js"),
      c: () => import("./c-OQGCVSAJ-BcRXkuS0.js"),
      caddy: () => import("./caddy-NVMIUV2O-F5rjEfU6.js"),
      clojure: () => import("./clojure-AHIHD7HX-QPXJWVTn.js"),
      cmake: () => import("./cmake-XANSKN54-DyqxgyNh.js"),
      comment: () => import("./comment-ZAH33WUA-IIaYPPza.js"),
      commonlisp: () => import("./commonlisp-B6VY4KKS-CcQiZYP_.js"),
      cpp: () => import("./cpp-C3P76BX4-AZIcdd5V.js"),
      csharp: () => import("./csharp-5ICJU35Q-DjZRMmB-.js"),
      css: () => import("./css-XG23RJ5D-CE5VOGuV.js"),
      csv: () => import("./csv-7Q5Q5TI4-D6xDBwNn.js"),
      dart: () => import("./dart-I5OVH7RC-3LS7QPP4.js"),
      diff: () => import("./diff-DV75YMPG-Bvdra05M.js"),
      dockerfile: () => import("./dockerfile-2A2GUMDZ-CncYofbU.js"),
      eex: () => import("./eex-52YSGUYR-pgp9dQeX.js"),
      ejs: () => import("./ejs-ABKS2MMW-B-HEOXPp.js"),
      elixir: () => import("./elixir-OZOVZ7FO-BD0Oy5Iq.js"),
      elm: () => import("./elm-E2TUKFCG-Dzv7bcmU.js"),
      erb: () => import("./erb-4HKISYXT-B5ZRU9da.js"),
      erlang: () => import("./erlang-WWPB5VBS-k9pwQFj8.js"),
      fish: () => import("./fish-HP6FILVH-BeIJMOKw.js"),
      fsharp: () => import("./fsharp-Y3YQYASJ-DhuNMQ8n.js"),
      gleam: () => import("./gleam-IDV4YNN3-CQnqQzln.js"),
      glimmer: () => import("./glimmer-GQYJCVII-DKoKxzhH.js"),
      go: () => import("./go-RXN63X7Z-D3dwNCLt.js"),
      graphql: () => import("./graphql-IR4JBGRO-MtZqzpxD.js"),
      haskell: () => import("./haskell-7XV34IN6-7X9e2Vi9.js"),
      hcl: () => import("./hcl-FM2P5BB6-BPNb-AXd.js"),
      heex: () => import("./heex-GGOKOKUZ-BQVjwG9N.js"),
      html: () => import("./html-NSUTOPWF-DST4j9Gy.js"),
      htmldjango: () => import("./htmldjango-HR6C5FIW-D132R2jp.js"),
      http: () => import("./http-TUVR5P54-CLT0egkS.js"),
      iex: () => import("./iex-SQ4XU64O-Bgqs3qH5.js"),
      ini: () => import("./ini-QFCEG3BL-CwYsR6on.js"),
      java: () => import("./java-M2DGZYBP-DkakfWLj.js"),
      javascript: () => import("./javascript-QBEMEIVU-D-560JCM.js"),
      json: () => import("./json-DXHLZMFF-BBYdJrmE.js"),
      julia: () => import("./julia-ZNM5BDYM-BDvu0nv7.js"),
      kotlin: () => import("./kotlin-SZ5EHAN7-Dg-oiomH.js"),
      latex: () => import("./latex-UXHP4TRP-txDIKGOc.js"),
      liquid: () => import("./liquid-TJLPRR6J-q9gKprdi.js"),
      llvm: () => import("./llvm-AJUTXFFB-DybR4Hcb.js"),
      lua: () => import("./lua-4WSYPPG7-CCMm94R5.js"),
      make: () => import("./make-HCOPZBEJ-oMPteOVU.js"),
      markdown: () => import("./markdown-CEDSJSUR-CAwFAmKI.js"),
      markdown_inline: () => import("./markdown_inline-YT3DBTCO-BNEPdvFn.js"),
      mdx: () => import("./mdx-WZA6UNXD-D8SurjAK.js"),
      nix: () => import("./nix-3DKPYBYY-B696wavu.js"),
      nushell: () => import("./nushell-FLB5DEEL-DIl4wZPX.js"),
      objc: () => import("./objc-4BPC6PJP-Cosc1apZ.js"),
      ocaml: () => import("./ocaml-GXHGAZ2R-Cw5XIR3L.js"),
      ocaml_interface: () => import("./ocaml_interface-3BTQZMAB-Me-63BCG.js"),
      perl: () => import("./perl-XXPABN67-BKf4tqmV.js"),
      php: () => import("./php-HMEWI7OR-o-vNwoZY.js"),
      powershell: () => import("./powershell-ZMPRQ3KH-C505rMgV.js"),
      protobuf: () => import("./protobuf-GRMDWBN7-B_Iw4V5U.js"),
      python: () => import("./python-KCVI6EZQ-CHnUgzge.js"),
      r: () => import("./r-INRY3XUU-BgOMDgEe.js"),
      regex: () => import("./regex-Q5RK3CLH-DbkKNtL7.js"),
      ruby: () => import("./ruby-PQOIAG57-BFrA3yy2.js"),
      rust: () => import("./rust-EWEGF65E-CEsVtS-V.js"),
      scala: () => import("./scala-V2ZSTSHB-CSh6P2G1.js"),
      scss: () => import("./scss-7R64WPAZ-CcKlRwW5.js"),
      slim: () => import("./slim-JRL5IUTY-CyiYV311.js"),
      sql: () => import("./sql-NL7CLREW-DfY-4vR2.js"),
      surface: () => import("./surface-MV53BK3I-QoxmkGaY.js"),
      svelte: () => import("./svelte-KMKOPXIZ-BjqiTH99.js"),
      swift: () => import("./swift-O24VLIYD-B3awhsak.js"),
      tlaplus: () => import("./tlaplus-BHHJFPLB-CTyCulBx.js"),
      toml: () => import("./toml-3OLZAB4F-BIHSmKLi.js"),
      tsx: () => import("./tsx-UHZS34ZN-Bv3BmdKC.js"),
      typescript: () => import("./typescript-HZQXLETP-B_6MKFzm.js"),
      typst: () => import("./typst-XYGPU5VF-CskPeg9q.js"),
      vim: () => import("./vim-BUV5GTKR-BZ9zTXYQ.js"),
      vue: () => import("./vue-3MP5VBJJ-BJvMcRTT.js"),
      wat: () => import("./wat-OFKFALAW-DgDwj25Q.js"),
      xml: () => import("./xml-6P2JJ7PD-CXIVVn5e.js"),
      yaml: () => import("./yaml-CY2IEJKR-TIWvPWDb.js"),
      zig: () => import("./zig-4QSSGHFQ-B8BymKUK.js"),
      arduino: () => import("./arduino-XNTBODQF-BV0ilT7Y.js"),
      bicep: () => import("./bicep-XDY2JSS5-BSiBFaqB.js"),
      dot: () => import("./dot-SWRPHU4H-i8AWGyv9.js"),
      editorconfig: () => import("./editorconfig-VSEMCKQ6-DcGmAZMr.js"),
      gitattributes: () => import("./gitattributes-G2IIBENZ-BIcuIRzc.js"),
      javadoc: () => import("./javadoc-7NZOVAXF-0SK7QWp3.js"),
      jq: () => import("./jq-LI774W2S-E0jN9f2T.js"),
      kdl: () => import("./kdl-TVPD2Y2H-CphCTsCq.js"),
      luadoc: () => import("./luadoc-6YOBHN7P-0b6wWdCk.js"),
      nim: () => import("./nim-3GU5PWOM-CfNB5La-.js"),
      pascal: () => import("./pascal-M5PG74UA-BH32YR4Z.js"),
      puppet: () => import("./puppet-SFMTBZ26-DwOG5NMb.js"),
      terraform: () => import("./terraform-QSPIGI7Z-BBK3OB_m.js"),
      toon: () => import("./toon-QFBLR6B6-amwVxgCi.js"),
      wgsl: () => import("./wgsl-TIK6KIBL-86AYtCHe.js"),
      zsh: () => import("./zsh-6ENJLMAV-BRXBiJSg.js"),
      d: () => import("./d-ZQCL6WDS-O0UYPTum.js"),
      fortran: () => import("./fortran-CXP5RCIK-D9CnYPqD.js"),
      gitignore: () => import("./gitignore-RRBBOH2M-DvWyCQxG.js"),
      glsl: () => import("./glsl-YATJWGSY-BdypCymr.js"),
      groovy: () => import("./groovy-EP6GZWDC-CpH4lLjX.js"),
      hurl: () => import("./hurl-ARERYAQ7-CbZK55Y6.js"),
      jinja: () => import("./jinja-LCDT35OF-CVlVjbEr.js"),
      jinja_inline: () => import("./jinja_inline-NFYKTI2M-CWaCOn9r.js"),
      json5: () => import("./json5-ZQTI6G5K-DyD3d0DF.js"),
      just: () => import("./just-BKAICT3M-a0Rgvopx.js"),
      matlab: () => import("./matlab-IOADLZRD-CWrtp3t9.js"),
      mermaid: () => import("./mermaid-O6TWWJVZ-BOk1-zqY.js"),
      nginx: () => import("./nginx-6LSQOG3S-i7DebD4p.js"),
      prisma: () => import("./prisma-OSKNOQXB-D9qOEn-M.js"),
      qmljs: () => import("./qmljs-KRFMVBRO-BVi0v82M.js"),
      racket: () => import("./racket-P276I24P-BtAVOBWh.js"),
      rst: () => import("./rst-AADP6SQZ-lBDpXhNV.js"),
      scheme: () => import("./scheme-C5MTXVS4-B-uA-N0M.js"),
      solidity: () => import("./solidity-E6NA6ZLU-vg93a3cB.js"),
      systemverilog: () => import("./systemverilog-ULWGOVCC-D0dSoVru.js"),
      tcl: () => import("./tcl-K4LJMBTZ-BrsNIB6y.js"),
      vhdl: () => import("./vhdl-EYFNS6BU-CnfxOu2d.js"),
      plaintext: () => import("./plaintext-2RILKE2U-CLobo7Mo.js"),
    };
    builtins$1 = /* @__PURE__ */ new WeakMap();
    decoder3 = new TextDecoder();
    LANGUAGE_QUERY_FIELDS = ["highlights", "injections", "locals", "brackets"];
    LANGUAGE_LOAD_FIELDS = ["packageName", ...LANGUAGE_QUERY_FIELDS, "wasm"];
    LANGUAGE_SHAPE_FIELDS = ["id", "aliases", ...LANGUAGE_LOAD_FIELDS];
    BUNDLES = {
      web: ["css", "html", "javascript", "json", "tsx", "typescript"],
      "web-extra": [
        "angular",
        "astro",
        "dart",
        "eex",
        "ejs",
        "elm",
        "erb",
        "glimmer",
        "graphql",
        "heex",
        "htmldjango",
        "markdown",
        "markdown_inline",
        "mdx",
        "php",
        "prisma",
        "scss",
        "slim",
        "surface",
        "svelte",
        "vue",
        "xml",
      ],
      system: [
        "asm",
        "bash",
        "c",
        "cmake",
        "cpp",
        "go",
        "llvm",
        "make",
        "rust",
        "wat",
        "zig",
        "zsh",
      ],
      backend: [
        "csharp",
        "elixir",
        "erlang",
        "go",
        "java",
        "javadoc",
        "javascript",
        "kotlin",
        "php",
        "protobuf",
        "python",
        "ruby",
        "rust",
        "scala",
        "sql",
        "typescript",
      ],
      full: [
        "angular",
        "asm",
        "astro",
        "bash",
        "c",
        "caddy",
        "clojure",
        "cmake",
        "comment",
        "commonlisp",
        "cpp",
        "csharp",
        "css",
        "csv",
        "dart",
        "diff",
        "dockerfile",
        "eex",
        "ejs",
        "elixir",
        "elm",
        "erb",
        "erlang",
        "fish",
        "fsharp",
        "gleam",
        "glimmer",
        "go",
        "graphql",
        "haskell",
        "hcl",
        "heex",
        "html",
        "htmldjango",
        "http",
        "iex",
        "ini",
        "java",
        "javascript",
        "json",
        "julia",
        "kotlin",
        "latex",
        "liquid",
        "llvm",
        "lua",
        "make",
        "markdown",
        "markdown_inline",
        "mdx",
        "nix",
        "nushell",
        "objc",
        "ocaml",
        "ocaml_interface",
        "perl",
        "php",
        "powershell",
        "protobuf",
        "python",
        "r",
        "regex",
        "ruby",
        "rust",
        "scala",
        "scss",
        "slim",
        "sql",
        "surface",
        "svelte",
        "swift",
        "tlaplus",
        "toml",
        "tsx",
        "typescript",
        "typst",
        "vim",
        "vue",
        "wat",
        "xml",
        "yaml",
        "zig",
        "arduino",
        "bicep",
        "dot",
        "editorconfig",
        "gitattributes",
        "javadoc",
        "jq",
        "kdl",
        "luadoc",
        "nim",
        "pascal",
        "puppet",
        "terraform",
        "toon",
        "wgsl",
        "zsh",
        "d",
        "fortran",
        "gitignore",
        "glsl",
        "groovy",
        "hurl",
        "jinja",
        "jinja_inline",
        "json5",
        "just",
        "matlab",
        "mermaid",
        "nginx",
        "prisma",
        "qmljs",
        "racket",
        "rst",
        "scheme",
        "solidity",
        "tcl",
        "vhdl",
      ],
    };
    tree_sitter_wasm_default = Uint8Array.from(
      atob(
        "AGFzbQEAAAAAEAhkeWxpbmsuMAEFvHoEHgABxwEZYAF/AX9gAn9/AX9gAX8AYAN/f38AYAN/f38Bf2ACf38AYAR/f39/AX9gBX9/f39/AGAEf39/fwBgAABgAAF/YAV/f39/fwF/YAd/f39/f39/AGAGf3x/f39/AX9gEH9/f39/f39/f39/f39/f38AYAZ/f39/f38AYAZ/f39/f38Bf2ACfn8Bf2AIf39/f39/f38Bf2AGfn9/f39/AX9gB39/f39/f38Bf2ACfH8BfGAEf39/fwF+YAR/fn9/AX9gA39+fwF+AtsDERZ3YXNpX3NuYXBzaG90X3ByZXZpZXcxCGZkX3dyaXRlAAYDZW52FmVtc2NyaXB0ZW5fcmVzaXplX2hlYXAAABZ3YXNpX3NuYXBzaG90X3ByZXZpZXcxB2ZkX3NlZWsAFwNlbnYJX2Fib3J0X2pzAAkWd2FzaV9zbmFwc2hvdF9wcmV2aWV3MQhmZF9jbG9zZQAAA2VudiN0cmVlX3NpdHRlcl9xdWVyeV9wcm9ncmVzc19jYWxsYmFjawAAA2Vudh10cmVlX3NpdHRlcl9wcm9ncmVzc19jYWxsYmFjawABA2Vudhp0cmVlX3NpdHRlcl9wYXJzZV9jYWxsYmFjawAHA2Vudhh0cmVlX3NpdHRlcl9sb2dfY2FsbGJhY2sABQNlbnYPX19zdGFja19wb2ludGVyA38BA2Vudg1fX21lbW9yeV9iYXNlA38AA2VudgxfX3RhYmxlX2Jhc2UDfwAHR09ULm1lbQtfX3N0YWNrX2xvdwN/AQdHT1QubWVtDF9fc3RhY2tfaGlnaAN/AQdHT1QubWVtC19faGVhcF9iYXNlA38BA2VudgZtZW1vcnkCAYAEgIACA2VudhlfX2luZGlyZWN0X2Z1bmN0aW9uX3RhYmxlAXAAHgOdApsCBQUGAAIDBwUFBAAFBQcCAw8DBAADBhADAAARBAQDAgICAQQABQQBAQUBAgQABQMIBwQCAQMIAAAFAAkBAwQBAAICCBIDAQYFBAcMBwgDAwATAAUFAQEGCAAUFQQAAAAEBQQEBAQAFgAFBwUECwQDCAEFAgEBAwMICgEBAQEEBAQEAAAAAAsBAQIDAQEEBAQCAAAAAAEABAMEAAAEAAAKAAIAAAAABQAEBQ0EAQQYAgAOAA4AAAAAAAABAAAMAgIAAAACAgICAgICAgACAgIBCQIFBQUAAAACAgUBAQACAAAAAAACAgAAAAAAAAUAAAEAAAAABQICAgIFAgICAgUCAgEBAgAABgsDBQkKAAIABAABAQEBAAUDAQAJCQY+CX8BQQALfwFB6PIAC38BQeDyAAt/AUHs8gALfwFB5PIAC38BQZj0AAt/AUGw9AALfwFBtPoAC38BQbj6AAsHqCGaARFfX3dhc21fY2FsbF9jdG9ycwCjAgZtYWxsb2MAIgZjYWxsb2MAKgdyZWFsbG9jAF0EZnJlZQAzDXRzX3JhbmdlX2VkaXQAUAZtZW1jbXAAEhh0c19sYW5ndWFnZV9zeW1ib2xfY291bnQAoQIXdHNfbGFuZ3VhZ2Vfc3RhdGVfY291bnQAnQIXdHNfbGFuZ3VhZ2VfYWJpX3ZlcnNpb24AmAIQdHNfbGFuZ3VhZ2VfbmFtZQCUAhd0c19sYW5ndWFnZV9maWVsZF9jb3VudACMAhZ0c19sYW5ndWFnZV9uZXh0X3N0YXRlACsXdHNfbGFuZ3VhZ2Vfc3ltYm9sX25hbWUA9wEbdHNfbGFuZ3VhZ2Vfc3ltYm9sX2Zvcl9uYW1lAB4Hc3RybmNtcAAbF3RzX2xhbmd1YWdlX3N5bWJvbF90eXBlAEQddHNfbGFuZ3VhZ2VfZmllbGRfbmFtZV9mb3JfaWQA1wEZdHNfbG9va2FoZWFkX2l0ZXJhdG9yX25ldwDCARx0c19sb29rYWhlYWRfaXRlcmF0b3JfZGVsZXRlALcBIXRzX2xvb2thaGVhZF9pdGVyYXRvcl9yZXNldF9zdGF0ZQC0ARt0c19sb29rYWhlYWRfaXRlcmF0b3JfcmVzZXQAswEadHNfbG9va2FoZWFkX2l0ZXJhdG9yX25leHQArwEkdHNfbG9va2FoZWFkX2l0ZXJhdG9yX2N1cnJlbnRfc3ltYm9sAKsBDXRzX3BvaW50X2VkaXQAkgEQdHNfcGFyc2VyX2RlbGV0ZQCRAQ90c19wYXJzZXJfcmVzZXQAKBZ0c19wYXJzZXJfc2V0X2xhbmd1YWdlAJABHXRzX3BhcnNlcl9zZXRfaW5jbHVkZWRfcmFuZ2VzADoMdHNfcXVlcnlfbmV3AI4BD3RzX3F1ZXJ5X2RlbGV0ZQBKCGlzd3NwYWNlAGYIaXN3YWxudW0AEw10c19xdWVyeV9jb3B5AI0BFnRzX3F1ZXJ5X3BhdHRlcm5fY291bnQAjAEWdHNfcXVlcnlfY2FwdHVyZV9jb3VudACLARV0c19xdWVyeV9zdHJpbmdfY291bnQAigEcdHNfcXVlcnlfY2FwdHVyZV9uYW1lX2Zvcl9pZACJASJ0c19xdWVyeV9jYXB0dXJlX3F1YW50aWZpZXJfZm9yX2lkAIgBHHRzX3F1ZXJ5X3N0cmluZ192YWx1ZV9mb3JfaWQAhwEfdHNfcXVlcnlfcHJlZGljYXRlc19mb3JfcGF0dGVybgCGAR90c19xdWVyeV9zdGFydF9ieXRlX2Zvcl9wYXR0ZXJuAIUBHXRzX3F1ZXJ5X2VuZF9ieXRlX2Zvcl9wYXR0ZXJuAIQBGnRzX3F1ZXJ5X2lzX3BhdHRlcm5fcm9vdGVkAIMBHXRzX3F1ZXJ5X2lzX3BhdHRlcm5fbm9uX2xvY2FsAIIBJnRzX3F1ZXJ5X2lzX3BhdHRlcm5fZ3VhcmFudGVlZF9hdF9zdGVwAKACGHRzX3F1ZXJ5X2Rpc2FibGVfY2FwdHVyZQCfAhh0c19xdWVyeV9kaXNhYmxlX3BhdHRlcm4AngIMdHNfdHJlZV9jb3B5AJYCDnRzX3RyZWVfZGVsZXRlAJUCB3RzX2luaXQAkwISdHNfcGFyc2VyX25ld193YXNtAJICHHRzX3BhcnNlcl9lbmFibGVfbG9nZ2VyX3dhc20AkQIUdHNfcGFyc2VyX3BhcnNlX3dhc20AjwIedHNfcGFyc2VyX2luY2x1ZGVkX3Jhbmdlc193YXNtAIsCHnRzX2xhbmd1YWdlX3R5cGVfaXNfbmFtZWRfd2FzbQCKAiB0c19sYW5ndWFnZV90eXBlX2lzX3Zpc2libGVfd2FzbQCJAhl0c19sYW5ndWFnZV9tZXRhZGF0YV93YXNtAIgCG3RzX2xhbmd1YWdlX3N1cGVydHlwZXNfd2FzbQCHAhl0c19sYW5ndWFnZV9zdWJ0eXBlc193YXNtAIYCFnRzX3RyZWVfcm9vdF9ub2RlX3dhc20AhQIidHNfdHJlZV9yb290X25vZGVfd2l0aF9vZmZzZXRfd2FzbQCEAhF0c190cmVlX2VkaXRfd2FzbQCDAhx0c190cmVlX2luY2x1ZGVkX3Jhbmdlc193YXNtAIICH3RzX3RyZWVfZ2V0X2NoYW5nZWRfcmFuZ2VzX3dhc20AgQIXdHNfdHJlZV9jdXJzb3JfbmV3X3dhc20AgAIYdHNfdHJlZV9jdXJzb3JfY29weV93YXNtAP8BGnRzX3RyZWVfY3Vyc29yX2RlbGV0ZV93YXNtAP4BGXRzX3RyZWVfY3Vyc29yX3Jlc2V0X3dhc20A/QEcdHNfdHJlZV9jdXJzb3JfcmVzZXRfdG9fd2FzbQD8ASR0c190cmVlX2N1cnNvcl9nb3RvX2ZpcnN0X2NoaWxkX3dhc20A+wEjdHNfdHJlZV9jdXJzb3JfZ290b19sYXN0X2NoaWxkX3dhc20A+gEudHNfdHJlZV9jdXJzb3JfZ290b19maXJzdF9jaGlsZF9mb3JfaW5kZXhfd2FzbQD5ATF0c190cmVlX2N1cnNvcl9nb3RvX2ZpcnN0X2NoaWxkX2Zvcl9wb3NpdGlvbl93YXNtAPgBJXRzX3RyZWVfY3Vyc29yX2dvdG9fbmV4dF9zaWJsaW5nX3dhc20A9gEpdHNfdHJlZV9jdXJzb3JfZ290b19wcmV2aW91c19zaWJsaW5nX3dhc20A9QEjdHNfdHJlZV9jdXJzb3JfZ290b19kZXNjZW5kYW50X3dhc20A9AEfdHNfdHJlZV9jdXJzb3JfZ290b19wYXJlbnRfd2FzbQDzASh0c190cmVlX2N1cnNvcl9jdXJyZW50X25vZGVfdHlwZV9pZF93YXNtAPIBKXRzX3RyZWVfY3Vyc29yX2N1cnJlbnRfbm9kZV9zdGF0ZV9pZF93YXNtAPEBKXRzX3RyZWVfY3Vyc29yX2N1cnJlbnRfbm9kZV9pc19uYW1lZF93YXNtAPABK3RzX3RyZWVfY3Vyc29yX2N1cnJlbnRfbm9kZV9pc19taXNzaW5nX3dhc20A7wEjdHNfdHJlZV9jdXJzb3JfY3VycmVudF9ub2RlX2lkX3dhc20A7gEidHNfdHJlZV9jdXJzb3Jfc3RhcnRfcG9zaXRpb25fd2FzbQDtASB0c190cmVlX2N1cnNvcl9lbmRfcG9zaXRpb25fd2FzbQDsAR90c190cmVlX2N1cnNvcl9zdGFydF9pbmRleF93YXNtAOsBHXRzX3RyZWVfY3Vyc29yX2VuZF9pbmRleF93YXNtAOoBJHRzX3RyZWVfY3Vyc29yX2N1cnJlbnRfZmllbGRfaWRfd2FzbQDpASF0c190cmVlX2N1cnNvcl9jdXJyZW50X2RlcHRoX3dhc20A6AEsdHNfdHJlZV9jdXJzb3JfY3VycmVudF9kZXNjZW5kYW50X2luZGV4X3dhc20A5wEgdHNfdHJlZV9jdXJzb3JfY3VycmVudF9ub2RlX3dhc20A5gETdHNfbm9kZV9zeW1ib2xfd2FzbQDlASF0c19ub2RlX2ZpZWxkX25hbWVfZm9yX2NoaWxkX3dhc20A5AEndHNfbm9kZV9maWVsZF9uYW1lX2Zvcl9uYW1lZF9jaGlsZF93YXNtAOMBIXRzX25vZGVfY2hpbGRyZW5fYnlfZmllbGRfaWRfd2FzbQDiASF0c19ub2RlX2ZpcnN0X2NoaWxkX2Zvcl9ieXRlX3dhc20A4QEndHNfbm9kZV9maXJzdF9uYW1lZF9jaGlsZF9mb3JfYnl0ZV93YXNtAOABG3RzX25vZGVfZ3JhbW1hcl9zeW1ib2xfd2FzbQDfARh0c19ub2RlX2NoaWxkX2NvdW50X3dhc20A3gEedHNfbm9kZV9uYW1lZF9jaGlsZF9jb3VudF93YXNtAN0BEnRzX25vZGVfY2hpbGRfd2FzbQDcARh0c19ub2RlX25hbWVkX2NoaWxkX3dhc20A2wEedHNfbm9kZV9jaGlsZF9ieV9maWVsZF9pZF93YXNtANoBGXRzX25vZGVfbmV4dF9zaWJsaW5nX3dhc20A2QEZdHNfbm9kZV9wcmV2X3NpYmxpbmdfd2FzbQDWAR90c19ub2RlX25leHRfbmFtZWRfc2libGluZ193YXNtANUBH3RzX25vZGVfcHJldl9uYW1lZF9zaWJsaW5nX3dhc20A1AEddHNfbm9kZV9kZXNjZW5kYW50X2NvdW50X3dhc20A0wETdHNfbm9kZV9wYXJlbnRfd2FzbQDSASJ0c19ub2RlX2NoaWxkX3dpdGhfZGVzY2VuZGFudF93YXNtANEBIXRzX25vZGVfZGVzY2VuZGFudF9mb3JfaW5kZXhfd2FzbQDQASd0c19ub2RlX25hbWVkX2Rlc2NlbmRhbnRfZm9yX2luZGV4X3dhc20AzwEkdHNfbm9kZV9kZXNjZW5kYW50X2Zvcl9wb3NpdGlvbl93YXNtAM4BKnRzX25vZGVfbmFtZWRfZGVzY2VuZGFudF9mb3JfcG9zaXRpb25fd2FzbQDNARh0c19ub2RlX3N0YXJ0X3BvaW50X3dhc20AzAEWdHNfbm9kZV9lbmRfcG9pbnRfd2FzbQDLARh0c19ub2RlX3N0YXJ0X2luZGV4X3dhc20AygEWdHNfbm9kZV9lbmRfaW5kZXhfd2FzbQDJARZ0c19ub2RlX3RvX3N0cmluZ193YXNtAMgBFXRzX25vZGVfY2hpbGRyZW5fd2FzbQDHARt0c19ub2RlX25hbWVkX2NoaWxkcmVuX3dhc20AxgEgdHNfbm9kZV9kZXNjZW5kYW50c19vZl90eXBlX3dhc20AxQEVdHNfbm9kZV9pc19uYW1lZF93YXNtAMQBGHRzX25vZGVfaGFzX2NoYW5nZXNfd2FzbQDDARZ0c19ub2RlX2hhc19lcnJvcl93YXNtAMEBFXRzX25vZGVfaXNfZXJyb3Jfd2FzbQDAARd0c19ub2RlX2lzX21pc3Npbmdfd2FzbQC/ARV0c19ub2RlX2lzX2V4dHJhX3dhc20AvgEYdHNfbm9kZV9wYXJzZV9zdGF0ZV93YXNtAL0BHXRzX25vZGVfbmV4dF9wYXJzZV9zdGF0ZV93YXNtALwBFXRzX3F1ZXJ5X21hdGNoZXNfd2FzbQC7ARZ0c19xdWVyeV9jYXB0dXJlc193YXNtALkBBm1lbXNldAA0Bm1lbWNweQAkB21lbW1vdmUAoQEIaXN3YWxwaGEAZwhpc3dibGFuawClAQhpc3dkaWdpdACqAQhpc3dsb3dlcgCmAQhpc3dwdW5jdACjAQhpc3d1cHBlcgCiAQlpc3d4ZGlnaXQAngEGbWVtY2hyAGQGc3RybGVuAGUGc3RyY21wAJ0BB3N0cm5jYXQApAEHc3RybmNweQCfAQh0b3dsb3dlcgCtAQh0b3d1cHBlcgCsAQhzZXRUaHJldwCuARlfZW1zY3JpcHRlbl9zdGFja19yZXN0b3JlAKkBF19lbXNjcmlwdGVuX3N0YWNrX2FsbG9jAKgBHGVtc2NyaXB0ZW5fc3RhY2tfZ2V0X2N1cnJlbnQApwEYX193YXNtX2FwcGx5X2RhdGFfcmVsb2NzAKICCALYAQk/AQAjAgselwGWAZUBoAGcAZoBmQGYATGPAZwCmgKbApkCJZcCmwGUAZMBM5ACjgKNAroBuAG1AbYBsgGxAbABDAEBCoDN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BjYCCAJ/IAMoAgAiBUEBcSIYBEAgAy0AByIKIQggBiEJIA4MAQtBACAGIAUoAhQiBxshCSAFKAIYIQggBSgCECEKIAcgDmoLIQcgCyAWSw0FIAMgF0YNBCAKIAtqIQoCQAJAAkACQAJAIBINACAKIA1JDQAgGA0BIAUoAiRFDQEgBSgCMEUNASAEIAEpAgg3AyggBCABKQIQNwMwIAQgASkCADcDICAEIAIpAgg3AxAgBCACKQIQNwMYIAQgAikCADcDCCAEQegAaiAEQSBqIARBCGoQGCAEKAJ4RQ0BDAgLIBINAQsgCiANSw0BDAILIAogDUkNAQsgAygCACIDQQFxDQAgAygCJEUNACADKAIwDQILIAggCWohBiARQQFqIhEgFUcNAAsMBAsgAy0ALEEBcSAMckUNAAsgACABKQIANwIAIAAgASkCEDcCECAAIAEpAgg3AggMAwsgACABIAEgBEHoAGogDBsgBS8BLEEBcRsiASkCADcCACAAIAEpAhA3AhAgACABKQIINwIIDAILIAAgASkCADcCACAAIAEpAhA3AhAgACABKQIINwIIDAELIABCADcCACAAQgA3AhAgAEIANwIICyAEQYABaiQAC/wUAhN/AX4jAEEwayINJAAgAUEANgIcIAFBADYCECABKAIAIA1BADoALiANQQA7ASwgAkEFdGooAgAhDAJAIAVBAEgEQAwBCyAFQf////8BcUH3////AUYNACAFQQlqIghB/////wFxIQogCEEDdCMIKAIAEQAAIQkgASgCHCEHCyABKAIYIQYgASAHQQFqIgggASgCICILSwR/QQggC0EBdCIHIAggByAISxsiCCAIQQhNGyIHQRhsIQgCfyAGBEAgBiAIIwcoAgARAQAMAQsgCCMIKAIAEQAACyEGIAEgBzYCICABKAIcIgdBAWoFIAgLNgIcIAEgBjYCGCAGIAdBGGxqIghBAToAFCAIQQA2AhAgCCAKNgIMIAhBADYCCCAIIAk2AgQgCCAMNgIAIAggDS0ALjoAFyAIIA0vASw7ABUgASgCHCIUBEAgAkEFdCEXA0AgEUEYbCIVIAEoAhhqIgsoAgAhDiAEIAsgAxEBACICQQJxIRICQAJAAkACQAJAAkACQAJAAkAgAkEBcUUEQCAOLwGQASECIBJFDQQgCygCDCEQIAsoAgghDCALKAIE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QANAIAQgA0EDdGshByADIQEDQAJAAkAgByABQQFrIgFBA3RqIggoAgAiAkEBcQ0AIAItACxBwABxRQ0AIAIoAiQhAyAIKAIEIQogAiEEDAELIAENAQsLIAMNAAsLIAAgCjYCECAAIAQ2AgwLIAAgBkEBayICNgIEAkAgAkUNACAJIAtqIQMDQAJAIAIhASAFIAZBBHRqQSBrKAIAIgdBAXFFBEAgBygCJCIIIAUgAUEEdGooAghBAWoiBEsNAQsgACABQQFrIgI2AgQgASEGIAINAQwCCwsgACgCCCICIAZJBEAgBUEIIAJBAXQiASAGIAEgBksbIgEgAUEITRsiAUEEdCMHKAIAEQEAIQUgACABNgIIIAcoAiQhCCAAKAIEIQELIAAgBTYCACAAIAFBAWo2AgQgByAIQQN0ayAEQQN0aikCACEMIAUgAUEEdGoiACADNgIMIAAgBDYCCCAAIAw3AgALC9kEAgd/AX4jAEEgayICJAACQCAAKAKgCSIBRQ0AIAAoAogKIgNFDQAgASgCdCIBRQ0AIAMgARECAAsgAEEANgKICiAAKAKYCgRAIAIgAEGYCmopAgA3AxggAEGICWogAkEYahAKIABCADcCmAoLIABCADcCgAogAEEANgL4CSAAKAIgBEBBACEBIABBADYCfCAAQQA6AIABIABCADcCJCAAQQA2AiAgACgCRCEFAkAgACgCZCIDBEADQAJAIAUgAUEYbGoiBigCFCIHRQ0AIAcgBigCECIETQ0AIAYpAgAhCCAAIAE2AmggACAINwIkIAAgBDYCIEEAIQEgACgCSEUNAyAAKAJsIgMgBE0EQCAEIAAoAnAgA2pJDQQLIABBADYCSCAAQgA3AmwMAwsgAUEBaiIBIANHDQALCyAAIAM2AmggBSADQRhsaiIBQQRrKAIAIQMgAUEQaykCACEIIABBADYCSCAAIAg3AiQgACADNgIgIABCADcCbEEBIQELIABBADYCACAAIAE2AnQLIAAoAoQJEDsgAEHgCWohASAAKALgCQRAIAIgASkCADcDECAAQYgJaiACQRBqEAoLIAAoAugJBEAgAiAAQegJaikCADcDCCAAQYgJaiACQQhqEAoLIAFCADcCACABQQA2AhAgAUIANwIIIAAoArQJBEAgAiAAQbQJaikCADcDACAAQYgJaiACEAogAEIANwK0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IAVBAXQiBCACIAIgBEkbIgIgAkEITRshAgJ/IAMEQCADIAIjBygCABEBAAwBCyACIwgoAgARAAALIQMgACACNgKMASAAKAKIASIEQQFqBSACCzYCiAEgACADNgKEASADIARqQQo6AAAMBgsgACAEQQFqIgIgACgCjAEiBUsEf0EIIAVBAXQiBCACIAIgBEkbIgIgAkEITRshAgJ/IAMEQCADIAIjBygCABEBAAwBCyACIwgoAgARAAALIQMgACACNgKMASAAKAKIASIEQQFqBSACCzYCiAEgACADNgKEASADIARqQQ06AAAMBQsgACAEQQFqIgIgACgCjAEiBUsEf0EIIAVBAXQiBCACIAIgBEkbIgIgAkEITRshAgJ/IAMEQCADIAIjBygCABEBAAwBCyACIwgoAgARAAALIQMgACACNgKMASAAKAKIASIEQQFqBSACCzYCiAEgACADNgKEASADIARqQQk6AAAMBAsgAkEwRg0CCyABKAIAIQYCQCAEIAEtABAiAmoiBSAAKAKMAU0NAAJ/IAMEQCADIAUjBygCABEBAAwBCyAFIwgoAgARAAALIQMgACAFNgKMASAAKAKIASIHIARNDQAgByAEayIHRQ0AIAMgBWogAyAEaiAH/AoAAAsCQCACRSIFDQAgAyAEaiEEIAYEQCAFDQEgBCAGIAL8CgAADAELIAJFDQAgBEEAIAL8CwALIAAgAzYChAEgACAAKAKIASACajYCiAEMAgsCQAJAAn8CQCACQdwARwRAIAJBCkYNBEEAIAJBIkcNBxogACgChAEhAiABKAIAIgggBGsiAyAAKAKIASIFaiIGIAAoAowBTQ0DIAJFDQEgAiAGIwcoAgARAQAMAgsgACgChAEhAgJAIAEoAgAiByAEayIDIAAoAogBIgVqIgYgACgCjAFNDQACfyACBEAgAiAGIwcoAgARAQAMAQsgBiMIKAIAEQAACyECIAAgBjYCjAEgACgCiAEiCSAFTQ0AIAkgBWsiCUUNACACIAZqIAIgBWogCfwKAAALAkAgBCAHRg0AIAIgBWohBSAEBEAgA0UNASAFIAQgA/wKAAAMAQsgA0UNACAFQQAgA/wLAAsgACACNgKEASAAIAAoAogBIANqNgKIASABKAIAQQFqIQRBAQwGCyAGIwgoAgARAAALIQIgACAGNgKMASAAKAKIASIH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IAEjCSgCABECAAsgAEEANgJ0IABCADcCbCAAKAKEASIBBEAgASMJKAIAEQIACyAAQQA2AowBIABCADcChAEgACgCeCIBBEAgASMJKAIAEQIACyAAQQA2AoABIABCADcCeCAAKAKQASIBBEAgASMJKAIAEQIACyAAQQA2ApgBIABCADcCkAECQCAAKAKcASIBRQ0AIAEoAlwNACABKAJoIAFHDQAgASABKAKoASICQQFrNgKoASACQQFHDQAgASMJKAIAEQIACyAAKAIAIgEEQCABIwkoAgARAgALIABBADYCCCAAQgA3AgAgACgCDCIBBEAgASMJKAIAEQIACyAAQQA2AhQgAEIANwIMIAAoAhgiAQRAIAEjCSgCABECAAtBACEBIABBADYCICAAQgA3AhggACgCJCICBEAgAiMJKAIAEQIACyAAQQA2AiwgAEIANwIkIAAoAjQiAgRAA0AgACgCMCABQQxsaiIDKAIAIgQEQCAEIwkoAgARAgAgACgCNCECCyADQQA2AgggA0IANwIAIAFBAWoiASACSQ0ACwsgACgCMCIBBEAgASMJKAIAEQIACyAAQQA2AjggAEIANwIwIAAjCSgCABECAAsLrxsBKX8jAEHQAGsiCyQAIANBADYCQCADQQA2AjQgA0EYaiEXIANBJGohHiADQQxqIRIgC0EOaiEiIAtBDGohKAJAA0ACQCADKAIERQRAIAMoAhxFDQMgIyADKAI0IiNPDQMgCyADKAIINgIQIAsgAykCADcDCCADIBcoAgg2AgggAyAXKQIANwIAIBcgCygCEDYCCCAXIAspAwg3AgAgH0EBaiEfDAELIAMoAgwhCSADKAIkIQQCQCADKAIQIg0gAygCKCIFaiIGIAMoAixNDQAgBkECdCEHAn8gBARAIAQgByMHKAIAEQEADAELIAcjCCgCABEAAAshBCADIAY2AiwgAygCKCIGIAVNDQAgBiAFa0ECdCIGRQ0AIAQgB2ogBCAFQQJ0aiAG/AoAAAsCQCANRQ0AIA1BAnQhByAEIAVBAnRqIQUgCQRAIAdFDQEgBSAJIAf8CgAADAELIAdFDQAgBUEAIAf8CwALIAMgBDYCJEEAIQQgA0EANgIQIAMgAygCKCANajYCKEEAIRYCQCADKAIERQ0AA0AgAygCACAWQQJ0aigCACEOAkACfwJAIARFBEAg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AqgJCyAAKAKgCiIBBEAgASMJKAIAEQIAIABBADYCqAogAEIANwKgCgsgACgCmAoEQCADIABBmApqKQIANwMYIABBiAlqIANBGGoQCiAAQgA3ApgKCyAAKAJEIwkoAgARAgAgAEHgCWohASAAKALgCQRAIAMgASkCADcDECAAQYgJaiADQRBqEAoLIAAoAugJBEAgAyAAQegJaikCADcDCCAAQYgJaiADQQhqEAoLIAFCADcCAEEAIQIgAUEANgIQIAFCADcCCCAAKAKICSIBBEACQCAAKAKMCQRAA0AgACgCiAkgAkEDdGooAgAjCSgCABECACACQQFqIgIgACgCjAlJDQALIAAoAogJIgFFDQELIAEjCSgCABECAAsgAEEANgKQCSAAQgA3AogJCyAAKAKUCSIBBEAgASMJKAIAEQIAIABBADYCnAkgAEIANwKUCQsgACgC9AkiAQRAIAEjCSgCABECAAsgAEEANgL8CSAAQgA3AvQJIAAoArwJIgEEQCABIwkoAgARAgALIABBADYCxAkgAEIANwK8CSAAKALICSIBBEAgASMJKAIAEQIACyAAQQA2AtAJIABCADcCyAkgACgC1AkiAQRAIAEjCSgCABECAAsgAEEANgLcCSAAQgA3AtQJIAAjCSgCABECAAsgA0EgaiQAC7MBAgV/AX4gACkCACIIQiCIpyEDIAinIQQCQCABKAIAIgUgAigCBCIHTwRAIAMgAigCICADIAIoAhhrIgZBACADIAZPG2ogBCACKAIUIgZLGyEDIAIoAhwgBCAGayIGQQAgBCAGTxtqIQQgAigCCCAFIAdraiEFDAELIAUgAigCAE0NACACKQIcIghCIIinIQMgAigCCCEFIAinIQQLIAAgBK0gA61CIIaENwIAIAEgBTYCAAsbACAAIAEQXSEAAkAgAUUNACAADQAQQwALIAALGwAgACABECohAQJAIABFDQAgAQ0AEEMACyABC5ABAQN/QQIhBEF/IQMCQCABQQJJBH8gAQUgAiAALwEAIgNBCHQgA0EIdnIiA0H//wNxIgU2AgAgAUF+cUECRg0BIANBgPgDcUGAsANHDQEgAC8BAiIAQQh0IABBCHZyIgBBgPgDcUGAuANHDQEgAEH//wNxIAVBCnRqQYC4/xprIQNBBAshBCACIAM2AgALIAQLzQIBBH8gAiAALAAAIgNB/wFxIgQ2AgBBASEFAkAgA0EASARAAkAgAUEBRg0AAkAgA0FgTwRAAkAgA0FvTQRAIAIgBEEPcSIENgIAIwFB3gpqIARqLQAAIAAtAAEiA0EFdnZBAXFFDQQgA0E/cSEGQQIhAwwBCyACIARB8AFrIgQ2AgAgA0F0Sw0DIwFBsAxqIAAtAAEiA0EEdmosAAAgBHZBAXFFDQMgAiADQT9xIARBBnRyIgQ2AgBBAiEFIAFBAkYNA0EDIQMgAC0AAkGAf3MiBkH/AXFBP0sNAwsgAiAGQf8BcSAEQQZ0ciIENgIAIAMgASIFRw0BDAILIANBQkkNASACIARBH3EiBDYCAEEBIQMLIAAgA2otAABBgH9zQf8BcSIAQT9NDQIgAyEFCyACQX82AgALIAUPCyACIARBBnQgAHI2AgAgA0EBagtuAQJ/QQIhBEF/IQMCQCABQQJJBH8gAQUgAiAALwEAIgM2AgAgAUF+cUECRg0BIANBgPgDcUGAsANHDQEgAC8BAiIAQYD4A3FBgLgDRw0BIANBCnQgAGpBgLj/GmshA0EECyEEIAIgAzYCAAsgBAtpAQJ/AkAgACgCaCIBIAAoAmRGDQAgAUUNACAAKAIgIAAoAkQgAUEYbGoiASgCEEcNACABQQRrKAIAIQIgACABQRBrKQIANwI8IAAgAjYCOA8LIAAgACkCIDcCOCAAQUBrIAAoAig2AgALhgQCCX8BfiMAQRBrIgUkACAAQQE6AHgCQCAALQCAAQ0AIAAoAiAiCSAAKAIoIgRrIQEgACgCJCECIAQEQCAAQQA2AnwgAEEAOgCAAQsgAEEANgIoIAAgAjYCJCAAIAE2AiAgACgCRCEHAkACfyAAKAJkIgYEQANAAkAgByADQRhsaiIIKAIUIgQgAU0NACAEIAgoAhAiAk0NACABIAJNBEAgACAIKQIANwIkIAAgAjYCICACIQELIAAgAzYCaEEAIQMgACgCSEUNBCAAKAJsIgIgAU0EQCABIAAoAnAgAmpJDQULIABBADYCSEEADAMLIANBAWoiAyAGRw0ACwsgACAGNgJoIAcgBkEYbGoiAkEEaygCACEBIAJBEGspAgAhCiAAQQA2AkggACAKNwIkIAAgATYCIEEBCyEDIABBADYCcAsgAEEBOgCAASAAQQA2AgAgACADNgJ0IABBADYCfCAAIAE2AmwgACgCUCEEIAAoAkwhAiAFIAApAiQ3AwggACACIAEgBUEIaiAAQfAAaiAEEQYANgJIIAAoAnBFBEAgAEEANgJIIAAgACgCZDYCaAwBCyAAKAJoIAAoAmRGDQAgABApA0AgACgCICAJTw0BIAAoAmggACgCZEYNASAAKAJIRQ0BIABBABBbIAAoAmggACgCZEcNAAsLIAAoAnwgBUEQaiQACysBAn8gACgCaCICIAAoAmRJBH8gACgCICAAKAJEIAJBGGxqKAIQRgVBAAsLGwEBfyAAECIhAQJAIABFDQAgAQ0AEEMACyABCw0AIAAoAmggACgCZEYLTQECfyABLQAAIQICQCAALQAAIgNFDQAgAiADRw0AA0AgAS0AASECIAAtAAEiA0UNASABQQFqIQEgAEEBaiEAIAIgA0YNAAsLIAMgAmsLFwAgAEEwa0EKSSAAQSByQeEAa0EGSXILggIBAn8CQAJAAkACQCABIAAiA3NBA3ENACACQQBHIQQCQCABQQNxRQ0AIAJFDQADQCADIAEtAAAiBDoAACAERQ0FIANBAWohAyACQQFrIgJBAEchBCABQQFqIgFBA3FFDQEgAg0ACwsgBEUNAiABLQAARQ0DIAJBBEkNAANAQYCChAggASgCACIEayAEckGAgYKEeHFBgIGChHhHDQIgAyAENgIAIANBBGohAyABQQRqIQEgAkEEayICQQNLDQALCyACRQ0BCwNAIAMgAS0AACIEOgAAIARFDQIgA0EBaiEDIAFBAWohASACQQFrIgINAAsLQQAhAgsgA0EAIAIQNBogAAtJAQF/IwBBEGsiAyQAIAMgAjYCDCAAKAJgBEAgAEGEAWoiAkGACCABIAMoAgwQXxogACgCXEEBIAIgACgCYBEDAAsgA0EQaiQAC+gCAQJ/AkAgACABRg0AIAEgACACaiIEa0EAIAJBAXRrTQRAIAAgASACECQPCyAAIAFzQQNxIQMCQAJAIAAgAUkEQCADBEAgACEDDAMLIABBA3FFBEAgACEDDAILIAAhAwNAIAJFDQQgAyABLQAAOgAAIAFBAWohASACQQFrIQIgA0EBaiIDQQNxDQALDAELAkAgAw0AIARBA3EEQANAIAJFDQUgACACQQFrIgJqIgMgASACai0AADoAACADQQNxDQALCyACQQNNDQADQCAAIAJBBGsiAmogASACaigCADYCACACQQNLDQALCyACRQ0CA0AgACACQQFrIgJqIAEgAmotAAA6AAAgAg0ACwwCCyACQQNNDQADQCADIAEoAgA2AgAgAUEEaiEBIANBBGohAyACQQRrIgJBA0sNAAsLIAJFDQADQCADIAEtAAA6AAAgA0EBaiEDIAFBAWohASACQQFrIgINAAsLIAALCwAgAEEAEDIgAEcLPgEBfyAAQf//B00EfyMBQcDTAGoiASABIABBCHZqLQAAQQV0aiAAQQN2QR9xai0AACAAQQdxdkEBcQVBAAsLSQECfyAAEGUgAGohAwJAIAJFDQADQCABLQAAIgRFDQEgAyAEOgAAIANBAWohAyABQQFqIQEgAkEBayICDQALCyADQQA6AAAgAAsNACAAQSBGIABBCUZyCwsAIABBARAyIABHCwQAIwALEAAjACAAa0FwcSIAJAAgAAsGACAAJAALCgAgAEEwa0EKSQsHACAALwEcCwgAIABBARAyCwgAIABBABAyCxkAIw0oAgBFBEAjDiABNgIAIw0gADYCAAsL8gIBBX8gACgCFCIBQQJHBEAgACgCBCEDAn8CQAJAIAAtABBBAUYEQEECIQEgACADQQJqIgI2AgQgACgCCCACRgRAQQAgAC8BDiICRQ0EGiAAIAJBAWs7AQ4gAy8BAiEBIAAgA0EGaiICNgIEIAAgATsBDCAAIAIgAy8BBEEBdGo2AgggACADLwEGIgI7ARwgACgCACEEDAILIAAgAi8BADsBHAwCCwJAIAAoAgAiBCgCBCIFIAEEfyAALwEcQQFqBUEACyICQf//A3EiAU0NAANAIAMgAUEBdGovAQANASAFIAJBAWoiAkH//wNxIgFLDQALCyABIAVPBEBBAiEBQQAMAwsgACACOwEcIAAgAyABQQF0ai8BACIBOwEMC0EAIQMgACAEKAIMIAJB//8DcUsEfyAEKAI0IAFBA3RqIgEtAAAhAyAAIAFBCGo2AhhBAAUgAQs7AR4gACADOwEgC0EBIQFBAQshAiAAIAE2AhQLIAILqAEBBX8gACgCVCIDKAIAIQUgAygCBCIEIAAoAhQgACgCHCIHayIGIAQgBkkbIgYEQCAFIAcgBhAkGiADIAMoAgAgBmoiBTYCACADIAMoAgQgBmsiBDYCBAsgBCACIAIgBEsbIgQEQCAFIAEgBBAkGiADIAMoAgAgBGoiBTYCACADIAMoAgQgBGs2AgQLIAVBADoAACAAIAAoAiwiATYCHCAAIAE2AhQgAguyBQIGfgR/IAEgASgCAEEHakF4cSIBQRBqNgIAIAAgASkDACEDIAEpAwghBiMAQSBrIgAkACAGQv///////z+DIQICfiAGQjCIQv//AYMiBKciCEGB+ABrQf0PTQRAIAJCBIYgA0I8iIQhAiAIQYD4AGutIQQCQCADQv//////////D4MiA0KBgICAgICAgAhaBEAgAkIBfCECDAELIANCgICAgICAgIAIUg0AIAJCAYMgAnwhAgtCACACIAJC/////////wdWIgEbIQIgAa0gBHwMAQsCQCACIAOEUA0AIARC//8BUg0AIAJCBIYgA0I8iIRCgICAgICAgASEIQJC/w8MAQsgCEH+hwFLBEBCACECQv8PDAELQYD4AEGB+AAgBFAiCRsiCiAIayIBQfAASgRAQgAhAkIADAELIAIgAkKAgICAgIDAAIQgCRshAkEAIQkgCCAKRwRAIAMhBCACIQUCQEGAASABayIIQcAAcQRAIAMgCEFAaq2GIQVCACEEDAELIAhFDQAgBSAIrSIHhiAEQcAAIAhrrYiEIQUgBCAHhiEECyAAIAQ3AxAgACAFNwMYIAApAxAgACkDGIRCAFIhCQsCQCABQcAAcQRAIAIgAUFAaq2IIQNCACECDAELIAFFDQAgAkHAACABa62GIAMgAa0iBIiEIQMgAiAEiCECCyAAIAM3AwAgACACNwMIIAApAwhCBIYgACkDACIDQjyIhCECAkAgCa0gA0L//////////w+DhCIDQoGAgICAgICACFoEQCACQgF8IQIMAQsgA0KAgICAgICAgAhSDQAgAkIBgyACfCECCyACQoCAgICAgIAIhSACIAJC/////////wdWIgEbIQIgAa0LIQMgAEEgaiQAIAZCgICAgICAgICAf4MgA0I0hoQgAoS/OQMAC9wXAxJ/AXwDfiMAQbAEayILJAAgC0EANgIsAkAgAb0iGUIAUwRAIwFBCmohFEEBIRAgAZoiAb0hGQwBCyAEQYAQcQRAIwFBDWohFEEBIRAMAQsjAUEKaiIGQQZqIAZBAWogBEEBcSIQGyEUIBBFIRcLAkAgGUKAgICAgICA+P8Ag0KAgICAgICA+P8AUQRAIABBICACIBBBA2oi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AgQgASAANgIAIA9BAmohDyACBEADQCAHIA9BAnRqIgAgECgCTCANQRxsaiIBKAIYNgIAIAEoAgAhBCABKAIIIQggASgCECEJIAEoAgQhCiAAIAEoAgw2AhQgACAKNgIMIAAgCTYCBCAAIAhBAXY2AhAgACAEQQF2NgIIIA9BBmohDyANQQFqIg0gAkcNAAsLIAZBAWohBiACQQZsIANqIREjAUH09ABqKAIAIBBBxABqEH0NAAsLIwwiACMBQfT0AGooAgAtAK8BNgIIIAAgBzYCBCAAIAY2AgAgEEGQAWokAAvZAQEDfyMAQTBrIgEkACABIwwiAigCADYCKCABIAIoAgxBAXQ2AiAgASAANgIsIAEgASkCKDcDECABIAIoAhA2AiQgASABKQIgNwMIIAEgAigCCDYCHCABIAIoAgRBAXQ2AhggASABKQIYNwMAIAEoAhQoAgghAwJ/An8gASgCECgCACIAQQFxBEBB//8DIABBEHYiAkH//wNGDQIaIABBgP4DcUEIdgwBC0H//wMgAC8BKiICQf//A0YNARogAC8BKAshACADIAIgAEH//wNxECsLIAFBMGokAAt3AQJ/IwBBMGsiASQAIAEjDCICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwAgARBYIAFBMGokAAubAQECfyMAQTBrIgEkACABIwwiAigCADYCKCABIAIoAgxBAXQ2AiAgASAANgIsIAEgASkCKDcDECABIAIoAhA2AiQgASABKQIgNwMIIAEgAigCCDYCHCABIAIoAgRBAXQ2AhggASABKQIYNwMAAn8gASgCECgCACIAQQFxBEAgAEEDdkEBcQwBCyAALwEsQQJ2QQFxCyABQTBqJAALmwEBAn8jAEEwayIBJAAgASMMIgIoAgA2AiggASACKAIMQQF0NgIgIAEgADYCLCABIAEpAig3AxAgASACKAIQNgIkIAEgASkCIDcDCCABIAIoAgg2AhwgASACKAIEQQF0NgIYIAEgASkCGDcDAAJ/IAEoAhAoAgAiAEEBcQRAIABBBXZBAXEMAQsgAC8BLEEJdkEBcQsgAUEwaiQAC94BAQJ/IwBBMGsiASQAIAEjDCICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwACfwJAIAEoAgwiAEH//wNxRQRAIAEoAhAoAgAiAEEBcQRAIABBgP4DcUEIdiEADAILIAAvASghAAsgAEH//wNxQf//A0cNAEEBDAELIAEoAhQoAggoAkwgAEH//wNxQQF0ai8BAEH//wNGCyABQTBqJAALqgEBAn8jAEEwayIBJAAgASMMIgIoAgA2AiggASACKAIMQQF0NgIgIAEgADYCLCABIAEpAig3AxAgASACKAIQNgIkIAEgASkCIDcDCCABIAIoAgg2AhwgASACKAIEQQF0NgIYIAEgASkCGDcDAAJ/IAEoAhAoAgAiAEEBcQRAIABBGnRBH3VB4gRxDAELQeIEIAAtAC1BAnENABogACgCIAtBAEcgAUEwaiQAC9MBAQV/IAEgACgCFEkEQEEkIwgoAgARAAAhAgJAIAAoAlwNACAAKAJoIABHDQAgACAAKAKoAUEBajYCqAELAn8gACgCGCIEIAFNBEAgACgCLCAAKAIwIAEgBGtBAnRqKAIAQQF0aiIDQQJqIQUgAy8BAAwBCyAAKAIoIAAoAgQgAWxBAXRqIQNBAAshBiACQgA3ABEgAiAGOwEOIAJBADsBDCACIAU2AgggAiADNgIEIAIgADYCACACQv//AzcCHCACIAEgBE86ABAgAkEANgAYCyACC5sBAQJ/IwBBMGsiASQAIAEjDCICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwACfyABKAIQKAIAIgBBAXEEQCAAQQR2QQFxDAELIAAvASxBBXZBAXELIAFBMGokAAt3AQJ/IwBBMGsiASQAIAEjDCICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwAgARA/IAFBMGokAAvRBgEIfyMAQaABayIHJAAgByMMIggoAgA2ApgBIAcgCCgC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ASABKQIYNwMAIwBBEGsiBCQAIAEoAhQoAgghACABKAIQKQIAIQdBASECAkACQAJAIAEvAQwiA0H+/wNrDgIAAgELQQAhAgwBCyAAKAJIIANBA2xqLQAAIQILIAcgByAEQQ9qQQEgACADIAJBAXEiAhBZQQFqIgUjCCgCABEAACIGIAUgACADIAIQWRogBEEQaiQAIAFBMGokACAGC3oBAn8jAEEwayIBJAAgASMMIgIoAgA2AiggASACKAIMQQF0NgIgIAEgADYCLCABIAEpAig3AxAgASACKAIQNgIkIAEgASkCIDcDCCABIAIoAgg2AhwgASACKAIEQQF0NgIYIAEgASkCGDcDACABEFogAUEwaiQAQQF2C3sBAn8jAEEwayIBJAAgASMMIgIoAgA2AiggASACKAIMQQF0NgIgIAEgADYCLCABIAEpAig3AxAgASACKAIQNgIkIAEgASkCIDcDCCABIAIoAgg2AhwgASACKAIEQQF0NgIYIAEgASkCGDcDACABKAIAIAFBMGokAEEBdguWAQECfyMAQUBqIgEkACABIwwiAigCADYCOCABIAIoAgxBAXQ2AjAgASAANgI8IAEgASkCODcDGCABIAIoAhA2AjQgASABKQIwNwMQIAEgAigCCDYCLCABIAIoAgRBAXQ2AiggASABKQIoNwMIIAFBIGogAUEIahBBIAIgASgCIDYCACACIAEoAiRBAXY2AgQgAUFAayQAC54BAQJ/IwBBQGoiASQAIAEjDCICKAIANgI4IAEgAigCDEEBdDYCMCABIAA2AjwgASABKQI4NwMYIAEgAigCEDYCNCABIAEpAjA3AxAgASACKAIINgIsIAEgAigCBEEBdDYCKCABIAEpAig3AwggASABKAIMNgIgIAEgASgCEDYCJCACIAEoAiA2AgAgAiABKAIkQQF2NgIEIAFBQGskAAvXAgEGfyMAQfAAayIBJAAgASMMIgIoAgA2AmggASACKAIMQQF0NgJgIAEgADYCbCABIAIoAgg2AlwgASACKAIQNgJkIAEgAigCBEEBdDYCWCABIAIoAhhBAXQ2AlQgASACKAIUNgJQIAIoAiAhACACKAIcIQMgASABKQJoNwMoIAEgASkCYDcDICABIAM2AkggASABKQJYNwMYIAEgAEEBdDYCTCABIAEpAlA3AxAgASABKQJINwMI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AAsLIAEgACkDeDcCICABIAApA4gBNwIwIAEgACkDgAE3AigMAQsgAUIANwIgIAFCADcCMCABQgA3AigLIABBkAFqJAAgAyABKAIsNgIQIAMgASgCJDYCCCADIAEoAjA2AgAgAyABKAIoQQF2NgIMIAMgASgCIEEBdjYCBCABQdAAaiQAC50BAQJ/IwBBMGsiASQAIAEjDCICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwBBASEAAkAgASgCECgCACICQQFxDQAgAigCJEUNACACKAI4QQFqIQALIAFBMGokACAAC+4BAQN/IwBB0ABrIgEkACABIwwiAigCADYCSCABQUBrIgMgAigCDEEBdDYCACABIAA2AkwgASABKQJINwMYIAEgAigCEDYCRCABIAMpAgA3AxAgASACKAIINgI8IAEgAigCBEEBdDYCOCABIAEpAjg3AwgjAEEgayIAJAAgACABKQIYNwMYIAAgASkCEDcDECAAIAEpAgg3AwggAUEgaiAAQQhqQQAQViAAQSBqJAAgAiABKAIsNgIQIAIgASgCJDYCCCACIAEoAjA2AgAgAiABKAIoQQF2NgIMIAIgASgCIEEBdjYCBCABQdAAaiQAC+4BAQN/IwBB0ABrIgEkACABIwwiAigCADYCSCABQUBrIgMgAigCDEEBdDYCACABIAA2AkwgASABKQJINwMYIAEgAigCEDYCRCABIAMpAgA3AxAgASACKAIINgI8IAEgAigCBEEBdDYCOCABIAEpAjg3AwgjAEEgayIAJAAgACABKQIYNwMYIAAgASkCEDcDECAAIAEpAgg3AwggAUEgaiAAQQhqQQAQVyAAQSBqJAAgAiABKAIsNgIQIAIgASgCJDYCCCACIAEoAjA2AgAgAiABKAIoQQF2NgIMIAIgASgCIEEBdjYCBCABQdAAaiQAC+4BAQN/IwBB0ABrIgEkACABIwwiAigCADYCSCABQUBrIgMgAigCDEEBdDYCACABIAA2AkwgASABKQJINwMYIAEgAigCEDYCRCABIAMpAgA3AxAgASACKAIINgI8IAEgAigCBEEBdDYCOCABIAEpAjg3AwgjAEEgayIAJAAgACABKQIYNwMYIAAgASkCEDcDECAAIAEpAgg3AwggAUEgaiAAQQhqQQEQViAAQSBqJAAgAiABKAIsNgIQIAIgASgCJDYCCCACIAEoAjA2AgAgAiABKAIoQQF2NgIMIAIgASgCIEEBdjYCBCABQdAAaiQACyoBAn8CQCAAKAIgIgNFDQAgASADSw0AIAAoAjwgAUECdGooAgAhAgsgAgtZACMBQejyAGokByMBQeDyAGokCCMBQezyAGokCSMBQeTyAGokCiMBQZj0AGokCyMBQbD0AGokDCMBQbT6AGokDSMBQbj6AGokDiMBQaD0AGpBAEGcBvwLAAvuAQEDfyMAQdAAayIBJAAgASMMIgIoAgA2AkggAUFAayIDIAIoAgxBAXQ2AgAgASAANgJMIAEgASkCSDcDGCABIAIoAhA2AkQgASADKQIANwMQIAEgAigCCDYCPCABIAIoAgRBAXQ2AjggASABKQI4NwMIIwBBIGsiACQAIAAgASkCGDcDGCAAIAEpAhA3AxAgACABKQIINwMIIAFBIGogAEEIakEBEFcgAEEgaiQAIAIgASgCLDYCECACIAEoAiQ2AgggAiABKAIwNgIAIAIgASgCKEEBdjYCDCACIAEoAiBBAXY2AgQgAUHQAGokAAvFAQEDfyMAQdAAayICJAAgAiMMIgMoAgA2AkggAkFAayIEIAMoAgxBAXQ2AgAgAiAANgJMIAIgAikCSDcDGCACIAMoAhA2AkQgAiAEKQIANwMQIAIgAygCCDYCPCACIAMoAgRBAXQ2AjggAiACKQI4NwMIIAJBIGogAkEIaiABQf//A3EQPSADIAIoAiw2AhAgAyACKAIkNgIIIAMgAigCMDYCACADIAIoAihBAXY2AgwgAyACKAIgQQF2NgIEIAJB0ABqJAAL8AEBA38jAEHQAGsiAiQAIAIjDCIDKAIANgJIIAJBQGsiBCADKAIMQQF0NgIAIAIgADYCTCACIAIpAkg3AxggAiADKAIQNgJEIAIgBCkCADcDECACIAMoAgg2AjwgAiADKAIEQQF0NgI4IAIgAikCODcDCCMAQSBrIgAkACAAIAIpAhg3AxggACACKQIQNwMQIAAgAikCCDcDCCACQSBqIABBCGogAUEAED4gAEEgaiQAIAMgAigCLDYCECADIAIoAiQ2AgggAyACKAIwNgIAIAMgAigCKEEBdjYCDCADIAIoAiBBAXY2AgQgAkHQAGokAAvwAQEDfyMAQdAAayICJAAgAiMMIgMoAgA2AkggAkFAayIEIAMoAgxBAXQ2AgAgAiAANgJMIAIgAikCSDcDGCACIAMoAhA2AkQgAiAEKQIANwMQIAIgAygCCDYCPCACIAMoAgRBAXQ2AjggAiACKQI4NwMIIwBBIGsiACQAIAAgAikCGDcDGCAAIAIpAhA3AxAgACACKQIINwMIIAJBIGogAEEIaiABQQEQPiAAQSBqJAAgAyACKAIsNgIQIAMgAigCJDYCCCADIAIoAjA2AgAgAyACKAIoQQF2NgIMIAMgAigCIEEBdjYCBCACQdAAaiQAC5oBAQJ/IwBBMGsiASQAIAEjDCICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwBBACEAAkAgASgCECgCACICQQFxDQAgAigCJEUNACACKAI0IQALIAFBMGokACAAC5oBAQJ/IwBBMGsiASQAIAEjDCICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwBBACEAAkAgASgCECgCACICQQFxDQAgAigCJEUNACACKAIwIQALIAFBMGokACAAC5wBAQJ/IwBBMGsiASQAIAEjDCICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwACfyABKAIQKAIAIgBBAXEEQCAAQYD+A3FBCHYMAQsgAC8BKAtB//8DcSABQTBqJAAL+gEBA38jAEHQAGsiASQAIAEjDCICKAIANgJIIAFBQGsiAyACKAIMQQF0NgIAIAEgADYCTCABIAEpAkg3AxggASACKAIQNgJEIAEgAykCADcDECABIAIoAgg2AjwgASACKAIEQQF0NgI4IAEgASkCODcDCCACKAIUQQF0IQMjAEEgayIAJAAgACABKQIYNwMYIAAgASkCEDcDECAAIAEpAgg3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IgEkACABIAA2AjwgASMMIgApAwA3AkAgASAAKQMINwJIIAFBJGogAUE8ahAQIAEgASkCNDcDGCABIAEpAiw3AxAgASABKQIkNwMIIAEoAgggAUHQAGokAEEBdgt9AQF/IwBB0ABrIgEkACABIAA2AjwgASMMIgApAwA3AkAgASAAKQMINwJIIAFBJGogAUE8ahAQIAEgASkCNDcDECABIAEpAiw3AwggASABKQIkNwMAIAFBHGogARBBIAAgASgCHDYCACAAIAEoAiBBAXY2AgQgAUHQAGokAAuIAQEBfyMAQdAAayIBJAAgASAANgI8IAEjDCIAKQMANwJAIAEgACkDCDcCSCABQSRqIAFBPGoQECABIAEpAjQ3AxAgASABKQIsNwMIIAEgASkCJDcDACABIAEoAgQ2AhwgASABKAIINgIgIAAgASgCHDYCACAAIAEoAiBBAXY2AgQgAUHQAGokAAtCAQF/IwBBMGsiASQAIAEgADYCHCABIwwiACkDADcCICABIAApAwg3AiggAUEEaiABQRxqEBAgASgCFCABQTBqJAALhQEBAX8jAEHQAGsiASQAIAEgADYCPCABIwwiACkDADcCQCABIAApAwg3AkggAUEkaiABQTxqEBAgASABKQI0NwMYIAEgASkCLDcDECABIAEpAiQ3AwgCfyABKAIYKAIAIgBBAXEEQCAAQQV2QQFxDAELIAAvASxBCXZBAXELIAFB0ABqJAALZAEBfyMAQdAAayIBJAAgASAANgI8IAEjDCIAKQMANwJAIAEgACkDCDcCSCABQSRqIAFBPGoQECABIAEpAjQ3AxggASABKQIsNwMQIAEgASkCJDcDCCABQQhqED8gAUHQAGokAAtkAQF/IwBB0ABrIgEkACABIAA2AjwgASMMIgApAwA3AkAgASAAKQMINwJIIAFBJGogAUE8ahAQIAEgASkCNDcDGCABIAEpAiw3AxAgASABKQIkNwMIIAFBCGoQWCABQdAAaiQAC2QBAX8jAEHQAGsiASQAIAEgADYCPCABIwwiACkDADcCQCABIAApAwg3AkggAUEkaiABQTxqEBAgASABKQI0NwMYIAEgASkCLDcDECABIAEpAiQ3AwggAUEIahBAIAFB0ABqJAALTAECfyMAQSBrIgEkACABIAA2AgwgASMMIgApAwA3AhAgASAAKQMI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AX4jAEEwayIBJAAgASAANgIcIAEjDCIAKAIANgIgIAEgACkCBDcCJCABIAAoAgwiAjYCLCABIAAoAhBBAXQ2AhggASACNgIUIAEgASkCFDcDCCABQRxqQQAgASgCCCABKAIMEG8gACABKQIgNwMAIAAgASkCKDcDCCABQTBqJABCAFILZgICfwF+IwBBIGsiASQAIAEgADYCDCABIwwiACgCADYCECABIAApAgQ3AhQgASAAKAIMIgI2AhwgAUEMaiACQQF0QQBBABBvIAAgASkCEDcDACAAIAEpAhg3AwggAUEgaiQAQgBSC18BA38jAEEgayIBJAAgASAANgIMIAEjDCIAKQMANwIQIAEgACkDCDcCGCABQQxqIQIDQCACEHAiA0EBRg0ACyADQQJGIAAgASkCEDcDACAAIAEpAhg3AwggAUEgaiQAC0wBAn8jAEEgayIBJAAgASAANgIMIAEjDCIAKQMANwIQIAEgACkDCDcCGCABQQxqECwgACABKQIQNwMAIAAgASkCGDcDCCABQSBqJAALugIBBX8jAEEwayICJAAgAiAANgIcIAIjDCIDKQMANwIgIAIgAykDCDcCKCACIAMpAxA3AgwgAiADKQMYNwIUIAIgATYCCCACIAIoAgg2AhwgAi8BGCEAIAJBADYCJCACIAA7ASwgAigCICEAIAIoAgwhBgJAAkAgAigCECIEIAIoAihLBEAgBEEcbCEBAn8gAARAIAAgASMHKAIAEQEADAELIAEjCCgCABEAAAshACACIAQ2AiggAigCJCIFRQ0BIAVBHGwiBUUNASAAIAFqIAAgBfwKAAAMAQsgBEUNASAEQRxsIQELIAYEQCABRQ0BIAAgBiAB/AoAAAwBCyABRQ0AIABBACAB/AsACyACIAA2AiAgAiACKAIkIARqNgIkIAMgAikCIDcDACADIAIpAig3AwggAkEwaiQAC9kBAgh/AX4jAEHQAGsiASQAIAEjDCICKAIANgJIIAFBQGsiAyACKAIMQQF0NgIAIAEgADYCTCACKAIgIQQgAikDGCEJIAIoAhQhBSACKAIEIQYgAigCCCEHIAIoAhAhCCABIAEpAkg3AxggASAINgJEIAEgAykCADcDECABIAc2AjwgASAGQQF0NgI4IAEgBTYCKCABIAk3AiwgASAENgI0IAEgADYCJCABIAEpAjg3AwggAUEkaiABQQhqEC0gAiABKQIoNwMAIAIgASkCMDcDCCABQdAAaiQAC1MBAX8jAEEgayIBJAAgASAANgIMIAEjDCIAKQMANwIQIAEgACkDCDcCGCABKAIQIgAEQCAAIwkoAgARAgALIAFBADYCGCABQgA3AhAgAUEgaiQAC8oBAQd/IwBBMGsiASQAIAEgADYCHCABIwwiAykDADcCICABIAMpAwg3AihBACEAIAEvASwhBiABKAIcIQcCQCABKAIkIgRFDQAgASgCICEFIARBHGwiAiMIKAIAEQAAIQAgBQRAIAJFDQEgACAFIAL8CgAADAELIAJFDQAgAEEAIAL8CwALIAFBADsBGiABIAY7ARggASAENgIUIAEgBDYCECABIAA2AgwgASAHNgIIIAMgASkCDDcDACADIAEpAhQ3AwggAUEwaiQAC5oBAQN/IwBB0ABrIgEkACABIwwiAigCADYCSCABQUBrIgMgAigCDEEBdDYCACABIAA2AkwgASABKQJINwMYIAEgAigCEDYCRCABIAMpAgA3AxAgASACKAIINgI8IAEgAigCBEEBdDYCOCABIAEpAjg3AwggAUEkaiABQQhqEHEgAiABKQIoNwMAIAIgASkCMDcDCCABQdAAaiQAC84wAht/A34jAEEQayIYJAAjAEFAaiIHJAAgB0EANgI8IAdCADcCJCAHQgA3AhwCfyAAKAIAIgJBAXEEQCAALQAEIQ0gAC0ABiEMIAAtAAVBD3EMAQsgAigCDCENIAIoAgQhDCACKAIICyEIIAdBADsBPCAHIAA2AiwgB0HgASMIKAIAEQAAIgI2AjAgB0KBgICAgAE3AjQgAkEANgIYIAJCADcCECACIA02AgwgAiAINgIIIAIgDDYCBCACIAA2AgACfyABKAIAIgJBAXEEQCABLQAEIQ0gAS0ABiEMIAEtAAVBD3EMAQsgAigCDCENIAIoAgQhDCACKAIICyECIAdBADsBKCAHIAE2AhggBygCHCEIIAcoAiRFBEACfyAIBEAgCEHgASMHKAIAEQEADAELQeABIwgoAgARAAALIQggB0EINgIkCyAHQQE2AiAgByAINgIcIAhBADYCGCAIQgA3AhAgCCANNgIMIAggAjYCCCAIIAw2AgQgCCABNgIAIAdBADYCECAHQgA3AwggACgCFCAAKAIYIAEoAhQg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QQFxC0UEQCADIQAMBAsgESAWRgRAIAMhAAwECyAGIA5NDQAgAyEADAMLQgAhJEEAIQpBACEEQgAhIyABIAlJBEAgCSABayEEIBwgBmsiAEEAIAAgHE0brSAbIBsgFWsiAEEAIAAgG00bIAYgHEkbrUIghoQhIwsgASAMSQRAIAwgAWshCiAOIAZrIgBBACAAIA5NG60gESARIBVrIgBBACAAIBFNGyAGIA5JG61CIIaEISQLAn8gASAQTwRAQgAhJ0EADAELICVCIIinIgAgACAVayIFQQAgACAFTxsgJaciACAGSxutQiCGIAAgBmsiBUEAIAAgBU8brYQhJyAQIAFrCyEFAn8gByAJSwRAICghJiAJDAELICghJiAJIAcgCUYgCSAMRnENABogJSEmIAQiCiEFICMiJCEnIBALIRACQCADQQFqIgAgGU0NAEEIIBlBAXQiASAAIAAgAUkbIgEgAUEITRsiGUEobCEBIAgEQCAIIAEjBygCABEBACEIDAELIAEjCCgCABEAACEICyAIIANBKGxqIgMgJzcCICADIAU2AhwgAyAkNwIUIAMgCjYCECADICM3AgggAyAENgIEIAMgFDYCACAAIQMgJiElCyAGIA9qrSAgICFqQQAgFSAPG2qtQiCGhCEjIAchASACQQFqIgIgIkcNAAsLIAANAAsgCARAIAgjCSgCABECAAsgCyALKQIINwIQIA1BMGokACAXIAspAxA3AgAgCygCGCIABEACQCALKAIcIgJFDQBBACEDIAJBBE8EQCACQXxxIQUDQCAAIANBA3RqIgEoAgAjCSIEKAIAEQIAIAEoAgggBCgCABECACABKAIQIAQoAgARAgAgASgCGCAEKAIAEQIAIANBBGohAyAdQQRqIh0gBUcNAAsLIAJBA3EiAkUNAANAIAAgA0EDdGooAgAjCSgCABECACADQQFqIQMgHkEBaiIeIAJHDQALCyAAIwkoAgARAgALIAsoAiQiAARAIAAjCSgCABECAAsgC0EwaiQAIBJBMGokAAv8AQIGfwF+IwBBMGsiASQAIwwiAigCFCABIAIoAhxBAXQ2AiwgASACKAIYNgIoIAEgASkCKDcDCEEBdCEGIAEpAgghBwJ/IAAoAgAiA0EBcQRAIAAtAAVBD3EhBCAALQAEIQUgAC0ABgwBCyADKAIMIQUgAygCCCEE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Ahg3A9ABIAogASkCEDcDyAEgCiABKQIINwPAASAKIAEpAgA3A7gBIB8gHygCBCIIQQFqIgcgHygCCCIBSwR/IAJBCCABQQF0IgEgByABIAdLGyIBIAFBCE0bIgFBBXQjBygCABEBACECIB8gATYCCCAfKAIEIghBAWoFIAcLNgIEIB8gAjYCACACIAhBBXRqIgEgCikDuAE3AgAgASAKKQPQATcCGCABIAopA8gBNwIQIAEgCikDwAE3AgggHygCACAfKAIEIgdBBXRqIh5BIGsoAgAiAQRAIAEgASgClAFBAWo2ApQBCyAVIDZrIgFBACABIBVNGyESIA8gIkshEyAPIA8gImsiCEkhDSADIAMgCWsiAkkhAQJAIB5BFGsoAgAiA0UNACADQQFxDQAgAyADKAIAQQFqNgIAIAMoAgAaIB8oAgQhBwsgFSASIBMbIRJBACAIIA0bIRNBACACIAEbIQggIWohDSAeQRxrQQA2AgAgBSgCoAkoAkggBEEDbGoiAS0AASEDIAEtAAAhAgJ+AkAgBEH/AUsNACAIQf4BSw0AIBNBD0sNACASQf4BSw0AIA1BD0sNACADQQJ0IAJBAXRqQQFyQf8BcSAEQQh0ciAWciEBIA1BDHQgE0EIdHIgCEEQdHIgEnKtQiCGDAELIBOtIBKtQiCGhCE7An8gBSgCjAkiAQRAIAUgAUEBayIBNgKMCSAFKAKICSABQQN0aigCAAwBC0HMACMIKAIAEQAACyEBIApCADcDwAEgCkIANwPIASAKQQA2AtABIAogCDYCiAIgCiA7NwOAAiAKQQA2AvgBIApBADYC9AEgCkEANgLwASAKIA02AuwBIApBADYC6AEgCkEANgLkASAKIAQ7AeABIAogHDsB3gEgCkEAOwHaASAKQgA3A7gBIApBATYCjAIgCiADQQF0IAJqQf8BcTsB3AEgASAKKAKMAjYCACABIAooAogCNgIEIAEgCikDgAI3AgggASAKKAL4ATYCECABIAooAvQBNgIUIAEgCigC8AE2AhggASAKKALsATYCHCABIAooAugBNgIgIAEgCigC5AE2AiQgASAKLwHgATsBKCABIAovAd4BOwEqIAEgCi8B3AE7ASwgASAKLwHaATsBLiABIAooAtABNgJIIAFBQGsgCikDyAE3AgAgASAKKQPAATcCOCABIAopA7gB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CiA9NwO4ASAKQbgBakEAIAFBACAAEDlBCiAFKAKMChAJDAQLQdwAIAUoAowKEAkgAS0AACEECyAEwCAFKAKMChAJIAFBAWohAQwACwALIAVBAToAxQpBACEEDAMLIAUpArQJIT0gBSgCoAkLIQAgBSgCZCEDIAUoAkQhAkEcIwgoAgARAAAiBCA9NwIAAkAgAEUNACAAKAJcDQAgACgCaCAARw0AIAAgACgCqAFBAWo2AqgBCyAEIAA2AggjBiIBRQRAIwFBoPQAaiIAIAAoAgBBAWoiATYCACABJAYLIARBADYCECAEIAE2AgwgBCADQRgjCigCABEBACIBNgIUIANBGGwiAARAIAEgAiAA/AoAAAsgBCADNgIYIAVCADcCtAkgBRAoDAELIAUQKAsgCkGQAmokACAFQgA3AqwKIClBEGokACAgQTBqJAAgBAsLACABQQFGIAIQCAs+AQF/IwBBEGsiAiQAIAIgADYCCCACIwJBFGpBACABGzYCDCACIAIpAgg3AwAgACACKQIANwJcIAJBEGokAAvKCAIHfwF+IwwhBiMAQRBrIgUkAEEBQcgKIwooAgARAQAiACMCIgFBA2o2AhwgACABQQRqNgIYIAAgAUEFajYCFCAAIAFBBmo2AhAgACABQQdqNgIMIAAgAUEIajYCCCAAQgA3AgAgAEEgakEAQeQI/AsAIABBAEEYIwcoAgARAQAiATYCRCABIwFB/AtqIgIpAhA3AhAgASACKQIINwIIIAEgAikCADcCACAAQQE2AmQCQAJAIAAoAkQiAygCFCIEIAAoAiAiAU0NACAEIAMoAhAiAk0NACABIAJNBEAgACADKQIANwIkIAAgAjYCICACIQELQQAhAiAAQQA2AmggACgCSEUNASAAKAJsIgMgAU0EQCABIAAoAnAgA2pJDQILIABBADYCSCAAQgA3AmwMAQtBASECIABBATYCaCADKQIIIQcgAEEANgJIIAAgBzcCJCAAIAQ2AiAgAEIANwJsCyAAQQA2ArAJIABBADYCACAAIAI2AnQgAEIANwKoCSAAQcAAIwgiASgCABEAADYCqAkgAEEENgKwCUGAAiABKAIAEQAAIQEgAEIANwKUCSAAQoCAgICABDcCjAkgACABNgKICSAAQZwJakEANgIAQQFBOCMKKAIAEQEAIgFCADcCACABQgA3AiggAUIANwIgIAFCADcCGCABQgA3AhAgAUIANwIIIAFBgAEjCCgCABEAADYCACABQQQ2AgggASgCDCECIAEoAhRBA00EQAJ/IAIEQCACQcAAIwcoAgARAQAMAQtBwAAjCCgCABEAAAshAiABQQQ2AhQLIAEgAjYCDCABKAIYIQIgASgCIEEDTQRAAn8gAgRAIAJB4AAjBygCABEBAAwBC0HgACMIKAIAEQAACyECIAFBBDYCIAsgASACNgIYIAEoAiQhAiABKAIsQTFNBEACfyACBEAgAkHIASMHKAIAEQEADAELQcgBIwgoAgARAAALIQIgAUEyNgIsCyABIABBiAlqIgM2AjQgASACNgIkAn8gASgCKCIEBEAgASAEQQFrIgQ2AiggAiAEQQJ0aigCAAwBC0GkASMIKAIAEQAACyICQQE7AQAgAkECakEAQZIB/AsAIAJCADcCBCACQQE2ApQBIAJBADYCDCACQgA3ApgBIAJBADYCoAEgASACNgIwIAEQOyAAQgA3AvQJIABCADcCtAkgACABNgKECSAAQfwJakIANwIAIABBhApqQQA2AgAgAEIANwKUCiAAQgA3AogKIABBADYCoAkgAEGcCmpCADcCACAAQaQKakIANwIAIABBADYCwAogAEHDCmpBADYAACAAQeAJaiEBIAAoAuAJBEAgBSABKQIANwMIIAMgBUEIahAKCyAAKALoCQRAIAUgAEHoCWopAgA3AwAgAyAFEAoLIAFCADcCACABQQA2AhAgAUIANwIIIAVBEGokACAGQYDQAEEBECo2AgQgBiAANgIACxQBAX8jDCIAQo+AgIDQATcDACAACxgBAX8gACgCAEEPTwR/IAAoAogBBUEACwvBAwEJfyMAQSBrIgIkACAABEAgAkIANwMYIAJCADcDECACQgA3AwggAiAAKQIANwMAIAJBCGogAhAKIAIoAggiAwRAAkAgAigCDCIERQ0AIARBBE8EQCAEQXxxIQkDQCADIAFBA3RqIgUoAgAjCSIGKAIAEQIAIAUoAgggBigCABECACAFKAIQIAYoAgARAgAgBSgCGCAGKAIAEQIAIAFBBGohASAIQQRqIgggCUcNAAsLIARBA3EiBEUNAANAIAMgAUEDdGooAgAjCSgCABECACABQQFqIQEgB0EBaiIHIARHDQALCyADIwkoAgARAgAgAkEA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AkEWajYCACMBQfzyAGojAkEXajYCACMBQZTzAGojAkEYajYCACMBQazzAGojAkEZajYCACMBQbDzAGojAkEaajYCACMBQbTzAGojAUHE9gBqNgIAIwFBmPQAaiMBQYjzAGo2AgAjAUGc9ABqIwU2AgALQgEDfyMBIgFBtPUAaiIAIAFBnPUAajYCYCAAIwQiAiMDazYCOCAAIAI2AjQgAEEqNgIYIAAgAUGA8wBqKAIANgI8CwundAEAIwELoHQtKyAgIDBYMHgALTBYKzBYIDBYLTB4KzB4IDB4AHJlZHVjZSBzeW06JXMsIGNoaWxkX2NvdW50OiV1AHJlc3VtZSB2ZXJzaW9uOiV1AHJlbW92ZWQgcGF1c2VkIHZlcnNpb246JXUAbGV4X2V4dGVybmFsIHN0YXRlOiVkLCByb3c6JXUsIGNvbHVtbjoldQBsZXhfaW50ZXJuYWwgc3RhdGU6JWQsIHJvdzoldSwgY29sdW1uOiV1AHByb2Nlc3MgdmVyc2lvbjoldSwgdmVyc2lvbl9jb3VudDoldSwgc3RhdGU6JWQsIHJvdzoldSwgY29sOiV1AHJlY292ZXJfdG9fcHJldmlvdXMgc3RhdGU6JXUsIGRlcHRoOiV1ACwgc2l6ZToldQBzaGlmdCBzdGF0ZToldQByZWNvdmVyX3dpdGhfbWlzc2luZyBzeW1ib2w6JXMsIHN0YXRlOiV1AGRpZmZlcmVudF9pbmNsdWRlZF9yYW5nZSAldSAtICV1AGFjY2VwdABwYXJzZV9hZnRlcl9lZGl0AFx0AGFib3J0aW5nIHJlZHVjZSB3aXRoIHRvbyBtYW55IHZlcnNpb25zAGhhc19jaGFuZ2VzAHN3aXRjaCBmcm9tX2tleXdvcmQ6JXMsIHRvX3dvcmRfdG9rZW46JXMAc3RhdGVfbWlzbWF0Y2ggc3ltOiVzAHNlbGVjdF9zbWFsbGVyX2Vycm9yIHN5bWJvbDolcywgb3Zlcl9zeW1ib2w6JXMAc2VsZWN0X2VhcmxpZXIgc3ltYm9sOiVzLCBvdmVyX3N5bWJvbDolcwBzZWxlY3RfZXhpc3Rpbmcgc3ltYm9sOiVzLCBvdmVyX3N5bWJvbDolcwBjYW50X3JldXNlX25vZGUgc3ltYm9sOiVzLCBmaXJzdF9sZWFmX3N5bWJvbDolcwBza2lwX3Rva2VuIHN5bWJvbDolcwBpZ25vcmVfZW1wdHlfZXh0ZXJuYWxfdG9rZW4gc3ltYm9sOiVzAHJldXNhYmxlX25vZGVfaGFzX2RpZmZlcmVudF9leHRlcm5hbF9zY2FubmVyX3N0YXRlIHN5bWJvbDolcwByZXVzZV9ub2RlIHN5bWJvbDolcwBwYXN0X3JldXNhYmxlX25vZGUgc3ltYm9sOiVzAGJlZm9yZV9yZXVzYWJsZV9ub2RlIHN5bWJvbDolcwBjYW50X3JldXNlX25vZGVfJXMgdHJlZTolcwBicmVha2Rvd25fdG9wX29mX3N0YWNrIHRyZWU6JXMAZGV0ZWN0X2Vycm9yIGxvb2thaGVhZDolcwAoJXMAaXNfZXJyb3IAc2tpcF91bnJlY29nbml6ZWRfY2hhcmFjdGVyAG5hbgBcbgBpc19taXNzaW5nAHJlc3VtZV9wYXJzaW5nAHJlY292ZXJfZW9mAGluZgBuZXdfcGFyc2UAY29uZGVuc2UAZG9uZQBpc19mcmFnaWxlAGNvbnRhaW5zX2RpZmZlcmVudF9pbmNsdWRlZF9yYW5nZQBza2lwIGNoYXJhY3RlcjolZABjb25zdW1lIGNoYXJhY3RlcjolZABzZWxlY3RfaGlnaGVyX3ByZWNlZGVuY2Ugc3ltYm9sOiVzLCBwcmVjOiVkLCBvdmVyX3N5bWJvbDolcywgb3RoZXJfcHJlYzolZABzaGlmdF9leHRyYQBub19sb29rYWhlYWRfYWZ0ZXJfbm9uX3Rlcm1pbmFsX2V4dHJhAF9fUk9PVF9fAF9FUlJPUgBOQU4ATUlTU0lORwBJTkYASU5WQUxJRABsZXhlZF9sb29rYWhlYWQgc3ltOgAgMDAwMDAwMDAwMDAwEDAwAC4AKCVzKQAobnVsbCkAKE5VTEwpACgiJXMiKQAnXHQnACdccicAJ1xuJwBza2lwIGNoYXJhY3RlcjonJWMnAGNvbnN1bWUgY2hhcmFjdGVyOiclYycAJ1wwJwAiJXMiAChNSVNTSU5HIAAoVU5FWFBFQ1RFRCAAJXM6IAAKCgAAAAAAAAAAAAAAAQAAAAAAAAAAAAAA//////////8AAAAA/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4PDw8AAAAAAAAAAAEAAAABAAAAAgAAAAEAAAACAAAAAQAAAAIAAAABAAAAAgAAAAAAAAAAAAAAEhETFBUWFxgZGhscHR4fICERIiMkESUmJygpKissES0uLxAQMBAQEBAQEBAxMjMQNDUQEBERERERERERERERERERERERERERERERERE2ERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERNxERERE4ETk6Ozw9PhERERERERERERERERERERERERERERERERERERERERERERERERERERERERE/EBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEUBBEUJDREVGR0hJShFLTE1OT1BREFJTVFVWV1hZWltcXRBeX2AQERERYWJjEBAQEBAQEBAQEBERERFkEBAQEBAQEBAQEBAQEBAQERFlEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQERFmZxAQaGkREREREREREREREREREREREREREREREWoREWsQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEWxtEBAQEBAQEBAQbhAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQb3BxchAQEBAQEBAQc3R1EBAQEBB2dxAQEBB4EBB5EBAQEBAQEBAQEBAQEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//////////////////////////////////////////AAAAAAAAAAD+//8H/v//BwAAAAAABCAE//9/////f//////////////////////////////////D/wMAH1AAAAAAAAAAAAAAIAAAAAAA37xA1///+////////////7///////////////////////wP8///////////////////////////+////fwL//////wEAAAAA/7+2AP///4cHAAAA/wf//////////v/D////////////////7x/+4f+fAAD///////8A4P///////////////wMA//////8HMAT////8/x8AAP///wH/BwAAAAAAAP//3z8AAPD/+AP////////////v/9/h/8///v/vn/n///3F459ZgLDP/wMQ7of5///9bcOHGQJewP8/AO6/+////e3jvxsBAM//AB7un/n///3t458ZwLDP/wIA7Mc91hjH/8PHHYEAwP8AAO/f/f///f/j3x1gB8//AADv3/3///3v498dYEDP/wYA79/9/////+ffXfCAz/8A/Oz/f/z///svf4Bf/8D/DAD+/////3//Bz8g/wMAAAAA1vf//6///ztfIP/zAAAAAAEAAAD/AwAA//7///8f/v8D///+////HwAAAAAAAAAA////////f/n/A////////////z//////vyD///////f///////////89fz3//////z3/////PX89/3//////////Pf//////////BwAAAAD//wAA/////////////z8//v//////////////////////////////////////////////////////////n////v//B////////////8f/Af/fDwD//w8A//8PAP/fDQD////////P//8BgBD/AwAAAAD/A///////////////Af//////B///////////PwD///9//w//AcD/////Px8A//////8P////A/8DAAAAAP///w//////////f/7/HwD/A/8DgAAAAAAAAAAAAAAA////////7//vD/8DAAAAAP//////8////////7//AwD///////9/AP/j//////8//wH//////+cAAAAAAN5vBP///////////////////////////////wAAAACA/x8A//8/P/////8/P/+q////P////////99f3B/PD/8f3B8AAAAAAAAAAAAAAAAAAAKAAAD/HwAAAAAAAAAAAAAAAIT8Lz5Qvf/z4EMAAP//////AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMD///////8DAAD//////3///////3//////////////////////H3gMAP////+/IP////////+AAAD//38Af39/f39/f3//////AAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAA/gM+H/7///////////9/4P7/////////////9+D///////7/////////////fwAA////BwAAAAAAAP///////////////////////////////z8AAAAAAAAAAAD///////////////////////////////////////8AAP//////////////////////HwAAAAAAAAAA//////8//x////8PAAD//////3/wj///////////////////AAAAAID//P////////////////n///////98AAAAAACA/7//////AAAA////////DwD//////////y8A/wMAAPzo//////8H/////wcA////H/////////f/AID/A////3////////9/AP8//wP//3/8/////////38FAAA4//88AH5+fgB/f///////9/8A////////////////////B/8D//////////////////////////8PAP//f/j//////w//////////////////P/////////////////8DAAAAAH8A+OD//X9f2/////////////////8DAAAA+P///////////////z8AAP///////////P///////wAAAAAA/w8AAAAAAAAAAAAAAAAAAN//////////////////////HwAA/wP+//8H/v//B8D/////////////f/z8/BwAAAAA/+///3///7f/P/8/AAAAAP///////////////////wcAAAAAAAAAAP///////x8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8f////////AQAAAAAA/////wDg////B///////B////z//////D/8+AAAAAAD/////////////////////////P/8D/////w//////D///////AP///////w8AAAAAAAAAAAAAAAAAAAAAAAAA////////fwD//z8A/wAAAAAAAAAAAAAAAAAAAAAAAAA//f////+/kf//PwD//38A////fwAAAAAAAAAA//83AP//PwD///8DAAAAAAAAAAD/////////wAAAAAAAAAAAb/Dv/v//PwAAAAAA////H////x8AAAAA//7//x8AAAD///////8/AP//PwD//wcA//8DAAAAAAAAAAAAAAAAAP///////////wEAAAAAAAD///////8HAP///////wcA//////8A/wMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8fgAD//z8AAAAAAAAAAAAAAAAAAAAAAAAA//9/AP//////////PwAAAMD/AAD8////////AQAA////Af8D////////x/9wAP////9HAP//////////HgD/FwAAAAD///v///+fQAAAAAAAAAAAf73/v/8B/////////wH/A++f+f///e3jnxmB4A8AAAAAAAAAAAAAAAAAAAAAAAAA//////////+7B/+DAAAAAP//////////swD/AwAAAAAAAAAAAAAAAAAAAAAAAAAA////////P38AAAA/AAAAAP////////9/EQD/AwAAAAD///////8/Af8DAAAAAAAA////5/8H/wMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////AQAAAAAAAAAAAAAAAP///////////wMAgAAAAAAAAAAAAAAAAAAAAAAAAAAA//z///////waAAAA////////538AAP///////////yAAAAAA/////////wH//f////9/fwEA/wMAAPz////8///+fwAAAAAAAAAAAH/7/////3+0ywD/A7/9////f3sB/wMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//fwD/////////////////////////AwAAAAAAAAAAAAAAAP////////////////9/AAD///////////////////////////////8PAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//////38AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//////////fwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////wH///9//wMAAAAAAAAAAAAAAAD///8/AAD///////8AAA8A/wP4///g//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA//////////8AAAAAAAAAAAAAAAAAAAAA////////////h/////////+A//8AAAAAAAAAAAsAAAD/////////////////////////////////////////AP///////////////////////////////////////wcA////fwAAAAAAAAcA8AD/////////////////////////////////////////////////////////////////D/////////////////8H/x//Af9DAAAAAAAAAAAAAAAA/////////////9///////////99k3v/r7/////////+/59/f////e1/8/f//////////////////////////////////////////////////////P/////3///f////3///f////3///f////3/////9/////f//98////////9////52wcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//////H4A//0MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//////8P/wP///////////////////////////////8fAAAAAAAAAP//////////jwj/AwAAAAAAAAAAAAAAAAAAAAAAAAAA7////5b+9wqE6paqlvf3Xv/7/w/u+/8PAAAAAAAAAAAAAAAAAAD///8D////A////wMAAAAAAAAAAAAAAAAAACAAAAAJAAAACgAAAA0AAAALAAAADAAAAIUAAAAAIAAAASAAAAIgAAADIAAABCAAAAUgAAAGIAAACCAAAAkgAAAKIAAAKCAAACkgAABfIAAAADAAAAAAAAAAAAAAAAAAABkACwAZGRkAAAAABQAAAAAAAAkAAAAACwAAAAAAAAAAGQAKChkZGQMKBwABAAkLGAAACQYLAAALAAYZAAAAGRkZAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAABkACw0ZGRkADQAAAgAJDgAAAAkADgAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAATAAAAABMAAAAACQwAAAAAAAwAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAADwAAAAQPAAAAAAkQAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABIAAAAAAAAAAAAAABEAAAAAEQAAAAAJEgAAAAAAEgAAEgAAGgAAABoaGgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaAAAAGhoaAAAAAAAACQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAFwAAAAAXAAAAAAkUAAAAAAAUAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABYAAAAAAAAAAAAAABUAAAAAFQAAAAAJFgAAAAAAFgAAFgAAMDEyMzQ1Njc4OUFCQ0RFRgAIAABWAQAAOQAAAAAAAAAAAAAAASAAAADg//8Avx0AAOcCAAB5AAACJAAAAQEAAAD///8AAAAAAQIAAAD+//8BOf//ABj//wGH//8A1P7/AMMAAAHSAAABzgAAAc0AAAFPAAABygAAAcsAAAHPAAAAYQAAAdMAAAHRAAAAowAAAdUAAACCAAAB1gAAAdoAAAHZAAAB2wAAADgAAAMAAAAAsf//AZ///wHI//8CKCQAAAAAAAEBAAAA////ADP//wAm//8Bfv//ASsqAAFd//8BKCoAAD8qAAE9//8BRQAAAUcAAAAfKgAAHCoAAB4qAAAu//8AMv//ADb//wA1//8AT6UAAEulAAAx//8AKKUAAESlAAAv//8ALf//APcpAABBpQAA/SkAACv//wAq//8A5ykAAEOlAAAqpQAAu///ACf//wC5//8AJf//ABWlAAASpQACJEwAAAAAAAEgAAAA4P//AQEAAAD///8AVAAAAXQAAAEmAAABJQAAAUAAAAE/AAAA2v//ANv//wDh//8AwP//AMH//wEIAAAAwv//AMf//wDR//8Ayv//APj//wCq//8AsP//AAcAAACM//8BxP//AKD//wH5//8CGnAAAQEAAAD///8BIAAAAOD//wFQAAABDwAAAPH//wAAAAABMAAAAND//wEBAAAA////AAAAAADACwABYBwAAAAAAAHQlwABCAAAAPj//wIFigAAAAAAAUD0/wCe5/8AwokAANvn/wCS5/8Ak+f/AJzn/wCd5/8ApOf/AAAAAAA4igAABIoAAOYOAAEBAAAA////AAAAAADF//8BQeL/Ah2PAAAIAAAB+P//AAAAAABWAAABqv//AEoAAABkAAAAgAAAAHAAAAB+AAAACQAAAbb//wH3//8A2+P/AZz//wGQ//8BgP//AYL//wIFrAAAAAAAARAAAADw//8BHAAAAQEAAAGj4v8BQd//Abrf/wDk//8CC7EAAQEAAAD///8BMAAAAND//wAAAAABCdb/ARrx/wEZ1v8A1dX/ANjV/wHk1f8BA9b/AeHV/wHi1f8BwdX/AAAAAACg4/8AAAAAAQEAAAD///8CDLwAAAAAAAEBAAAA////Abxa/wGgAwAB/HX/Adha/wAwAAABsVr/AbVa/wG/Wv8B7lr/AdZa/wHrWv8B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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACsrKysrKysrKysrKytVVlZWVlZWVlZWVlZWDgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkKysrKysrKysrKysHAFZWVlZWVlZWVlZWVgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJCsrKysrKysrKysrKysrKysHAAAAAFZWVlZWVlZWVlZWVlZWVlZWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACorKysrKysrKysrVlZWVlZWVlZWVg4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACorKysrKysrKysrVlZWVlZWVlZWVg4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKysrKysrKysrKytVVlZWVlZWVlZWVg4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABidRb3cAAAAAAAAAAAAAfAAAfwAAAAAAAAAAg46SlwCqAAAAAAAAAAAAALTEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxskAAADbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADeAAAAAOEAAAAAAAAA5AAAAAAAAAAAAAAA5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADqAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADtAAAAAAAAAAAAAAAAAAAAAAAAAAAAABIQExQVFhcYGRobHB0eHyAhEBAiIxAkJSYnKCkqKxAsLS4RES8REREREREwMTIzNDU2NxEQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQOBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQORA6Ozw9Pj8QEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQQBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQQRAQQhBDREUQRkdIEEkQEEpLTE1OEE9QUVJTVFVWV1hZWlsQXF1eXxAQEBBgEBAQEBAQEBAQEBAQEBAQYRAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQYmMQEGRlEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEGYQEBAQEBAQEBAQEBAQEBAQEBAQZ2hpahAQa2wREW0QEBAQEBBubxAQEBAQcHEQEHJzdBB1dncRERF4eXp7fBAQEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//////////////////////////////////////////wAAAAD+/wD8AQAA+AEAAHgAAAAA//vf+wAAgAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAD8/+Cv/////////////9///////yBAsAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAD8AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8AAAAAADm/v///wBASQAAAAAAGAD//wDYAAAAAAAAAAEAPAAAAAAAAAAAAAAAABDgAR4AYP+/AAAAAAAA/wcAAAAAAAAAAAAAAAAAAAAAAAAA+M/jAAAAAwAg/38AAABOAAAAAAAAAAAAAAAAAAAIAAf8AAAAAAAAAAAAEAAgHgAwAAEAAAAAAAAAABAAIAAAAAD8bwAAAAAAAAAQACAAAAAAQAAAAAAAAAAAEAAgAAAAAAPgAAAAAAAAABAAIAAAAAD9AAAAAAAAAAAAACAAAAAA/wcQAAAAAAAAAAAgAAAAAID/EAAAAAAAABAAIAAAAAAAAAAAAAAAAAAYAKAAfwAA/wMAAAAAAAAAAAAEAAAAABAAAAAAAACAAIDA3wAMAAAAAAAAAAAAAAAEAB8AAAAAAAD+////APz//wAAAAAAAAAA/AAAAAAAAMD/3/8HAAAAAAAAAAAAAIAGAPwAAAAAAAAAAADAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAADg////HwAA/wMAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgAAABAAAYAAAAAAAAAAAAOAAAAAAQAAAAcAAAAAAAAAAAAAAAAAAAADAAAP5/LwAA/wP/fwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOMQAAAAAAAAAAAAAAAAAAAAAAAMT/////AAAAwAAAAAAAAAAAAQDgnwAAAAB/P/9/AAAAAAAAAAAAAAAAAAAQABAAAPz///8fAAAAAAAMAAAAAAAAQAAM8AAAAAAAAID4AAAAAAAAAMAAAAAAAAAAAP8A////IZADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////38A4PsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAD4ADgAOAAYID4/////P//////f9//8X//fwAA/////wAA/////wEAewPQwa9CAAwfvP//AAAAAAAO////////////////////////fwAAAP8HAAD/////////////PwAAAAAAAPz/////////////////////z////z//////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOCHA/4AAAAAAAAAAAAAAAAAAAGAAAAAAAAAAAAAAAAAAAAAAP//////f/////8AAAAAAAD////7/////////////w8A//////////////////////////////////8/AAAA/w8e////AfzB4AAAAAAAAAAAAAAAHgEAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAP//AAAAAP////8PAAAA////f/////////////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//////////wAAAAAAAAAAAAAAAAAAAAAAAP///////38AAAAAAADAAOAAAAAAAAAAAAAAAIAPcAAAAAAAAAAAAAAAAAAA/wD//38AAwAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAEAAAAAAD/8DAAAAAAAA8AAAAAAAAAAAABDAAAD//wMXAAAAAAD4AAAAAAiAAAAAAAAAAAAAAAgA/z8AwAAAAAAAAAAAAAAAAAAAAPAAAIADAAAAAAAAAIACAADAAABDAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAOAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAgAAAAAAAAAAAAAAAAAAAAD8/wMAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADD///8D////////9/9/DwAAAAAAAAAAAAAAAAAAAAAAgP7/APwBAAD4AQAA+D8AAAAAAAAAAAAAAAAAAAB/fwAwh///////j/8AAAAAAADg//9//w8BAAAAAAD//////z8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////DwAAAAAPAAAAAAAAAAAAAAAAAACAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgP8AAID/AAAAAID/AAAAAAAAAAAA+AAAwI8AAACAAAAAAAAAAAAAAAAAAAAAMP///P//////AAAAAAAAAIf/Af8BAAAA4AAAAOAAAAAAAAEAAGD4fwAAAAAAAAAA/gAAAP8AAAD/AAAAHgD+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8AAAAAAAAAAAAAAAA////fwAAAAAAAAAAAAAAAAAAAAAAAADgfwAAAMD//wMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwD/8/z8AAIADAAAAAAAA/gMgAAAAAAAAAAAAAAAAGAAPAAAAAAA4AAAAAAAAAAAA4T8A6P7/HwAAAAAAAABgPwAAAAAAAAAAAAAAAAACAAAAAAAAAAYAAAAAAAAAAAAYACAAAMAfHwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABE+ABoAAAAAAAAAAAAAAAATAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAID///8AAAAAAAAAAAAAAACADgAAAP8fAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAIAPwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAPwHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAGID/AAAAAAAAAAAAAN8HAAAAAAAAAAAAAAAAAAAAAAAAgD4AAPz/HwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///////8DgAAAAAAAAAAAAAAAAAAAHwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAA/AAAAAAAAAP//MAAA+AMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwDwAAAAAAAAAAAAAA////////////////////////////////////////PwD/////f/7//////////////////////////////wEAAP//////////PwAAAAAAAAAAAAAAAAAAAAAAAAD//w8A/////////////38A////AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAIAAAACAAAIAAAACAAAIAAAACAAAAAAgAAAAIAAAgAAAAAAAAA//////////////////////8PAPj+/wAAAAAAAAAAAAAAAAAAAAB/AACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8ACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgP9/AAAAAAAAAAAAAAAAAHAHAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/v////////8fAAAAAAAAAAAA/v///////z8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAP//////D////////////////w8A/3/+//7//v///z8A/x//////AAAA/AAAABwAAAD8////HwAAAAAAAMD///8HAP//////D/8BAwA/AAAAAAAAAAAAAAAAAAAAAAAAAP//////////////////////////////////PwD/H/8H//////////////////8PAP//////////////Af8PAAD/D/////////8A/wP//////wD///8/AAAAAAAAAAAAAP/v////////////////e/z/////58f////n/////////////////////w8A/z8PBwcAPwAAAAAAAAAAAAAAAAAQAAAAEQAAABIAAAATAAAAAAAAABYAAAAAAAAAFwAAAAAgAAAAAAAABQAAAAAAAAAAAAAAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGQAAABoAAABEOwAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAP//////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAiDkAAAAAAAAAKhBzb3VyY2VNYXBwaW5nVVJMGHdlYi10cmVlLXNpdHRlci53YXNtLm1hcA==",
      ),
      (c) => c.charCodeAt(0),
    ).buffer;
    WASM_CACHE_NAME = "lumis-wasm-v1";
    WASM_DATABASE_NAME = "lumis-wasm-v1";
    WASM_DATABASE_STORE = "parsers";
    cacheLocks = /* @__PURE__ */ new Map();
    runtime = createLanguagesModule({
      async resolveWasm(wasm) {
        if (wasm instanceof URL) return wasm.href;
        if (wasm instanceof Response) return new Uint8Array(await wasm.arrayBuffer());
        if (wasm instanceof ArrayBuffer) return new Uint8Array(wasm);
        return wasm;
      },
      async readFsCache(key) {
        return prefersIndexedDb()
          ? ((await readIndexedDb(key)) ?? readCacheStorage(key))
          : ((await readCacheStorage(key)) ?? readIndexedDb(key));
      },
      async writeFsCache(key, data) {
        if (prefersIndexedDb()) {
          if (!(await writeIndexedDb(key, data))) await writeCacheStorage(key, data);
        } else if (!(await writeCacheStorage(key, data))) await writeIndexedDb(key, data);
      },
      async withFsCacheLock(key, operation) {
        const pending = (cacheLocks.get(key) ?? Promise.resolve())
          .catch(() => void 0)
          .then(operation);
        const lock = pending.then(
          () => void 0,
          () => void 0,
        );
        cacheLocks.set(key, lock);
        try {
          return await pending;
        } finally {
          if (cacheLocks.get(key) === lock) cacheLocks.delete(key);
        }
      },
      async readResolvedWasmFromDisk() {},
      async parserInitOptions() {
        return { wasmBinary: tree_sitter_wasm_default };
      },
    });
    load = createLoadLanguages(loadLanguage);
  }))();
}

// node_modules/@lumis-sh/lumis/dist/index.browser.js
function createHighlighter(...args) {
  return highlighter.createHighlighter(...args);
}
var highlighter, guessLanguage2, availableLanguages2;
function init_index_browser() {
  return (init_index_browser = __esmMin(() => {
    init_chunk_MBM7PUQ4();
    init_chunk_NB3WMMKI();
    highlighter = createHighlighterModule({
      createRuntime,
      getDefaultRuntime,
    });
    guessLanguage2 = guessLanguage;
    availableLanguages2 = availableLanguages;
  }))();
}

// node_modules/@lumis-sh/lumis/dist/chunk-CDF44WOX.js
function rainbowBracketScope(depth) {
  return RAINBOW_BRACKET_SCOPES[
    (Number.isSafeInteger(depth) && depth >= 0 ? depth : 0) % RAINBOW_BRACKET_SCOPES.length
  ];
}
function diffWordScope(kind) {
  return kind === "removed" ? "diff.minus.word" : "diff.plus.word";
}
function decorationScope(decoration) {
  return decoration.type === "diffWord"
    ? diffWordScope(decoration.kind)
    : rainbowBracketScope(decoration.depth);
}
function lineInterval(line) {
  if (typeof line === "number") return Number.isInteger(line) && line >= 1 ? [line, line] : void 0;
  const start = Math.max(1, Math.ceil(line[0]));
  const end = Math.floor(line[1]);
  return start <= end ? [start, end] : void 0;
}
function composeLineDecorations(sourceBytes, events, selection) {
  const output = [];
  const layers = [];
  const line = {
    number: 1,
    pending: false,
  };
  output.push(lineStart(line.number, selection));
  for (const event of events) applyEvent(output, sourceBytes, event, layers, line, selection);
  if (!line.pending) closeLayers(output, layers);
  output.push({ type: "decorationEnd" });
  return output;
}
function applyEvent(output, sourceBytes, event, layers, line, selection) {
  switch (event.type) {
    case "start":
      reopenPendingLayers(output, layers, line);
      output.push(event);
      layers.push({
        type: "syntax",
        event,
      });
      return;
    case "end":
      closeLayer(output, layers, "syntax", event, line.pending);
      return;
    case "annotationStart":
      reopenPendingLayers(output, layers, line);
      output.push(event);
      layers.push({
        type: "annotation",
        event,
      });
      return;
    case "annotationEnd":
      closeLayer(output, layers, "annotation", event, line.pending);
      return;
    case "source":
      reopenPendingLayers(output, layers, line);
      splitSource(output, sourceBytes, event, layers, line, selection);
      return;
    case "decorationStart":
      if (event.decoration.type === "line") return;
      reopenPendingLayers(output, layers, line);
      output.push(event);
      layers.push({
        type: "decoration",
        event,
      });
      return;
    case "decorationEnd":
      closeLayer(output, layers, "decoration", event, line.pending);
  }
}
function closeLayer(output, layers, kind, event, pending) {
  if (layers.at(-1)?.type === kind) {
    layers.pop();
    if (!pending) output.push(event);
  }
}
function lineStart(line, selection) {
  return {
    type: "decorationStart",
    decoration: {
      type: "line",
      number: line,
      highlighted: selection.contains(line),
    },
  };
}
function closeLayers(output, layers) {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];
    output.push(
      layer.type === "syntax"
        ? { type: "end" }
        : layer.type === "decoration"
          ? { type: "decorationEnd" }
          : { type: "annotationEnd" },
    );
  }
}
function reopenLayers(output, layers) {
  for (const layer of layers) output.push(layer.event);
}
function reopenPendingLayers(output, layers, line) {
  if (line.pending) {
    reopenLayers(output, layers);
    line.pending = false;
  }
}
function splitSource(output, sourceBytes, event, layers, line, selection) {
  let cursor = Math.min(event.start, sourceBytes.length);
  const end = Math.max(Math.min(event.end, sourceBytes.length), cursor);
  while (cursor < end) {
    const newline = sourceBytes.indexOf(NEWLINE, cursor);
    if (newline === -1 || newline >= end) break;
    output.push({
      type: "source",
      start: cursor,
      end: newline + 1,
    });
    closeLayers(output, layers);
    output.push({ type: "decorationEnd" });
    line.number += 1;
    output.push(lineStart(line.number, selection));
    cursor = newline + 1;
    if (cursor === end) {
      line.pending = true;
      return;
    }
    reopenLayers(output, layers);
  }
  if (cursor < end)
    output.push({
      type: "source",
      start: cursor,
      end,
    });
}
function mergeClasses(generated, authored) {
  return [generated, authored]
    .flatMap((value) =>
      typeof value === "string" || typeof value === "number"
        ? String(value)
            .split(/[\t\n\f\r ]+/u)
            .filter(Boolean)
        : [],
    )
    .filter((value, index, all) => all.indexOf(value) === index)
    .join(" ");
}
function appendStyles(generated, authored) {
  const generatedStyle =
    typeof generated === "string" || typeof generated === "number" ? String(generated).trim() : "";
  const authoredStyle =
    typeof authored === "string" || typeof authored === "number" ? String(authored).trim() : "";
  if (generatedStyle.length === 0) return authoredStyle;
  if (authoredStyle.length === 0) return generatedStyle;
  return `${generatedStyle.replace(/;?$/u, ";")} ${authoredStyle}`;
}
function matchingAttrName(attrs, name) {
  return Object.keys(attrs).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
}
function replaceMergedAttr(merged, existingName, targetName, value, removal) {
  if (value == null || value === false) {
    if (existingName) delete merged[existingName];
    if (removal === "keep") merged[targetName] = false;
    return;
  }
  merged[targetName] = value;
}
function mergeAuthoredAttr(merged, authoredName, value, removal) {
  const existingName = matchingAttrName(merged, authoredName);
  const targetName = existingName ?? authoredName;
  switch (authoredName.toLowerCase()) {
    case "class": {
      const className = mergeClasses(merged[targetName], value);
      if (className.length > 0) merged[targetName] = className;
      return;
    }
    case "style": {
      const style = appendStyles(merged[targetName], value);
      if (style.length > 0) merged[targetName] = style;
      return;
    }
    default:
      replaceMergedAttr(merged, existingName, targetName, value, removal);
  }
}
function mergeAttrs(generated, authored) {
  const merged = { ...generated };
  if (!authored) return merged;
  for (const [authoredName, value] of Object.entries(authored))
    mergeAuthoredAttr(merged, authoredName, value, "drop");
  return merged;
}
function encodeSource(source) {
  return utf8Encoder.encode(source);
}
function decodeSourceSlice(sourceBytes, startByte, endByte) {
  let start = Math.min(Math.max(startByte, 0), sourceBytes.length);
  while (start < sourceBytes.length && isUtf8Continuation(sourceBytes[start])) start += 1;
  let end = Math.min(Math.max(endByte, 0), sourceBytes.length);
  while (end > 0 && isUtf8Continuation(sourceBytes[end])) end -= 1;
  return utf8Decoder.decode(sourceBytes.subarray(start, Math.max(start, end)));
}
function isUtf8Continuation(byte) {
  return byte !== void 0 && (byte & 192) === 128;
}
function languageId(language) {
  return typeof language === "string" ? language : language.id;
}
function emptySpan(scope, language) {
  return {
    startByte: 0,
    endByte: 0,
    scope,
    language,
  };
}
function getSpanStyle(theme, scope, language) {
  if (scope.length === 0) return;
  return getScopedThemeStyle(theme, scope, language);
}
function getUnderlineDecoration(style) {
  if (style.underline == null || style.underline === false || style.underline === "none") return;
  if (style.underline === true || style.underline === "solid") return "underline";
  if (style.underline === "undercurl") return "underline wavy";
  return `underline ${style.underline}`;
}
function getThemeStyle(theme, scope) {
  if (!theme) return RAINBOW_BRACKET_FALLBACKS[scope];
  let current = scope;
  while (current.length > 0) {
    const style = theme.highlights[current];
    if (style) return style;
    const fallback = RAINBOW_BRACKET_FALLBACKS[current];
    if (fallback) return fallback;
    const idx = current.lastIndexOf(".");
    if (idx === -1) break;
    current = current.slice(0, idx);
  }
}
function getScopedThemeStyle(theme, scope, language) {
  if (language === void 0) return getThemeStyle(theme, scope);
  return getThemeStyle(theme, `${scope}.${languageId(language)}`) ?? getThemeStyle(theme, scope);
}
function textDecoration(style) {
  const underline = getUnderlineDecoration(style);
  if (underline && style.strikethrough) return `${underline} line-through`;
  if (underline) return underline;
  if (style.strikethrough) return "line-through";
  return "none";
}
function styleToCss(style, options = {}) {
  if (!style) return "";
  const separator = options.separator ?? " ";
  const compact = options.compact ?? false;
  return styleDeclarations(style, options.italic ?? true)
    .map(([property, value]) => (compact ? `${property}:${value};` : `${property}: ${value};`))
    .join(separator);
}
function styleDeclarations(style, italic) {
  const declarations = [];
  if (style.fg) declarations.push(["color", style.fg]);
  if (style.bg) declarations.push(["background-color", style.bg]);
  if (style.bold) declarations.push(["font-weight", "bold"]);
  if (italic && style.italic) declarations.push(["font-style", "italic"]);
  const decoration = textDecoration(style);
  if (decoration !== "none") declarations.push(["text-decoration", decoration]);
  return declarations;
}
function escape(text) {
  let result = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    switch (ch) {
      case "&":
        result += "&amp;";
        break;
      case "<":
        result += "&lt;";
        break;
      case ">":
        result += "&gt;";
        break;
      case '"':
        result += "&quot;";
        break;
      case "'":
        result += "&#39;";
        break;
      default:
        result += ch;
    }
  }
  return result;
}
function escapeAttr(value) {
  let result = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    switch (ch) {
      case "&":
        result += "&amp;";
        break;
      case "<":
        result += "&lt;";
        break;
      case ">":
        result += "&gt;";
        break;
      case '"':
        result += "&quot;";
        break;
      case "'":
        result += "&#39;";
        break;
      default:
        result += ch;
    }
  }
  return result;
}
function classList(...classes) {
  const value = classes.filter((className) => !!className && className.length > 0);
  return value.length > 0 ? value.join(" ") : void 0;
}
function isValidAttrName(name) {
  return name.length > 0 && !/[\s"'>/=\u0000-\u001F\u007F-\u009F]/u.test(name);
}
function renderAttrs(attrs) {
  const parts = [];
  for (const [name, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (!isValidAttrName(name))
      throw new TypeError(`invalid HTML attribute name: ${JSON.stringify(name)}`);
    if (value === true) {
      parts.push(name);
      continue;
    }
    parts.push(`${name}="${escapeAttr(String(value))}"`);
  }
  return parts.join(" ");
}
function tag(name, attrs = {}) {
  const renderedAttrs = renderAttrs(attrs);
  return renderedAttrs.length > 0 ? `<${name} ${renderedAttrs}>` : `<${name}>`;
}
function openSpanTag(attrs = {}) {
  return openSpan(renderAttrs(attrs));
}
function openSpan(attrs) {
  return attrs.length > 0 ? `<span ${attrs}>` : "<span>";
}
function preAttrs(options = {}) {
  const className = options.preClass ? `lumis ${options.preClass}` : "lumis";
  const normal = getThemeStyle(options.theme, "normal");
  const style = styleToCss({
    fg: normal?.fg,
    bg: normal?.bg,
  });
  return mergeAttrs(
    {
      class: className,
      style: style.length > 0 ? style : void 0,
    },
    options.attrs,
  );
}
function budgetAttrs(attrs, budget) {
  if (!budget) return attrs;
  return {
    ...attrs,
    "data-lumis-budget": budget,
  };
}
function openPreTag(options = {}) {
  return tag("pre", preAttrs(options));
}
function codeAttrs(language, attrs = {}) {
  return mergeAttrs(
    {
      class: `language-${language ? languageId(language) : "plaintext"}`,
      translate: "no",
      tabindex: 0,
    },
    attrs,
  );
}
function openCodeTag(language, attrs = {}) {
  return tag("code", codeAttrs(language, attrs));
}
function closePreTag() {
  return "</pre>";
}
function closeCodeTag() {
  return "</code>";
}
function closingTags() {
  return `${closeCodeTag()}${closePreTag()}`;
}
function wrapWithHeader(content, header) {
  if (!header) return content;
  return `${header.openTag}${content}${header.closeTag}`;
}
function wrapLine(lineNumber, content, options = {}) {
  return `${tag("span", {
    class: classList("l-line", options.className),
    style: options.style,
    "data-line": lineNumber,
  })}${content}</span>`;
}
function lineNumberGutter(lineNumber, highlighted, attrs) {
  return `${openSpanTag({
    class: classList(LINE_NUMBER_CLASS, highlighted && HIGHLIGHTED_LINE_NUMBER_CLASS),
    ...attrs,
    "aria-hidden": "true",
  })}${lineNumber}</span>`;
}
function openSpanEvent(state, context, event) {
  const key = `${event.language} ${event.scope}`;
  let tags = state.tags.get(key);
  if (tags === void 0) {
    const span = emptySpan(event.scope, event.language);
    const style = getSpanStyle(context.theme, event.scope, event.language);
    const open = context.openSpan(span, style);
    tags = {
      open,
      close: open.length > 0 ? context.closeSpan(span, style) : "",
    };
    state.tags.set(key, tags);
  }
  state.line += tags.open;
  state.openScopes.push({
    close: tags.close,
    language: event.language,
  });
}
function sourceLineEnding(text, followedByLf) {
  if (text.endsWith("\n")) return text.endsWith("\r\n") ? "\r\n" : "\n";
  return followedByLf && text.endsWith("\r") ? "\r" : "";
}
function sourceEvent(state, context, event) {
  if (context.inferLanguage && (!state.language || state.language === "plaintext"))
    state.language = state.openScopes.at(-1)?.language ?? state.language;
  const text = decodeSourceSlice(context.sourceBytes, event.start, event.end);
  const ending = sourceLineEnding(text, context.sourceBytes[event.end] === 10);
  state.ending += ending;
  state.line += context.formatText(ending ? text.slice(0, -ending.length) : text);
}
function startLineDecoration(state, context, decoration) {
  state.decorations.push(decoration);
  if (decoration.type === "line") {
    state.decoration = decoration;
    state.line = "";
    state.ending = "";
    return;
  }
  openSpanEvent(state, context, {
    scope: decorationScope(decoration),
    language: state.language,
  });
}
function endLineDecoration(state, context) {
  const decoration = state.decorations.pop();
  if (decoration?.type === "line") context.onLine(state.line, state.decoration, state.ending);
  else if (decoration !== void 0) state.line += state.openScopes.pop()?.close ?? "";
}
function isCallerAnnotation(event) {
  return event.type === "annotationStart" || event.type === "annotationEnd";
}
function applyLineEvent(state, context, event) {
  if (isCallerAnnotation(event)) return;
  switch (event.type) {
    case "decorationStart":
      startLineDecoration(state, context, event.decoration);
      break;
    case "decorationEnd":
      endLineDecoration(state, context);
      break;
    case "start":
      openSpanEvent(state, context, event);
      break;
    case "end":
      state.line += state.openScopes.pop()?.close ?? "";
      break;
    case "source":
      sourceEvent(state, context, event);
  }
}
function renderDecoratedLines(sourceBytes, composed, theme, language, options, onLine) {
  const context = {
    sourceBytes,
    theme,
    formatText: options.formatText ?? escape,
    openSpan: options.openSpan,
    closeSpan: options.closeSpan ?? (() => "</span>"),
    inferLanguage: options.inferLanguage ?? false,
    onLine,
  };
  const state = {
    line: "",
    ending: "",
    decoration: {
      type: "line",
      number: 1,
      highlighted: false,
    },
    decorations: [],
    language,
    openScopes: [],
    tags: /* @__PURE__ */ new Map(),
  };
  for (const event of composed) applyLineEvent(state, context, event);
  return state.language;
}
function formatHtmlLines(source, events, formatter) {
  const sourceBytes = encodeSource(source);
  const wrapped = formatter.structure !== "inline";
  const numbered = formatter.lineNumbers === true;
  const composed = composeLineDecorations(sourceBytes, events, new LineSelection(formatter.lines));
  const sourceLines = source.split(/\r?\n/u);
  const lineCount = sourceLines.length - Number(source.endsWith("\n"));
  const parts = [];
  renderDecoratedLines(
    sourceBytes,
    composed,
    formatter.theme,
    formatter.language ? languageId(formatter.language) : "plaintext",
    { openSpan: formatter.openSpan },
    (content, decoration) => {
      if (decoration.number > lineCount) return;
      if (!wrapped) {
        parts.push(content);
        return;
      }
      parts.push(
        wrapLine(
          decoration.number,
          numbered
            ? `${lineNumberGutter(decoration.number, decoration.highlighted, decoration.highlighted ? formatter.lineNumberAttrs.highlighted : formatter.lineNumberAttrs.regular)}${content}`
            : content,
          decoration.highlighted
            ? formatter.highlightedAttrs
            : { style: sourceLines[decoration.number - 1] === "" ? formatter.emptyStyle : void 0 },
        ),
      );
    },
  );
  return parts.join("\n");
}
var RAINBOW_BRACKET_SCOPES,
  LineSelection,
  NEWLINE,
  utf8Encoder,
  utf8Decoder,
  RAINBOW_BRACKET_FALLBACKS,
  LINE_NUMBER_CLASS,
  HIGHLIGHTED_LINE_NUMBER_CLASS;
function init_chunk_CDF44WOX() {
  return (init_chunk_CDF44WOX = __esmMin(() => {
    RAINBOW_BRACKET_SCOPES = [
      "punctuation.bracket.rainbow.1",
      "punctuation.bracket.rainbow.2",
      "punctuation.bracket.rainbow.3",
      "punctuation.bracket.rainbow.4",
      "punctuation.bracket.rainbow.5",
      "punctuation.bracket.rainbow.6",
    ];
    LineSelection = class {
      /** Merged, disjoint, ascending, 1-based and inclusive at both ends. */
      spans;
      index = 0;
      constructor(lines) {
        const intervals = (lines ?? [])
          .map((line) => lineInterval(line))
          .filter((interval) => interval !== void 0)
          .sort((left, right) => left[0] - right[0] || left[1] - right[1]);
        this.spans = [];
        for (const [start, end] of intervals) {
          const last = this.spans.at(-1);
          if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
          else this.spans.push([start, end]);
        }
      }
      get isEmpty() {
        return this.spans.length === 0;
      }
      /**
       * Whether `line` is selected.
       *
       * `line` must not go backwards between calls, which is how the composer
       * visits lines.
       */
      contains(line) {
        while (this.index < this.spans.length && this.spans[this.index][1] < line) this.index += 1;
        const span = this.spans[this.index];
        return span !== void 0 && span[0] <= line && line <= span[1];
      }
    };
    NEWLINE = 10;
    utf8Encoder = new TextEncoder();
    utf8Decoder = new TextDecoder();
    RAINBOW_BRACKET_FALLBACKS = {
      "punctuation.bracket.rainbow.1": { fg: "#e06c75" },
      "punctuation.bracket.rainbow.2": { fg: "#e5c07b" },
      "punctuation.bracket.rainbow.3": { fg: "#61afef" },
      "punctuation.bracket.rainbow.4": { fg: "#d19a66" },
      "punctuation.bracket.rainbow.5": { fg: "#98c379" },
      "punctuation.bracket.rainbow.6": { fg: "#c678dd" },
    };
    LINE_NUMBER_CLASS = "l-line-number";
    HIGHLIGHTED_LINE_NUMBER_CLASS = "l-line-number-highlighted";
  }))();
}

// node_modules/@lumis-sh/lumis/dist/chunk-RTY2WNY5.js
function markBuiltinFormatter(entry) {
  builtins.set(entry.formatter, entry);
  return entry.formatter;
}
function isInlineStructure(structure) {
  switch (structure) {
    case void 0:
    case "block":
      return false;
    case "inline":
      return true;
    default:
      throw new TypeError(
        `structure must be "block" or "inline", got ${JSON.stringify(structure)}`,
      );
  }
}
function formatHtmlSpans(source, events, formatter) {
  return formatHtmlLines(source, events, {
    ...formatter,
    structure: "inline",
    lines: void 0,
    lineNumbers: false,
    lineNumberAttrs: {
      regular: {},
      highlighted: {},
    },
    highlightedAttrs: {},
  });
}
var builtins;
function init_chunk_RTY2WNY5() {
  return (init_chunk_RTY2WNY5 = __esmMin(() => {
    init_chunk_CDF44WOX();
    builtins = /* @__PURE__ */ new WeakMap();
  }))();
}

// node_modules/@lumis-sh/lumis/dist/formatters.js
function spanAttrs(span, formatter) {
  const attrs = {};
  if (formatter.includeHighlights) attrs["data-highlight"] = span.scope;
  const css = styleToCss(getScopedThemeStyle(formatter.theme, span.scope, span.language), {
    italic: formatter.italic,
  });
  if (css) attrs.style = css;
  return attrs;
}
function highlightLineStyle(formatter) {
  const highlightLines = formatter.highlightLines;
  if (highlightLines?.style === null) return;
  if (highlightLines?.style && highlightLines.style !== "theme") return highlightLines.style;
  const style = getThemeStyle(formatter.theme, "highlighted");
  return styleToCss(style, { italic: formatter.italic }) || void 0;
}
function lineNumberAttrs(formatter, highlighted) {
  const scope = highlighted ? "line_number.highlighted" : "line_number";
  const style = styleToCss(getThemeStyle(formatter.theme, scope), { italic: formatter.italic });
  return { style: `-webkit-user-select: none; user-select: none;${style ? ` ${style}` : ""}` };
}
function formatHtmlInline(source, events, formatter, budget) {
  const openSpan2 = (span) => openSpanTag(spanAttrs(span, formatter));
  if (isInlineStructure(formatter.structure))
    return formatHtmlSpans(source, events, {
      language: formatter.language,
      theme: formatter.theme,
      openSpan: openSpan2,
    });
  const lineLayout = "display: inline-block; width: 100%; min-height: 1lh; vertical-align: top;";
  const highlightStyle = highlightLineStyle(formatter);
  const body = formatHtmlLines(source, events, {
    language: formatter.language,
    theme: formatter.theme,
    lines: formatter.highlightLines?.lines,
    lineNumbers: formatter.lineNumbers,
    lineNumberAttrs: {
      regular: lineNumberAttrs(formatter, false),
      highlighted: lineNumberAttrs(formatter, true),
    },
    highlightedAttrs: {
      className: formatter.highlightLines?.class,
      style: `${lineLayout}${highlightStyle ? ` ${highlightStyle}` : ""}`,
    },
    emptyStyle: lineLayout,
    openSpan: openSpan2,
  });
  const pre = openPreTag({
    preClass: formatter.preClass,
    theme: formatter.theme,
    attrs: budgetAttrs(formatter.preAttrs, budget),
  });
  const attrs = formatter.highlightLines
    ? mergeAttrs(
        { style: "display: block; width: fit-content; min-width: 100%; overflow-wrap: anywhere;" },
        formatter.codeAttrs,
      )
    : formatter.codeAttrs;
  const code = openCodeTag(formatter.language, attrs);
  return wrapWithHeader(`${pre}${code}${body}${closingTags()}`, formatter.header);
}
function htmlInline(options = {}) {
  const formatter = {
    ...options,
    render(source, events, budget) {
      return formatHtmlInline(source, events, formatter, budget);
    },
  };
  return markBuiltinFormatter({
    kind: "html-inline",
    formatter,
  });
}
function init_formatters() {
  return (init_formatters = __esmMin(() => {
    init_chunk_RTY2WNY5();
    init_chunk_CDF44WOX();
  }))();
}

// \0m0-lumis-browser
function init__m0_lumis_browser() {
  return (init__m0_lumis_browser = __esmMin(() => {
    init_index_browser();
    init_formatters();
    init_chunk_CDF44WOX();
  }))();
}

init__m0_lumis_browser();
export {
  availableLanguages2 as availableLanguages,
  createHighlighter,
  escape,
  getScopedThemeStyle,
  guessLanguage2 as guessLanguage,
  htmlInline,
  runtimeKind,
  textDecoration,
};
