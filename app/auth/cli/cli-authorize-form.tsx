"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { cliCallbackUrl } from "@/lib/cli-auth";

type Status = "idle" | "sending" | "done" | "error";

type Props = {
  port: number;
  state: string;
  username: string;
};

/**
 * Hands the current Supabase session to the loopback listener the CLI opened.
 *
 * The session is POSTed rather than redirected so the refresh token stays out
 * of browser history, and `state` is echoed so the listener can reject a
 * callback it did not ask for.
 */
export function CliAuthorizeForm({ port, state, username }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function authorize() {
    setStatus("sending");
    setMessage(null);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setStatus("error");
      setMessage("Your session expired. Reload this page and sign in again.");
      return;
    }

    try {
      const response = await fetch(cliCallbackUrl(port), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at ?? null,
          username,
        }),
      });

      if (!response.ok) throw new Error(`Callback responded ${response.status}`);
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage(
        "Could not reach the CLI on this machine. Make sure `npx supagist auth login` is still running, then try again.",
      );
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm">
        <p className="font-medium">You&apos;re signed in.</p>
        <p className="mt-1 text-muted-foreground">
          Return to your terminal — you can close this tab.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => void authorize()} disabled={status === "sending"} className="h-11">
        {status === "sending" ? <Spinner data-icon="inline-start" /> : null}
        Authorize CLI
      </Button>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  );
}
