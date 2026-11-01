"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OAuthAuthorizationDetails } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { buildLoginUrl } from "@/lib/auth-redirect";
import { AuthHeading } from "@/components/auth-heading";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function ConsentForm({ authorizationId }: { authorizationId: string }) {
  const router = useRouter();
  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(
    authorizationId
      ? null
      : "Missing authorization request. Restart the connection in your MCP client.",
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!authorizationId) return;
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const { data, error: authError } = await supabase.auth.getClaims();
        if (cancelled) return;
        if (authError || !data?.claims || data.claims.is_anonymous === true) {
          router.replace(
            buildLoginUrl(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`),
          );
          return;
        }
        const result = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
        if (cancelled) return;
        if (result.error || !result.data) {
          setError(
            "This authorization request is invalid or expired. Restart the connection in your MCP client.",
          );
        } else if ("redirect_url" in result.data) {
          // Supabase has already recorded consent for this client and scope.
          window.location.assign(result.data.redirect_url);
        } else {
          setDetails(result.data);
        }
      } catch {
        if (!cancelled) setError("Unable to load this request. Please reload and try again.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [authorizationId, router]);

  async function decide(approve: boolean) {
    if (!details || pending) return;
    setPending(true);
    setError(null);
    try {
      const { oauth } = createClient().auth;
      const result = approve
        ? await oauth.approveAuthorization(details.authorization_id, { skipBrowserRedirect: true })
        : await oauth.denyAuthorization(details.authorization_id, { skipBrowserRedirect: true });
      if (result.error || !result.data) throw new Error("Consent failed");
      // Only follow the Auth server's result, never a redirect supplied in the page URL.
      window.location.assign(result.data.redirect_url);
    } catch {
      setError(
        "Your decision could not be saved. Try again, or restart the connection in your MCP client.",
      );
      setPending(false);
    }
  }

  const scopes = details?.scope.split(" ").filter(Boolean) ?? [];

  return (
    <section className="flex w-full flex-col gap-7" aria-label="OAuth authorization">
      <AuthHeading
        title={
          <span className="break-words">
            {details ? `Authorize ${details.client.name || "application"}` : "Authorize an app"}
          </span>
        }
      >
        {details ? "This app will be able to act as you in Supagist." : null}
      </AuthHeading>

      {details ? (
        <dl className="flex flex-col gap-3 text-sm">
          {(
            [
              ["Signed in as", details.user.email, false],
              ["Client ID", details.client.id, true],
              ["Return address", details.redirect_uri, true],
            ] as const
          ).map(([label, value, mono]) => (
            <div key={label} className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-x-4">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className={cn("break-all", mono && "font-mono text-[13px]")}>{value}</dd>
            </div>
          ))}
          <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-x-4">
            <dt className="text-muted-foreground">Requested scopes</dt>
            <dd>
              {scopes.length > 0 ? (
                <ul className="flex flex-wrap gap-x-3 gap-y-1">
                  {scopes.map((scope) => (
                    <li key={scope} className="break-all font-mono text-[13px]">
                      {scope}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No additional identity scopes requested.</p>
              )}
            </dd>
          </div>
        </dl>
      ) : !error ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading authorization request…
        </p>
      ) : null}

      {error && (
        <p role="alert" className="text-sm text-wax-text">
          {error}
        </p>
      )}

      {details && (
        <div className="grid grid-cols-2 gap-3">
          <Button className="min-h-11" disabled={pending} onClick={() => void decide(true)}>
            {pending && <Spinner data-icon="inline-start" />} Approve
          </Button>
          <Button
            variant="secondary"
            className="min-h-11"
            disabled={pending}
            onClick={() => void decide(false)}
          >
            Deny
          </Button>
        </div>
      )}

      <p className="text-[13px] text-muted-foreground">
        Only approve apps you trust. Client names are supplied by the app, not verified by Supagist.
      </p>
    </section>
  );
}
