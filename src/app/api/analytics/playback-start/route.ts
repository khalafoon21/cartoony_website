import { NextRequest, NextResponse } from "next/server";
import { executeInternalServiceWrite, executePublicRead } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// In-memory sliding window for rate-limiting and rapid retry deduplication
// Key: client identifier (hashed/anonymized or IP) -> array of timestamps
const rateLimits = new Map<string, number[]>();
// Key: `${anonymizedClient}:${contentId}` -> timestamp of last tracked playback start
const recentStarts = new Map<string, number>();

// Clean up maps periodically to avoid memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimits.entries()) {
    const fresh = timestamps.filter((t) => now - t < 60_000);
    if (fresh.length === 0) rateLimits.delete(key);
    else rateLimits.set(key, fresh);
  }
  for (const [key, lastTime] of recentStarts.entries()) {
    if (now - lastTime > 60_000) {
      recentStarts.delete(key);
    }
  }
}, 60_000);

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const rawIp = forwarded ? forwarded.split(",")[0].trim() : realIp || "127.0.0.1";
  // Anonymize into a short hash so no raw IP is permanently retained or stored
  let hash = 0;
  for (let i = 0; i < rawIp.length; i++) {
    hash = (hash << 5) - hash + rawIp.charCodeAt(i);
    hash |= 0;
  }
  return `client_${hash}`;
}

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientIdentifier(req);
    const now = Date.now();

    // 1. Rate Limiting: Max 20 playback starts per minute per client
    const timestamps = (rateLimits.get(clientId) || []).filter((t) => now - t < 60_000);
    if (timestamps.length >= 20) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }
    timestamps.push(now);
    rateLimits.set(clientId, timestamps);

    // 2. Parse & validate request payload
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
    }

    const { contentId, contentType } = body as { contentId?: string; contentType?: string };

    if (!contentId || !UUID_REGEX.test(contentId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid or missing contentId UUID." },
        { status: 400 }
      );
    }

    if (contentType !== "movie" && contentType !== "episode") {
      return NextResponse.json(
        { ok: false, error: "contentType must be either 'movie' or 'episode'." },
        { status: 400 }
      );
    }

    // 3. Deduplication: Prevent duplicate counts from rapid retries within 30 seconds
    const dedupKey = `${clientId}:${contentId}`;
    const lastStart = recentStarts.get(dedupKey);
    if (lastStart && now - lastStart < 30_000) {
      // Rapid retry ignored gracefully
      return NextResponse.json({ ok: true, deduplicated: true });
    }
    recentStarts.set(dedupKey, now);

    // 4. Server-side validation: Ensure content exists and is published
    let seriesId: string | null = null;

    if (contentType === "movie") {
      const movieCheck = await executePublicRead<Array<{ id: string }>>(
        "movies",
        `?select=id&id=eq.${contentId}&status=eq.published&limit=1`
      );
      if (!movieCheck.ok || !movieCheck.data || movieCheck.data.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Movie not found or not published." },
          { status: 404 }
        );
      }
    } else {
      const episodeCheck = await executePublicRead<Array<{ id: string; series_id: string }>>(
        "episodes",
        `?select=id,series_id&id=eq.${contentId}&status=eq.published&limit=1`
      );
      if (!episodeCheck.ok || !episodeCheck.data || episodeCheck.data.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Episode not found or not published." },
          { status: 404 }
        );
      }
      seriesId = episodeCheck.data[0].series_id;
    }

    // 5. Record playback event (timestamps and identifiers only, no personal data)
    const recordRes = await executeInternalServiceWrite(
      "playback_events",
      "POST",
      {
        content_type: contentType,
        content_id: contentId,
        series_id: seriesId,
        created_at: new Date().toISOString(),
      }
    );

    if (!recordRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Failed to record playback event." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
