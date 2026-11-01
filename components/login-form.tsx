"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GithubMark } from "@/components/github-mark";
import { AuthHeading } from "@/components/auth-heading";
import { Seal } from "@/components/brand/envelope";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

export function LoginForm({ className, next = "/" }: { className?: string; next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleGitHub = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/oauth?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setInfo("Check your email for a confirmation link.");
      setLoading(false);
    }
  };

  if (info) {
    // Sign-up succeeded: Supabase sent a confirmation email.
    return (
      <div className={cn("flex flex-col items-start gap-6", className)}>
        <Seal className="size-24" />
        <AuthHeading title="Thank you for signing up!">
          <p role="status">{info}</p>
        </AuthHeading>
        <Button asChild variant="secondary">
          <Link href="/">Back to Supagist</Link>
        </Button>
      </div>
    );
  }

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError(null);
    setInfo(null);
  };

  return (
    <div className={cn("flex w-full flex-col gap-8", className)}>
      <AuthHeading title={mode === "signin" ? "Sign in to your account" : "Create an account"}>
        Use GitHub or your email.
      </AuthHeading>

      <div className="flex flex-col gap-5">
        <Button
          variant="ink"
          size="lg"
          className="w-full text-[15px]"
          onClick={() => void handleGitHub()}
          disabled={loading}
        >
          <GithubMark className="size-4" />
          Continue with GitHub
        </Button>

        <p className="eyebrow text-center text-[11px] text-faint">or</p>

        <form onSubmit={(e) => void handleEmail(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              aria-invalid={error ? true : undefined}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              value={password}
              aria-invalid={error ? true : undefined}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-wax-text">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-2 w-full" disabled={loading}>
            {loading ? <Spinner data-icon="inline-start" /> : null}
            {loading
              ? mode === "signin"
                ? "Signing in…"
                : "Creating account…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        <p className="text-center text-[15px] text-muted-foreground">
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            className="rounded-sm font-semibold text-postal hover:underline focus-visible:focus-ring"
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
