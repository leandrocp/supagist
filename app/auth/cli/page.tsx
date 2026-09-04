import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseCliPort, parseCliState, cliAuthorizePath } from "@/lib/cli-auth";
import { CliAuthorizeForm } from "./cli-authorize-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Authorize the Supagist CLI",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ port?: string; state?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const port = parseCliPort(params.port);
  const state = parseCliState(params.state);

  if (port === null || state === null) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-3 p-6">
        <h1 className="text-xl font-semibold">Invalid CLI request</h1>
        <p className="text-sm text-muted-foreground">
          This link is missing a valid <code>port</code> or <code>state</code>. Start the flow again
          with <code>npx supagist auth login</code>.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  // Anonymous visitors get a session on first page load, so "signed in" here
  // has to mean a persistent account — the same bar the publish path enforces.
  if (!claims || claims.is_anonymous) {
    redirect(`/auth/login?next=${encodeURIComponent(cliAuthorizePath(port, state))}`);
  }

  const metadata = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const username =
    typeof metadata.user_name === "string"
      ? metadata.user_name
      : typeof metadata.preferred_username === "string"
        ? metadata.preferred_username
        : typeof claims.email === "string"
          ? claims.email
          : "your account";

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Authorize the Supagist CLI</h1>
        <p className="text-sm text-muted-foreground">
          The CLI running on this machine wants to publish snippets as{" "}
          <span className="font-medium text-foreground">{username}</span>. Only continue if you just
          ran <code>npx supagist auth login</code> yourself.
        </p>
      </div>
      <CliAuthorizeForm port={port} state={state} username={username} />
    </main>
  );
}
