const cache = new Map<string, Promise<Uint8Array>>();
const fontBase64 = new Map<string, Promise<string>>();
const fonts = new Map([
  ["/fonts/jetbrains-mono.woff2", "JetBrainsMono-Regular.ttf"],
  ["/fonts/geist-mono.woff2", "GeistMono.ttf"],
  ["/fonts/fira-code.woff2", "FiraCode.ttf"],
  ["/fonts/hack.woff2", "Hack.ttf"],
]);
const images = new Map([
  ["m0:avatar-1", "avatar-1.png"],
  ["m0:avatar-2", "avatar-2.png"],
  ["/brands/tailwind-beams.png", "tailwind-beams.png"],
  ["/brands/resend-dark.png", "resend-dark.png"],
  ["/brands/lumis-icon-light.svg", "lumis-icon-light.svg"],
  ["/brands/lumis-icon-dark.svg", "lumis-icon-dark.svg"],
]);
const allowed = new Set([...fonts.values(), ...images.values()]);

export function assetBytes(name: string): Promise<Uint8Array> {
  if (!allowed.has(name)) throw new Error(`Unknown bundled asset: ${name}`);
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
  const name = fonts.get(file);
  if (!name) throw new Error(`Unknown bundled font: ${file}`);
  let pending = fontBase64.get(name);
  if (!pending) {
    pending = assetBytes(name).then(base64);
    fontBase64.set(name, pending);
  }
  return pending;
}

export async function loadImageDataUrl(url: string): Promise<string> {
  const name = images.get(url);
  if (!name) throw new Error("Renderer only accepts bundled image paths");
  const type = name.endsWith(".svg") ? "image/svg+xml" : "image/png";
  return `data:${type};base64,${base64(await assetBytes(name))}`;
}
