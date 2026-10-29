import "server-only";

import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { adminAuthRpc } from "./admin-store";

export const ADMIN_SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-cartoony_admin_session"
    : "cartoony_admin_session";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
/**
 * Generates a salted scrypt hash in format `scrypt:<saltHex>:<hashHex>`
 * Used by admins in a local Node REPL to provision `ADMIN_PASSWORD_HASH`.
 */
export function createPasswordHash(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derivedKey}`;
}

/**
 * Verifies a plaintext password against a stored `scrypt:<saltHex>:<hashHex>` hash
 * using constant-time comparison (`crypto.timingSafeEqual`).
 */
export function verifyPasswordHash(password: string, storedHash: string): boolean {
  if (!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/i.test(storedHash.trim())) return false;
  const parts = storedHash.trim().split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;

  try {
    const expectedBuffer = Buffer.from(expectedHex, "hex");
    const derivedBuffer = crypto.scryptSync(password, salt, expectedBuffer.length);
    if (derivedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function getSessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    return null;
  }
  return secret;
}

export function isAdminProvisioned(): boolean {
  const email = process.env.ADMIN_EMAIL?.trim();
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const secret = getSessionSecret();
  return Boolean(email && hash && /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/i.test(hash) && secret);
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim();
  const configuredHash = process.env.ADMIN_PASSWORD_HASH?.trim();

  if (!configuredEmail || !configuredHash) {
    return false;
  }

  const normalizedInput = email.trim().toLowerCase();
  const normalizedExpected = configuredEmail.toLowerCase();

  const inputEmailBuf = Buffer.from(normalizedInput, "utf8");
  const expectedEmailBuf = Buffer.from(normalizedExpected, "utf8");

  const emailMatches =
    inputEmailBuf.length === expectedEmailBuf.length &&
    crypto.timingSafeEqual(inputEmailBuf, expectedEmailBuf);

  const passwordMatches = verifyPasswordHash(password, configuredHash);

  return emailMatches && passwordMatches;
}

export async function createSessionToken(email: string): Promise<string | null> {
  const secret = getSessionSecret();
  if (!secret) return null;

  const payload = Buffer.from(
    JSON.stringify({
      sub: email.trim().toLowerCase(),
      role: "admin",
      exp: Date.now() + SESSION_DURATION_MS,
      jti: crypto.randomBytes(12).toString("hex"),
    }),
    "utf8"
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  const token = `${payload}.${signature}`;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!await adminAuthRpc<boolean>("cartoony_create_session", { p_hash: hashToken(token), p_expires: new Date(exp).toISOString() })) return null;
    return token;
  } catch { return null; }
}

export async function verifySessionToken(token: string | undefined): Promise<{ email: string; id: string } | null> {
  if (!token || token.length > 2048) return null;
  const secret = getSessionSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  const sigBuf = Buffer.from(signature, "utf8");
  const expectedSigBuf = Buffer.from(expectedSignature, "utf8");

  if (
    sigBuf.length !== expectedSigBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedSigBuf)
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      role?: string;
      exp?: number;
      jti?: string;
    };

    if (
      decoded.role !== "admin" ||
      typeof decoded.sub !== "string" ||
      typeof decoded.exp !== "number" ||
      !Number.isFinite(decoded.exp) ||
      typeof decoded.jti !== "string" ||
      Date.now() >= decoded.exp
    ) {
      return null;
    }

    const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!configuredEmail || decoded.sub !== configuredEmail) {
      return null;
    }

    const id = hashToken(token);
    if (!await adminAuthRpc<boolean>("cartoony_session_active", { p_hash: id })) return null;
    return { email: decoded.sub, id };
  } catch {
    return null;
  }
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function getAdminSession(): Promise<{ email: string; id: string } | null> {
  if (process.env.NODE_ENV !== "production" && process.env.TEST_ADMIN_BYPASS === "true") {
    return { email: "admin@cartoony.local", id: "admin-test-id" };
  }
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function setAdminSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    // Do not report logout success before every instance can see the revocation.
    if (!await adminAuthRpc<boolean>("cartoony_revoke_session", { p_hash: hashToken(token) })) {
      throw new Error("تعذر إنهاء الجلسة. يرجى المحاولة مجددًا.");
    }
  }
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getClientIdentifier(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerStore.get("x-real-ip") || "local-client";
}

export async function checkLoginRateLimit(clientId: string): Promise<{
  allowed: boolean; retryAfterSeconds: number;
}> {
  try {
    const secret = getSessionSecret();
    if (!secret) throw new Error("Missing configuration");
    const p_key = crypto.createHmac("sha256", secret).update("login:" + clientId).digest("hex");
    return await adminAuthRpc("cartoony_consume_login", { p_key });
  } catch {
    // Fail closed if shared state or its migration is unavailable.
    return { allowed: false, retryAfterSeconds: 60 };
  }
}
