import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it("builds and self-hosts extensionless Google font URLs without corrupting their query", async () => {
  // Google sometimes returns /l/font?kit=...&skey=... instead of a .woff2 URL.
  // Next 16.4.2 splits those parameters while encoding Turbopack's import,
  // failing the build before Playwright runs (vercel/next.js#99114).
  const root = process.cwd();
  await mkdir(path.join(root, ".next"), { recursive: true });
  const fixture = await mkdtemp(path.join(root, ".next/font-regression-"));
  const font = await readFile(
    path.join(root, "node_modules/@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2"),
  );
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(request.url!);
    response.writeHead(200, { "Content-Type": "font/woff2" });
    response.end(font);
  });

  try {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing font server address");
    const fontPath = "/l/font?kit=a%2Bb%25c=d&skey=test&v=v20";
    const fontUrl = `http://127.0.0.1:${address.port}${fontPath}`;
    await mkdir(path.join(fixture, "app"));
    await writeFile(path.join(fixture, "package.json"), '{"private":true}');
    await writeFile(
      path.join(fixture, "next.config.mjs"),
      `export default { turbopack: { root: ${JSON.stringify(root)} } };`,
    );
    await writeFile(
      path.join(fixture, "app/layout.js"),
      `import { Source_Code_Pro } from 'next/font/google';
const font = Source_Code_Pro({ subsets: ['latin'], weight: ['400', '500'] });
export default function Layout({ children }) {
  return <html><body className={font.className}>{children}</body></html>;
}`,
    );
    await writeFile(
      path.join(fixture, "app/page.js"),
      "export default function Page() { return 'Font regression'; }",
    );
    const responses = path.join(fixture, "font-responses.cjs");
    // Use Next's upstream test hook only for the external CSS response. The
    // real bundler downloads real WOFF2 bytes from the local server above.
    await writeFile(
      responses,
      `module.exports = ${JSON.stringify({
        "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap": `/* latin */
@font-face {
  font-family: 'Source Code Pro';
  font-style: normal;
  font-weight: 400 500;
  src: url(${fontUrl}) format('woff2');
}`,
      })};`,
    );

    await promisify(execFile)(
      process.execPath,
      [path.join(root, "node_modules/next/dist/bin/next"), "build", fixture],
      {
        cwd: fixture,
        env: {
          ...process.env,
          NEXT_FONT_GOOGLE_MOCKED_RESPONSES: responses,
          NEXT_TELEMETRY_DISABLED: "1",
        },
      },
    );

    expect(requests).toContain(fontPath);
    const media = path.join(fixture, ".next/static/media");
    const emittedFonts = (await readdir(media)).filter((file) => file.endsWith(".woff2"));
    expect(emittedFonts.length).toBeGreaterThan(0);
    for (const file of emittedFonts) {
      expect(await readFile(path.join(media, file))).toEqual(font);
    }
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(fixture, { recursive: true, force: true });
  }
}, 60_000);
