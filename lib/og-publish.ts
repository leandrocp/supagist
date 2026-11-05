import { headers } from "next/headers";
import { getRequestOrigin } from "@/lib/utils";

/**
 * Has the share image route render and store a public snippet's image now,
 * as the signed-in owner (OG spec v2.1 §6.7): the link is auto-copied on
 * publish, so the first paste must already have it. Never fails the caller;
 * a miss is rendered on the first request instead.
 */
export async function storeShareImage(
  supabase: {
    auth: { getSession(): Promise<{ data: { session: { access_token: string } | null } }> };
  },
  param: string,
): Promise<void> {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;
    const origin = getRequestOrigin(await headers());
    const response = await fetch(`${origin}/og/${param}.jpg`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) {
      console.error(`Share image for ${param} was not stored: HTTP ${response.status}`);
    }
  } catch (error) {
    console.error(`Share image for ${param} was not stored`, error);
  }
}
