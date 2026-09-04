import {
  needsRefresh,
  readCredentials,
  writeCredentials,
  type StoredCredentials,
} from "./credentials.js";

export type HostConfig = {
  appUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  options: {
    brands: string[];
    backgrounds: string[];
    fonts: string[];
    windows: string[];
  };
};

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The CLI ships with no project credentials — it asks the host which Supabase
 * project to refresh tokens against. That keeps `--host` (previews, local dev)
 * working with the same binary.
 */
export async function fetchHostConfig(host: string): Promise<HostConfig> {
  let response: Response;
  try {
    response = await fetch(`${host}/api/cli/config`);
  } catch (error) {
    throw new ApiError(`Could not reach ${host}: ${(error as Error).message}`);
  }
  if (!response.ok) {
    throw new ApiError(
      await readErrorMessage(response, `${host} returned ${response.status}.`),
      response.status,
    );
  }
  return (await response.json()) as HostConfig;
}

/** Exchanges a refresh token for a fresh session against Supabase directly. */
export async function refreshSession(
  config: HostConfig,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number | null }> {
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.supabasePublishableKey,
      Authorization: `Bearer ${config.supabasePublishableKey}`,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new ApiError("Session expired. Run `npx supagist auth login` again.", 401);
  }

  const body = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  };
  if (!body.access_token || !body.refresh_token) {
    throw new ApiError("Session expired. Run `npx supagist auth login` again.", 401);
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: typeof body.expires_at === "number" ? body.expires_at : null,
  };
}

/**
 * Returns a usable access token for `host`, refreshing and re-persisting the
 * stored session when the current one is at or near expiry.
 */
export async function resolveAccessToken(
  host: string,
  env: Record<string, string | undefined> = process.env,
): Promise<{ accessToken: string; credentials: StoredCredentials }> {
  const stored = await readCredentials(host, env);
  if (!stored) {
    throw new ApiError("Not signed in. Run `npx supagist auth login`.", 401);
  }
  if (!needsRefresh(stored)) {
    return { accessToken: stored.accessToken, credentials: stored };
  }

  const config = await fetchHostConfig(host);
  const refreshed = await refreshSession(config, stored.refreshToken);
  const credentials: StoredCredentials = { ...stored, ...refreshed };
  await writeCredentials(credentials, env);
  return { accessToken: refreshed.accessToken, credentials };
}

export type PublishRequest = {
  code: string;
  filename: string;
  language?: string;
  appearance: Record<string, unknown>;
};

export async function publishSnippet(
  host: string,
  accessToken: string,
  payload: PublishRequest,
): Promise<{ url: string; path: string }> {
  let response: Response;
  try {
    response = await fetch(`${host}/api/cli/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new ApiError(`Could not reach ${host}: ${(error as Error).message}`);
  }

  if (!response.ok) {
    throw new ApiError(
      await readErrorMessage(response, `Publish failed with status ${response.status}.`),
      response.status,
    );
  }

  return (await response.json()) as { url: string; path: string };
}
