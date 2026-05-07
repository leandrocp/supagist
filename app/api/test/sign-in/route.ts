import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Test-only endpoint for Playwright CI auth.
 * Signs in with email + password and lets @supabase/ssr set the session cookies.
 * Hard-disabled in production builds — even a leaked E2E_TEST_SECRET cannot
 * unlock the route there. The shared-secret check still applies in dev/CI.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const secret = process.env.E2E_TEST_SECRET;
  if (!secret || req.headers.get("x-e2e-secret") !== secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { email, password } = (await req.json()) as { email: string; password: string };

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.json({ error: error.message }, { status: 401 });

  return NextResponse.json({ ok: true });
}
