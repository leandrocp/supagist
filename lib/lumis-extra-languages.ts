import type { Language, LanguageBundle } from "@lumis-sh/lumis/languages";

const lazy = (id: string, aliases: string[], load: () => Promise<{ default: Language }>) =>
  Object.assign(() => load().then((module) => module.default), { id, aliases });

// wasm-bundle-full 0.2 leaves these out to fit a 64 MB Wasm store cap
// (leandrocp/lumis#1968). Pass them next to the bundle so snippets in these
// languages keep highlighting. Lazy loaders, like the bundle's own: Lumis
// compiles a parser passed as a plain language when the highlighter is created.
// systemverilog stays out on purpose: its parser is too big.
export const extraLanguages: LanguageBundle = {
  arduino: lazy("arduino", [], () => import("@lumis-sh/wasm-arduino")),
  d: lazy("d", [], () => import("@lumis-sh/wasm-d")),
  fortran: lazy("fortran", [], () => import("@lumis-sh/wasm-fortran")),
  fsharp: lazy("fsharp", ["f#"], () => import("@lumis-sh/wasm-fsharp")),
  haskell: lazy("haskell", [], () => import("@lumis-sh/wasm-haskell")),
  julia: lazy("julia", [], () => import("@lumis-sh/wasm-julia")),
  latex: lazy("latex", ["tex"], () => import("@lumis-sh/wasm-latex")),
  lean: lazy("lean", ["lean4"], () => import("@lumis-sh/wasm-lean")),
  nim: lazy("nim", [], () => import("@lumis-sh/wasm-nim")),
  nushell: lazy("nushell", ["nu"], () => import("@lumis-sh/wasm-nushell")),
  objc: lazy("objc", ["objective-c"], () => import("@lumis-sh/wasm-objc")),
  ocaml: lazy("ocaml", [], () => import("@lumis-sh/wasm-ocaml")),
  ocaml_interface: lazy("ocaml_interface", [], () => import("@lumis-sh/wasm-ocaml_interface")),
  perl: lazy("perl", [], () => import("@lumis-sh/wasm-perl")),
  qmljs: lazy("qmljs", ["qml"], () => import("@lumis-sh/wasm-qmljs")),
  tlaplus: lazy("tlaplus", ["tla", "tla+", "pluscal"], () => import("@lumis-sh/wasm-tlaplus")),
  vhdl: lazy("vhdl", [], () => import("@lumis-sh/wasm-vhdl")),
};

// Each id matches its parser package name.
export const extraLanguagePackages = Object.keys(extraLanguages).map(
  (id) => `@lumis-sh/wasm-${id}`,
);
