import "server-only";

import { getAdminSession } from "./admin-auth";

export type SupabaseEnvStatus = {
  hasUrl: boolean;
  hasPublicKey: boolean;
  hasAdminKey: boolean;
  isConfiguredForPublic: boolean;
  isConfiguredForAdmin: boolean;
};

export type SupabaseTableName =
  | "movies"
  | "series"
  | "seasons"
  | "episodes"
  | "categories"
  | "movie_categories"
  | "series_categories"
  | "site_settings"
  | "playback_events";

function getPublicKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

function getAdminKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

export function getSupabaseEnvStatus(): SupabaseEnvStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publicKey = getPublicKey();
  const adminKey = getAdminKey();

  const hasUrl = Boolean(url && url.startsWith("https://") && !url.includes("<"));
  const hasPublicKey = Boolean(
    publicKey.length > 20 && !publicKey.includes("<") && !publicKey.startsWith("sb_secret_")
  );
  const hasAdminKey = Boolean(
    adminKey.length > 20 &&
      !adminKey.includes("<") &&
      !adminKey.startsWith("sb_publishable_") &&
      !adminKey.startsWith("YOUR_")
  );

  return {
    hasUrl,
    hasPublicKey,
    hasAdminKey,
    isConfiguredForPublic: hasUrl && hasPublicKey,
    isConfiguredForAdmin: hasUrl && hasAdminKey,
  };
}

function getBaseRestUrl(): string | null {
  const status = getSupabaseEnvStatus();
  if (!status.hasUrl) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/$/, "")}/rest/v1`;
}

function getApiHeaders(useServiceRole: boolean, allowFallback = false): Record<string, string> | null {
  const status = getSupabaseEnvStatus();

  if (useServiceRole && !status.isConfiguredForAdmin) {
    if (!allowFallback || !status.isConfiguredForPublic) {
      return null;
    }
  } else if (!useServiceRole && !status.isConfiguredForPublic) {
    return null;
  }

  const effectiveUseAdmin = useServiceRole && status.isConfiguredForAdmin;
  const key = effectiveUseAdmin ? getAdminKey() : getPublicKey();
  if (!key) return null;

  return {
    apikey: key,
    ...(!key.startsWith("sb_") && key.split(".").length === 3
      ? { Authorization: `Bearer ${key}` } : {}),
    "Content-Type": "application/json",
  };
}

/**
 * Counts rows in a Supabase table using PostgREST `Prefer: count=exact`.
 * Always verifies admin session when `useServiceRole` is requested.
 */
export async function fetchTableExactCount(
  table: "movies" | "series" | "seasons" | "episodes" | "categories",
  options: { useServiceRole?: boolean; publishedOnly?: boolean } = {}
): Promise<number | null> {
  if (options.useServiceRole) {
    const session = await getAdminSession();
    if (!session) return null;
  }

  const baseUrl = getBaseRestUrl();
  const headers = getApiHeaders(Boolean(options.useServiceRole), true);
  if (!baseUrl || !headers) return null;

  const query = options.publishedOnly
    ? `?select=id&status=eq.published`
    : `?select=id`;

  try {
    const response = await fetch(`${baseUrl}/${table}${query}`, {
      method: "HEAD",
      headers: {
        ...headers,
        Prefer: "count=exact",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const contentRange = response.headers.get("content-range");
    if (!contentRange) return null;

    // PostgREST format: "0-7/8" or "*/0"
    const totalPart = contentRange.split("/")[1];
    if (!totalPart || totalPart === "*") return null;

    const parsed = Number.parseInt(totalPart, 10);
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Least-privilege server-side read helper for public pages.
 * Strictly uses the public publishable/anon key (enforcing RLS: published rows only)
 * and never accesses admin or secret credentials.
 */
export async function executePublicRead<T>(
  table: SupabaseTableName,
  queryString = "?select=*"
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const baseUrl = getBaseRestUrl();
  const headers = getApiHeaders(false, false);
  if (!baseUrl || !headers) {
    return {
      ok: false,
      error: "قاعدة البيانات غير مهيأة حالياً.",
    };
  }

  const normalizedQuery = queryString.startsWith("?") ? queryString : `?${queryString}`;
  const url = `${baseUrl}/${table}${normalizedQuery}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        if (response.status >= 500 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 250));
          continue;
        }
        return { ok: false, error: `تعذر تحميل البيانات (${response.status}).` };
      }

      const data = (await response.json()) as T;
      return { ok: true, data };
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
      return { ok: false, error: "تعذر الاتصال بقاعدة البيانات." };
    }
  }

  return { ok: false, error: "تعذر الاتصال بقاعدة البيانات." };
}

/**
 * Guarded server-side read helper for private/admin data (including drafts).
 * Verifies an active admin session BEFORE reading from Supabase with the secret key.
 */
export async function executeAdminRead<T>(
  table: SupabaseTableName,
  queryString = "?select=*"
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يتطلب هذا الإجراء جلسة مشرف نشطة." };
  }

  const baseUrl = getBaseRestUrl();
  const headers = getApiHeaders(true, false);
  if (!baseUrl || !headers) {
    return {
      ok: false,
      error: "قاعدة بيانات Supabase غير مهيأة بعد (مفتاح SUPABASE_SECRET_KEY غير مضبوط).",
    };
  }

  const normalizedQuery = queryString.startsWith("?") ? queryString : `?${queryString}`;
  const url = `${baseUrl}/${table}${normalizedQuery}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        if (response.status >= 500 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 250));
          continue;
        }
        return { ok: false, error: `خطأ في قراءة البيانات من قاعدة البيانات (${response.status}).` };
      }

      const data = (await response.json()) as T;
      return { ok: true, data };
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
      return { ok: false, error: "تعذر الاتصال بقاعدة البيانات." };
    }
  }

  return { ok: false, error: "تعذر الاتصال بقاعدة البيانات." };
}

/**
 * Guarded server-side write helper for admin CRUD operations.
 * Verifies an active admin session BEFORE executing mutations with the secret key.
 */
export async function executeAdminWrite<T>(
  table: SupabaseTableName,
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown> | Array<Record<string, unknown>>,
  queryString = "",
  prefer = "return=representation"
): Promise<{ ok: true; data: T | null } | { ok: false; error: string; code?: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يتطلب هذا الإجراء جلسة مشرف نشطة." };
  }

  const baseUrl = getBaseRestUrl();
  const headers = getApiHeaders(true, false);
  if (!baseUrl || !headers) {
    return {
      ok: false,
      error: "قاعدة بيانات Supabase غير مهيأة بعد (مفتاح SUPABASE_SECRET_KEY غير مضبوط).",
    };
  }

  try {
    const normalizedQuery =
      queryString && !queryString.startsWith("?") ? `?${queryString}` : queryString;
    const response = await fetch(`${baseUrl}/${table}${normalizedQuery}`, {
      method,
      headers: {
        ...headers,
        Prefer: prefer,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      const errPayload = (await response.json().catch(() => null)) as {
        code?: string;
        message?: string;
      } | null;
      if (errPayload?.code === "23505" || response.status === 409) {
        return {
          ok: false,
          code: "23505",
          error: "الرابط المختصر (Slug) مستخدم بالفعل. يرجى اختيار رابط فريد.",
        };
      }
      return {
        ok: false,
        code: errPayload?.code,
        error: `خطأ من قاعدة البيانات (${response.status}).`,
      };
    }

    if (response.status === 204) {
      return { ok: true, data: null };
    }

    const data = (await response.json().catch(() => null)) as T | null;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "تعذر الاتصال بقاعدة البيانات." };
  }
}

/**
 * Server-only helper to record internal events (like playback starts) using the service role key.
 * Used exclusively by server endpoints that have completed rate-limiting and validation.
 */
export async function executeInternalServiceWrite<T>(
  table: SupabaseTableName,
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown> | Array<Record<string, unknown>>,
  queryString = "",
  prefer = "return=representation"
): Promise<{ ok: true; data: T | null } | { ok: false; error: string; code?: string }> {
  const baseUrl = getBaseRestUrl();
  const headers = getApiHeaders(true, false);
  if (!baseUrl || !headers) {
    return {
      ok: false,
      error: "قاعدة بيانات Supabase غير مهيأة بعد.",
    };
  }

  try {
    const normalizedQuery =
      queryString && !queryString.startsWith("?") ? `?${queryString}` : queryString;
    const response = await fetch(`${baseUrl}/${table}${normalizedQuery}`, {
      method,
      headers: {
        ...headers,
        Prefer: prefer,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `خطأ في تسجيل البيانات (${response.status}).`,
      };
    }

    if (response.status === 204) {
      return { ok: true, data: null };
    }

    const data = (await response.json().catch(() => null)) as T | null;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "تعذر الاتصال بقاعدة البيانات." };
  }
}
