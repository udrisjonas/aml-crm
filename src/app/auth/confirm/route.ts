import { createServerClient } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code      = searchParams.get("code");        // PKCE flow
  const token_hash = searchParams.get("token_hash"); // Email OTP flow
  const type      = searchParams.get("type") as EmailOtpType | null;

  console.log("[/auth/confirm] incoming params:", {
    code:       code       ? `${code.slice(0, 12)}…`       : null,
    token_hash: token_hash ? `${token_hash.slice(0, 12)}…` : null,
    type,
    all: Object.fromEntries(searchParams.entries()),
  });

  const successUrl = new URL("/set-password", request.url);
  const errorUrl   = new URL("/login?error=invalid_invite", request.url);

  if (!code && !token_hash) {
    console.log("[/auth/confirm] no usable params — check Supabase auth flow type (PKCE vs OTP)");
    return NextResponse.redirect(errorUrl);
  }

  // Build the redirect response up-front so cookies from verifyOtp /
  // exchangeCodeForSession are written directly onto it.
  const successResponse = NextResponse.redirect(successUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            successResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ── PKCE flow ─────────────────────────────────────────────────────────────
  if (code) {
    console.log("[/auth/confirm] attempting exchangeCodeForSession (PKCE)");
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[/auth/confirm] exchangeCodeForSession failed:", error.message);
      return NextResponse.redirect(errorUrl);
    }
    console.log("[/auth/confirm] PKCE exchange succeeded → /set-password");
    return successResponse;
  }

  // ── Email OTP flow ────────────────────────────────────────────────────────
  if (token_hash && type) {
    console.log("[/auth/confirm] attempting verifyOtp (OTP)");
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) {
      console.error("[/auth/confirm] verifyOtp failed:", error.message);
      return NextResponse.redirect(errorUrl);
    }
    console.log("[/auth/confirm] OTP verified → /set-password");
    return successResponse;
  }

  return NextResponse.redirect(errorUrl);
}
