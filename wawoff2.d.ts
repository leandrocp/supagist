/**
 * `wawoff2` ships no types. Only `decompress` is used, by `lib/export-server.ts`,
 * to turn the bundled woff2 export fonts into sfnt files resvg can read.
 */
declare module "wawoff2" {
  export function decompress(input: Uint8Array | Buffer): Promise<Uint8Array>;
  export function compress(input: Uint8Array | Buffer): Promise<Uint8Array>;
}
