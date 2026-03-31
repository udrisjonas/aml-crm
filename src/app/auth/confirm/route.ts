import { createServerClient } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code      = searchParams.get("code");        // PKCE flow
  const token_hash = searchParams.get("token_hash"); // Email OTP flow
  const type      = searchParams.get("type") as EmailOtpType | null;

  const successUrl = new URL("/set-password", request.url);
  const errorUrl   = new URL("/login?error=invalid_invite", request.url);

  if (!code && !token_hash) {
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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[/auth/confirm] exchangeCodeForSession failed:", error.message);
      return NextResponse.redirect(errorUrl);
    }
    return successResponse;
  }

  // ── Email OTP flow ────────────────────────────────────────────────────────
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) {
      console.error("[/auth/confirm] verifyOtp failed:", error.message);
      return NextResponse.redirect(errorUrl);
    }
    if (!data.session) {
      // verifyOtp returned no error but also no session — token type incompatible
      // with server-side OTP verification (e.g. magiclink uses implicit/hash flow).
      console.error("[/auth/confirm] verifyOtp succeeded but returned no session. type:", type);
      return NextResponse.redirect(errorUrl);
    }
    return successResponse;
  }

  return NextResponse.redirect(errorUrl);
}
