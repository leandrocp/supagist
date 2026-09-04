import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LoginLink } from "./login-link";
import { ThemeSwitcher } from "./theme-switcher";
import { UserMenu } from "./user-menu";

// Anonymous users get an `auth.uid()` so they can carry presence + reactions,
// but they are NOT a "real" identity for the chrome's purposes — we don't want
// to greet them by name or offer them a logout button. A logged-out visitor
// and an anonymous-session visitor see the same "Log in" CTA.
function isPersistentUser(claims: { is_anonymous?: boolean } | null | undefined): boolean {
  return !!claims && claims.is_anonymous !== true;
}

/**
 * Right-hand side of the nav. Signed in, everything collapses into a single
 * avatar menu; signed out, the theme picker stays visible on its own next to
 * the login CTA so appearance is always adjustable.
 */
export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!isPersistentUser(user)) {
    return (
      <>
        <Button asChild size="sm" variant="pill" className="px-5">
          <LoginLink>Log in</LoginLink>
        </Button>
        <ThemeSwitcher />
      </>
    );
  }

  const metadata = user?.user_metadata as Record<string, string> | undefined;
  const displayName =
    metadata?.user_name || metadata?.preferred_username || user?.email || "account";

  return <UserMenu username={displayName} avatarUrl={metadata?.avatar_url ?? null} />;
}

export { isPersistentUser };
