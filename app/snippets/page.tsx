import type { Metadata } from "next";
import Link from "next/link";
import { getMySnippets } from "@/app/actions/get-my-snippets";
import { AppNav } from "@/components/app-nav";
import { SiteFooter } from "@/components/site-footer";
import { SnippetList } from "@/components/snippet-list";
import { Envelope, Seal } from "@/components/brand/envelope";
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

  if (!signedIn) {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <AppNav />
        <section
          data-testid="snippets-signed-out"
          className="flex flex-1 flex-col items-center justify-center px-5 py-14 text-center md:px-12"
        >
          <Seal className="size-24" />
          <h1 className="mt-8 font-display text-[34px] leading-tight text-foreground md:text-[44px]">
            Your snippets
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground md:text-[17px]">
            Log in to see the snippets you have published.
          </p>
          <Button asChild className="mt-7">
            <Link href="/auth/login">Log in</Link>
          </Button>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AppNav />

      <section className="flex flex-1 flex-col gap-10 px-5 pt-[34px] md:px-12 md:pt-14">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[44px] leading-tight text-foreground md:text-[52px]">
            Your snippets
          </h1>
          {snippets.length > 0 ? (
            <p className="text-[15px] text-muted-foreground md:text-[17px]">
              {`${snippets.length} published snippet${snippets.length === 1 ? "" : "s"}, newest first.`}
            </p>
          ) : null}
        </div>

        {snippets.length === 0 ? (
          <div
            data-testid="snippets-empty"
            className="flex flex-1 flex-col items-center justify-center pb-14 text-center"
          >
            <Envelope className="w-[240px] md:w-[300px]" seal={70 / 300} sealOffset={[0, 0]} />
            <p className="mt-10 text-[15px] text-muted-foreground md:text-[17px]">
              You have not published anything yet.
            </p>
            <Button asChild className="mt-5">
              <Link href="/">Create a snippet</Link>
            </Button>
          </div>
        ) : (
          <SnippetList snippets={snippets} />
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
