import crypto from "node:crypto";
import { cookies, headers } from "next/headers";

export const ADMIN_SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-cartoony_admin_session"
    : "cartoony_admin_session";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;

type RateLimitRecord = {
  attempts: number;
  resetAt: number;
};

// In-memory rate limit store keyed by client IP
const rateLimitStore = new Map<string, RateLimitRecord>();

// In-memory revoked session token store (jti -> exp timestamp)
const revokedJtiStore = new Map<string, number>();

function pruneRevokedTokens(): void {
  const now = Date.now();
  for (const [jti, exp] of revokedJtiStore.entries()) {
    if (now > exp) {
      revokedJtiStore.delete(jti);
    }
  }
}

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
  return Boolean(email && hash && hash.startsWith("scrypt:") && secret);
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

export function createSessionToken(email: string): string | null {
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

  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined): { email: string } | null {
  if (!token) return null;
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
      typeof decoded.jti !== "string" ||
      Date.now() > decoded.exp ||
      revokedJtiStore.has(decoded.jti)
    ) {
      return null;
    }

    const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!configuredEmail || decoded.sub !== configuredEmail) {
      return null;
    }

    return { email: decoded.sub };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionToken(token);
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
    const [payload] = token.split(".");
    if (payload) {
      try {
        const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
          jti?: string;
          exp?: number;
        };
        if (decoded.jti && decoded.exp) {
          pruneRevokedTokens();
          revokedJtiStore.set(decoded.jti, decoded.exp);
        }
      } catch {
        // Ignore malformed token on logout
      }
    }
  }
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getClientIdentifier(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerStore.get("x-real-ip") || "local-client";
}

export function checkLoginRateLimit(clientId: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const existing = rateLimitStore.get(clientId);

  if (!existing || now > existing.resetAt) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedLoginAttempt(clientId: string): void {
  const now = Date.now();
  const existing = rateLimitStore.get(clientId);

  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(clientId, {
      attempts: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  existing.attempts += 1;
}

export function clearLoginRateLimit(clientId: string): void {
  rateLimitStore.delete(clientId);
}
