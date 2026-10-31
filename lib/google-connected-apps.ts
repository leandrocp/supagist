import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Google Connected Console → Verify domain → Download token saves a file named
// google-connected-apps.json. Commit it unchanged at this path to publish it at
// https://supagist.app/.well-known/google-connected-apps. next.config.ts traces
// this path into the route's serverless bundle.
export const GOOGLE_CONNECTED_APPS_TOKEN_FILE = "google-connected-apps.json";

// Serve the downloaded token byte for byte: 200 with the JSON content type
// when the file exists, 404 until it is committed. Never redirect.
export async function googleConnectedAppsTokenResponse(
  file = join(process.cwd(), GOOGLE_CONNECTED_APPS_TOKEN_FILE),
): Promise<Response> {
  let body: Buffer;
  try {
    // The token is traced by outputFileTracingIncludes, not by this call.
    body = await readFile(/*turbopackIgnore: true*/ file);
  } catch {
    return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
  }
  return new Response(new Uint8Array(body), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
