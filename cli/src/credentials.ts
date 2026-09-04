import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Credential storage for the CLI.
 *
 * One file per host so `--host` against a preview deployment or a local
 * `next dev` doesn't clobber the production login. Written with mode 0600 —
 * this holds a refresh token that can mint sessions for the account.
 */

export type StoredCredentials = {
  host: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  username: string | null;
};

export function credentialsDir(env: Record<string, string | undefined> = process.env): string {
  if (env.SUPAGIST_CONFIG_DIR) return env.SUPAGIST_CONFIG_DIR;
  const base = env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(base, "supagist");
}

/**
 * Filesystem-safe, collision-free file name for a host origin. Hosts are
 * lowercase URL origins, so replacing the non-`[a-z0-9.-]` characters (`:` and
 * `/`) cannot merge two distinct origins into one name.
 */
export function credentialsFileFor(
  host: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const slug = host.toLowerCase().replace(/[^a-z0-9.-]+/g, "_");
  return join(credentialsDir(env), `${slug}.json`);
}

export async function readCredentials(
  host: string,
  env: Record<string, string | undefined> = process.env,
): Promise<StoredCredentials | null> {
  try {
    const raw = await readFile(credentialsFileFor(host, env), "utf-8");
    const parsed = JSON.parse(raw) as Partial<StoredCredentials>;
    if (typeof parsed.accessToken !== "string" || typeof parsed.refreshToken !== "string") {
      return null;
    }
    return {
      host,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : null,
      username: typeof parsed.username === "string" ? parsed.username : null,
    };
  } catch {
    return null;
  }
}

export async function writeCredentials(
  credentials: StoredCredentials,
  env: Record<string, string | undefined> = process.env,
): Promise<string> {
  const file = credentialsFileFor(credentials.host, env);
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 });
  return file;
}

export async function clearCredentials(
  host: string,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  const file = credentialsFileFor(host, env);
  try {
    await rm(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * True when the access token is expired or close enough that a publish could
 * outlive it. Supabase `expires_at` is in seconds.
 */
export function needsRefresh(
  credentials: StoredCredentials,
  nowMs: number = Date.now(),
  skewSeconds = 60,
): boolean {
  if (credentials.expiresAt === null) return true;
  return credentials.expiresAt - skewSeconds <= Math.floor(nowMs / 1000);
}
