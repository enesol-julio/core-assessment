export const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES ?? 10);
export const SESSION_EXPIRY_HOURS = Number(process.env.SESSION_EXPIRY_HOURS ?? 4);
export const SESSION_COOKIE_NAME = "core_session";

export function authBypassEnabled(): boolean {
  if (process.env.AUTH_BYPASS !== "true") return false;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SECURITY: AUTH_BYPASS=true is not permitted in production. Refusing to start.",
    );
  }
  return true;
}

export function authBypassEmail(): string {
  return (process.env.AUTH_BYPASS_EMAIL ?? "julio@datacracy.co").toLowerCase();
}

export function authBypassRole(): "admin" | "test_taker" {
  const r = process.env.AUTH_BYPASS_ROLE ?? "admin";
  return r === "admin" ? "admin" : "test_taker";
}

export function jwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.startsWith("REPLACE_WITH_")) {
    throw new Error(
      "JWT_SECRET is not configured. Generate one with: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(secret);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function domainOfEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at === -1) throw new Error(`invalid email: ${email}`);
  return email.slice(at + 1).toLowerCase();
}
