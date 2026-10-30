"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OAuthAuthorizationDetails } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { buildLoginUrl } from "@/lib/auth-redirect";
import { BrandDot } from "@/components/brand-dot";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

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

  return (
    <section className="flex w-full max-w-md flex-col gap-6" aria-label="OAuth authorization">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center justify-center gap-2 text-lg font-medium tracking-tight"
      >
        <BrandDot /> Supagist
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="break-words">
              {details ? `Authorize ${details.client.name || "application"}` : "Authorize an app"}
            </h1>
          </CardTitle>
          <CardDescription>
            Only approve apps you trust. Client names are supplied by the app, not verified by
            Supagist.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {details ? (
            <>
              <p className="text-sm">This app will be able to act as you in Supagist.</p>
              <dl className="flex flex-col gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Signed in as</dt>
                  <dd className="break-all">{details.user.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Client ID</dt>
                  <dd className="break-all font-mono text-xs">{details.client.id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Return address</dt>
                  <dd className="break-all font-mono text-xs">{details.redirect_uri}</dd>
                </div>
              </dl>
              <div className="text-sm">
                <p className="text-muted-foreground">Requested scopes</p>
                {details.scope.trim() ? (
                  <ul className="list-inside list-disc">
                    {details.scope
                      .split(" ")
                      .filter(Boolean)
                      .map((scope) => (
                        <li key={scope} className="break-all font-mono text-xs">
                          {scope}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>No additional identity scopes requested.</p>
                )}
              </div>
            </>
          ) : !error ? (
            <p role="status" className="flex items-center gap-2 text-sm">
              <Spinner /> Loading authorization request…
            </p>
          ) : null}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
        {details && (
          <CardFooter className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="min-h-11 flex-1"
              disabled={pending}
              onClick={() => void decide(false)}
            >
              Deny
            </Button>
            <Button
              className="min-h-11 flex-1"
              disabled={pending}
              onClick={() => void decide(true)}
            >
              {pending && <Spinner data-icon="inline-start" />} Approve
            </Button>
          </CardFooter>
        )}
      </Card>
    </section>
  );
}
