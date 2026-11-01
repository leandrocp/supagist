import type { Metadata } from "next";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { Seal } from "@/components/brand/envelope";
import { DeleteAccount } from "@/components/delete-account";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { isPersistentUser } from "@/components/auth-button";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Account · Supagist",
  description: "Manage your Supagist account and delete it with all its data.",
};

// Per-viewer, like /snippets: never prerender the signed-out shell.
export const dynamic = "force-dynamic";

async function getUsername(): Promise<string | null> {
  if (!hasEnvVars) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!isPersistentUser(data?.claims)) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", data!.claims.sub)
    .maybeSingle();
  return profile?.username ?? null;
}

export default async function AccountPage() {
  const username = await getUsername();

  if (!username) {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <AppNav />
        <section className="flex flex-1 flex-col items-center justify-center px-5 py-14 text-center md:px-12">
          <Seal className="size-24" />
          <h1 className="mt-8 font-display text-[34px] leading-tight text-foreground md:text-[44px]">
            Account
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground md:text-[17px]">
            Log in to manage your account.
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

      <section className="flex w-full max-w-3xl flex-1 flex-col gap-10 px-5 pt-[34px] pb-14 md:px-12 md:pt-14">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-display text-[44px] leading-tight text-foreground md:text-[52px]">
            Account
          </h1>
          <p className="text-[15px] break-all text-muted-foreground md:text-[17px]">
            Signed in as @{username}.
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-[18px] bg-surf2 p-6 md:p-8">
          <h2 className="font-display text-2xl text-foreground">Your snippets</h2>
          <p className="text-[15px] text-muted-foreground">
            Edit or delete them one by one from{" "}
            <Link
              href="/snippets"
              className="rounded-sm text-postal underline-offset-4 hover:underline focus-visible:focus-ring"
            >
              Your snippets
            </Link>
            .
          </p>
        </div>

        <div
          data-testid="delete-account"
          className="flex flex-col items-start gap-5 rounded-[18px] bg-surf2 p-6 md:p-8"
        >
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-2xl text-foreground">Delete account</h2>
            <p className="text-[15px] text-muted-foreground">
              Deletes your account and all your data right away: your profile, every snippet you
              published with its images, and the comments and reactions you left. Log out only ends
              your session.
            </p>
          </div>
          <DeleteAccount username={username} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
