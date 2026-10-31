import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/.well-known/google-connected-apps/route";
import {
  GOOGLE_CONNECTED_APPS_TOKEN_FILE,
  googleConnectedAppsTokenResponse,
} from "./google-connected-apps";

let dir: string | undefined;
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("/.well-known/google-connected-apps", () => {
  it("returns 404 until the downloaded token is committed, then serves it", async () => {
    // Stays green when the real token is committed: that must be a one-file change.
    const committed = await readFile(GOOGLE_CONNECTED_APPS_TOKEN_FILE).catch(() => null);
    const response = await GET();
    expect(response.status).toBe(committed ? 200 : 404);
    expect(Buffer.from(await response.arrayBuffer()).equals(committed ?? Buffer.alloc(0))).toBe(
      true,
    );
  });

  it("serves the downloaded token file byte for byte as JSON", async () => {
    dir = await mkdtemp(join(tmpdir(), "gca-"));
    const file = join(dir, "google-connected-apps.json");
    // Google's download format, with an unusual layout and trailing newline
    // that re-serializing the JSON would change.
    const token = '{ "verification_tokens" : [ "fixture-Tok_123=" ] }\n';
    await writeFile(file, token);

    const response = await googleConnectedAppsTokenResponse(file);
    expect(response.status).toBe(200);
    expect(response.redirected).toBe(false);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe(token);
  });
});
