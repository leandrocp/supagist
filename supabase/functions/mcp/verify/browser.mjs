// Serve the UNMODIFIED app export modules for browser-vs-Edge comparison.
// Development harness only, bound to loopback. No Next/app route is added.
import { createServer } from "vite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fixtures } from "./local.mjs";

const root = process.cwd();
const output = resolve(process.argv[2] ?? ".amp/in/artifacts/mcp-m0");
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
  plugins: [
    {
      name: "m0-browser-comparison",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === "/m0") {
            res.setHeader("Content-Type", "text/html");
            // Next resolves this app-owned dynamic import during compilation; native
            // browser ESM needs the equivalent mapping for this one fixture theme.
            res.end(
              '<!doctype html><title>M0 browser export comparison</title><script type="importmap">{"imports":{"@lumis-sh/themes/github_dark":"/node_modules/@lumis-sh/themes/dist/themes/github_dark.js"}}</script><p id="status">Rendering…</p><script type="module" src="/supabase/functions/mcp/verify/browser-client.ts"></script>',
            );
          } else if (req.url === "/m0-fixtures") {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(fixtures));
          } else if (["/m0-avatar-1.png", "/m0-avatar-2.png"].includes(req.url)) {
            res.setHeader("Content-Type", "image/png");
            res.end(
              await readFile(resolve(root, "supabase/functions/mcp/assets", req.url.slice(4))),
            );
          } else if (
            req.method === "POST" &&
            /^\/m0-capture\/(plain|vercel|avatars)-[12]x-browser\.(png|svg)$/.test(req.url)
          ) {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            await writeFile(resolve(output, req.url.split("/").at(-1)), Buffer.concat(chunks));
            res.end("saved");
          } else next();
        });
      },
    },
  ],
});
await server.listen();
console.log("Browser comparison ready on loopback port 4173, /m0");
