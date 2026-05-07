import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-redirect";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?error=Missing%20OAuth%20code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorMessage = encodeURIComponent(error.message);

    return NextResponse.redirect(`${origin}/auth/error?error=${errorMessage}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
