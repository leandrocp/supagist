import type { Metadata } from "next";
import Link from "next/link";
import { getMySnippets } from "@/app/actions/get-my-snippets";
import { AppNav } from "@/components/app-nav";
import { SiteFooter } from "@/components/site-footer";
import { SnippetList } from "@/components/snippet-list";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { isPersistentUser } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your snippets · Supagist",
  description: "Every snippet you have published on Supagist.",
};

// This page is per-viewer. Without this it prerenders as static whenever the
// build runs without Supabase env vars — `hasEnvVars` short-circuits before
// anything touches `cookies()` — and every visitor would be served the
// signed-out shell. Route dynamism must not hinge on env-var presence.
export const dynamic = "force-dynamic";

async function isSignedIn(): Promise<boolean> {
  if (!hasEnvVars) return false;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return isPersistentUser(data?.claims);
}

export default async function SnippetsPage() {
  // Anonymous sessions carry an `auth.uid()` but own no snippets, so they get
  // the signed-out prompt rather than a misleading "you have none yet".
  const signedIn = await isSignedIn();
  const snippets = signedIn ? await getMySnippets() : [];

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5">
        <AppNav />

        <section className="flex flex-1 flex-col gap-6 py-8 lg:py-10">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Your snippets</h1>
            <p className="text-sm text-foreground-lighter">
              {signedIn && snippets.length > 0
                ? `${snippets.length} published snippet${snippets.length === 1 ? "" : "s"}, newest first.`
                : "Everything you publish shows up here."}
            </p>
          </div>

          {!signedIn ? (
            <div
              data-testid="snippets-signed-out"
              className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface-100 px-6 py-8"
            >
              <p className="text-sm text-foreground-light">
                Log in to see the snippets you have published.
              </p>
              <Button asChild size="sm" variant="pill" className="px-5">
                <Link href="/auth/login">Log in</Link>
              </Button>
            </div>
          ) : snippets.length === 0 ? (
            <div
              data-testid="snippets-empty"
              className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface-100 px-6 py-8"
            >
              <p className="text-sm text-foreground-light">You have not published anything yet.</p>
              <Button asChild size="sm" variant="pill" className="px-5">
                <Link href="/">Create a snippet</Link>
              </Button>
            </div>
          ) : (
            <SnippetList snippets={snippets} />
          )}
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
