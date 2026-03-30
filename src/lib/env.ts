/**
 * Environment variable validation.
 * Call validateEnv() during startup to catch missing vars early.
 */

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const REQUIRED_IN_PRODUCTION = [
  ...REQUIRED_VARS,
  "NEXT_PUBLIC_SITE_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
] as const;

export function validateEnv(): void {
  const vars =
    process.env.NODE_ENV === "production"
      ? REQUIRED_IN_PRODUCTION
      : REQUIRED_VARS;

  const missing = vars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}`
    );
  }
}

export const env = {
  supabaseUrl:        process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey:    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  siteUrl:            process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "",
  },
} as const;
