import arduino from "@lumis-sh/wasm-arduino";
import d from "@lumis-sh/wasm-d";
import fortran from "@lumis-sh/wasm-fortran";
import fsharp from "@lumis-sh/wasm-fsharp";
import haskell from "@lumis-sh/wasm-haskell";
import julia from "@lumis-sh/wasm-julia";
import latex from "@lumis-sh/wasm-latex";
import lean from "@lumis-sh/wasm-lean";
import nim from "@lumis-sh/wasm-nim";
import nushell from "@lumis-sh/wasm-nushell";
import objc from "@lumis-sh/wasm-objc";
import ocaml from "@lumis-sh/wasm-ocaml";
import ocamlInterface from "@lumis-sh/wasm-ocaml_interface";
import perl from "@lumis-sh/wasm-perl";
import qmljs from "@lumis-sh/wasm-qmljs";
import tlaplus from "@lumis-sh/wasm-tlaplus";
import vhdl from "@lumis-sh/wasm-vhdl";

// wasm-bundle-full 0.2 leaves these out to fit a 64 MB Wasm store cap
// (leandrocp/lumis#1968). Pass them next to the bundle so snippets in these
// languages keep highlighting; a parser still loads only when first used.
// systemverilog stays out on purpose: its parser is too big.
export const extraLanguages = [
  arduino,
  d,
  fortran,
  fsharp,
  haskell,
  julia,
  latex,
  lean,
  nim,
  nushell,
  objc,
  ocaml,
  ocamlInterface,
  perl,
  qmljs,
  tlaplus,
  vhdl,
];
