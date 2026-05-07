import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { LoginLink } from "./login-link";

// Anonymous users get an `auth.uid()` so they can carry presence + reactions,
// but they are NOT a "real" identity for the chrome's purposes — we don't want
// to greet them by name or offer them a logout button. A logged-out visitor
// and an anonymous-session visitor see the same "Log in" CTA.
function isPersistentUser(claims: { is_anonymous?: boolean } | null | undefined): boolean {
  return !!claims && claims.is_anonymous !== true;
}

export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!isPersistentUser(user)) {
    return (
      <Button asChild size="sm" variant="pill" className="px-5">
        <LoginLink>Log in</LoginLink>
      </Button>
    );
  }

  const displayName =
    (user?.user_metadata as Record<string, string> | undefined)?.user_name ||
    (user?.user_metadata as Record<string, string> | undefined)?.preferred_username ||
    user?.email;

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-muted-foreground">
        Hey <span className="text-foreground">{displayName}</span>
      </span>
      <LogoutButton />
    </div>
  );
}

export { isPersistentUser };
