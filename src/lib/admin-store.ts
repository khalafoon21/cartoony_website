import "server-only";

// Internal auth bootstrap: these RPCs must be callable before a session exists.
// SQL grants EXECUTE only to service_role; never import into client code.
export async function adminAuthRpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url?.startsWith("https://") || !key) throw new Error("Admin security store unavailable");
  try {
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: key,
        ...(!key.startsWith("sb_") ? { Authorization: `Bearer ${key}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Unavailable");
    return await response.json() as T;
  } catch {
    throw new Error("Admin security store unavailable");
  }
}
