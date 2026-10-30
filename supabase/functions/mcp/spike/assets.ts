const cache = new Map<string, Promise<Uint8Array>>();
let fontBase64: Promise<string> | undefined;

export function assetBytes(name: string): Promise<Uint8Array> {
  const allowed = ["JetBrainsMono-Regular.ttf", "avatar-1.png", "avatar-2.png"];
  if (!allowed.includes(name)) throw new Error(`Unknown M0 asset: ${name}`);
  let pending = cache.get(name);
  if (!pending) {
    pending = Deno.readFile(new URL(`../assets/${name}`, import.meta.url));
    cache.set(name, pending);
  }
  return pending;
}

export function base64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function loadFontBase64(file: string): Promise<string> {
  if (file !== "/fonts/jetbrains-mono.woff2") throw new Error("M0 only bundles JetBrains Mono");
  return (fontBase64 ??= assetBytes("JetBrainsMono-Regular.ttf").then(base64));
}

export async function loadImageDataUrl(url: string): Promise<string> {
  const name = { "m0:avatar-1": "avatar-1.png", "m0:avatar-2": "avatar-2.png" }[url];
  if (!name) throw new Error("M0 refuses remote image URLs");
  return `data:image/png;base64,${base64(await assetBytes(name))}`;
}
