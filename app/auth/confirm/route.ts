import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-redirect";
import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const supabase = await createClient();

  // PKCE flow: Supabase's /auth/v1/verify endpoint already validated the
  // pkce_ token and redirected here with ?code=... — we exchange it for
  // a session.
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    redirect(next);
  }

  // OTP flow: email template uses {{ .TokenHash }}/{{ .Type }} directly.
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error) redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    redirect(next);
  }

  redirect(`/auth/error?error=${encodeURIComponent("No token hash or type")}`);
}
