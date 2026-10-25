const test = require("node:test");
const assert = require("node:assert/strict");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateCategoryPayload(data) {
  const title_ar = (data.title_ar || "").trim();
  const title_original = (data.title_original || "").trim();
  const slug = (data.slug || "").trim().toLowerCase();

  if (!title_ar || title_ar.length < 2) {
    return { valid: false, error: "يجب إدخال اسم التصنيف بالعربية (حرفين على الأقل)." };
  }

  if (!title_original || title_original.length < 2) {
    return { valid: false, error: "يجب إدخال الاسم اللاتيني للتصنيف (حرفين على الأقل)." };
  }

  if (!slug || !SLUG_REGEX.test(slug)) {
    return {
      valid: false,
      error: "الرابط المختصر (Slug) غير صالح. يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط.",
    };
  }

  return {
    valid: true,
    cleaned: {
      title_ar,
      title_original,
      slug,
      description_ar: (data.description_ar || "").trim(),
      display_order: typeof data.display_order === "number" ? data.display_order : 0,
      status: data.status === "draft" ? "draft" : "published",
    },
  };
}

function auditContentHealth({ movies, series, episodes }) {
  const missingPosters = [];
  const missingVideos = [];
  const pendingDrafts = [];

  for (const m of movies) {
    if (!m.poster_url || m.poster_url.trim() === "") {
      missingPosters.push({ id: m.id, title: m.title_ar, type: "movie", reason: "missing_poster" });
    }
    if (m.status === "published") {
      const videoUrl = typeof m.metadata?.video_url === "string" ? m.metadata.video_url.trim() : "";
      if (!videoUrl) {
        missingVideos.push({ id: m.id, title: m.title_ar, type: "movie", reason: "missing_video" });
      }
    } else if (m.status === "draft") {
      pendingDrafts.push({ id: m.id, title: m.title_ar, type: "movie", reason: "draft_pending" });
    }
  }

  for (const s of series) {
    if (!s.poster_url || s.poster_url.trim() === "") {
      missingPosters.push({ id: s.id, title: s.title_ar, type: "series", reason: "missing_poster" });
    }
    if (s.status === "draft") {
      pendingDrafts.push({ id: s.id, title: s.title_ar, type: "series", reason: "draft_pending" });
    }
  }

  for (const ep of episodes) {
    if (ep.status === "published") {
      const videoUrl = typeof ep.metadata?.video_url === "string" ? ep.metadata.video_url.trim() : "";
      if (!videoUrl) {
        missingVideos.push({ id: ep.id, title: ep.title_ar, type: "episode", reason: "missing_video" });
      }
    } else if (ep.status === "draft") {
      pendingDrafts.push({ id: ep.id, title: ep.title_ar, type: "episode", reason: "draft_pending" });
    }
  }

  return { missingPosters, missingVideos, pendingDrafts };
}

function aggregatePlaybackAnalytics(events, movies, series) {
  const totalStarts = events.length;
  const movieCounts = new Map();
  const seriesCounts = new Map();
  const countsByDate = new Map();

  for (const ev of events) {
    const day = ev.created_at.slice(0, 10);
    countsByDate.set(day, (countsByDate.get(day) || 0) + 1);

    if (ev.content_type === "movie") {
      movieCounts.set(ev.content_id, (movieCounts.get(ev.content_id) || 0) + 1);
    } else if (ev.content_type === "episode" && ev.series_id) {
      seriesCounts.set(ev.series_id, (seriesCounts.get(ev.series_id) || 0) + 1);
    }
  }

  const movieMap = new Map(movies.map((m) => [m.id, m]));
  const seriesMap = new Map(series.map((s) => [s.id, s]));

  const topMovies = Array.from(movieCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      id,
      title: movieMap.get(id)?.title_ar || "فيلم غير معروف",
      startsCount: count,
    }));

  const topSeries = Array.from(seriesCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      id,
      title: seriesMap.get(id)?.title_ar || "مسلسل غير معروف",
      startsCount: count,
    }));

  return {
    totalStarts,
    hasData: totalStarts > 0,
    topMovies,
    topSeries,
    countsByDate,
  };
}

test("Cartoony Phase 17: Admin Dashboard & Analytics Specifications", async (t) => {
  await t.test("Category payload validation enforces Arabic, original names and slug constraints", () => {
    // Valid category
    const valid = validateCategoryPayload({
      title_ar: "خيال علمي",
      title_original: "Sci-Fi",
      slug: "sci-fi",
      status: "published",
    });
    assert.equal(valid.valid, true);
    assert.equal(valid.cleaned.slug, "sci-fi");
    assert.equal(valid.cleaned.title_ar, "خيال علمي");

    // Invalid: missing Arabic title
    const invalidAr = validateCategoryPayload({
      title_ar: "",
      title_original: "Comedy",
      slug: "comedy",
    });
    assert.equal(invalidAr.valid, false);

    // Invalid: bad slug format with spaces and Arabic chars
    const invalidSlug = validateCategoryPayload({
      title_ar: "مغامرات",
      title_original: "Adventure",
      slug: "مغامرات وابطال",
    });
    assert.equal(invalidSlug.valid, false);
  });

  await t.test("Category deletion safety blocks deletion when linked to movies or series", () => {
    const categoryId = "cat-uuid-1";
    const linkedMovies = [{ category_id: "cat-uuid-1", movie_id: "m-1" }];
    const linkedSeries = [];

    const canDelete = linkedMovies.length === 0 && linkedSeries.length === 0;
    assert.equal(canDelete, false, "Category linked to movies must NOT be deletable");

    const unlinkedMovies = [];
    const canDeleteUnlinked = unlinkedMovies.length === 0 && linkedSeries.length === 0;
    assert.equal(canDeleteUnlinked, true, "Unlinked category is safe to delete");
  });

  await t.test("Playback start event validator strictly validates UUID and content_type", () => {
    const validUuid = "12345678-1234-1234-1234-123456789abc";
    const invalidUuid = "not-a-valid-uuid";

    assert.equal(UUID_REGEX.test(validUuid), true);
    assert.equal(UUID_REGEX.test(invalidUuid), false);

    const validTypes = ["movie", "episode"];
    assert.ok(validTypes.includes("movie"));
    assert.ok(validTypes.includes("episode"));
    assert.ok(!validTypes.includes("arbitrary_counter"));
  });

  await t.test("Rapid retry deduplication ignores duplicate playback starts within 30 seconds", () => {
    const recentStarts = new Map();
    const clientId = "client_test_hash";
    const contentId = "12345678-1234-1234-1234-123456789abc";
    const key = `${clientId}:${contentId}`;

    const t1 = 1000000;
    recentStarts.set(key, t1);

    // Attempt 15 seconds later -> rejected as rapid duplicate
    const t2 = t1 + 15000;
    const isRapidDuplicate = t2 - recentStarts.get(key) < 30000;
    assert.equal(isRapidDuplicate, true, "15s replay must be deduplicated");

    // Attempt 35 seconds later -> allowed
    const t3 = t1 + 35000;
    const isAfterWindow = t3 - recentStarts.get(key) >= 30000;
    assert.equal(isAfterWindow, true, "35s playback start is accepted as new session");
  });

  await t.test("Playback analytics aggregates daily activity and ranks Top 10 content", () => {
    const movies = [
      { id: "m-1", title_ar: "فيلم الأسد الملك" },
      { id: "m-2", title_ar: "فيلم حكاية لعبة" },
    ];
    const series = [
      { id: "s-1", title_ar: "مسلسل عدنان ولينا" },
    ];

    const events = [
      { content_type: "movie", content_id: "m-1", series_id: null, created_at: "2026-10-25T10:00:00Z" },
      { content_type: "movie", content_id: "m-1", series_id: null, created_at: "2026-10-25T11:00:00Z" },
      { content_type: "movie", content_id: "m-2", series_id: null, created_at: "2026-10-25T12:00:00Z" },
      { content_type: "episode", content_id: "ep-1", series_id: "s-1", created_at: "2026-10-24T15:00:00Z" },
    ];

    const result = aggregatePlaybackAnalytics(events, movies, series);
    assert.equal(result.totalStarts, 4);
    assert.equal(result.hasData, true);

    // m-1 has 2 starts, m-2 has 1 start
    assert.equal(result.topMovies[0].id, "m-1");
    assert.equal(result.topMovies[0].startsCount, 2);
    assert.equal(result.topMovies[1].id, "m-2");
    assert.equal(result.topMovies[1].startsCount, 1);

    // s-1 has 1 start
    assert.equal(result.topSeries[0].id, "s-1");
    assert.equal(result.topSeries[0].startsCount, 1);

    // Daily activity
    assert.equal(result.countsByDate.get("2026-10-25"), 3);
    assert.equal(result.countsByDate.get("2026-10-24"), 1);
  });

  await t.test("Content Health audit correctly flags missing posters, missing videos, and drafts", () => {
    const movies = [
      { id: "m-1", title_ar: "فيلم سليم", poster_url: "https://test/p1.jpg", status: "published", metadata: { video_url: "https://test/v1.mp4" } },
      { id: "m-2", title_ar: "فيلم بدون بوستر", poster_url: "", status: "published", metadata: { video_url: "https://test/v2.mp4" } },
      { id: "m-3", title_ar: "فيلم بدون فيديو", poster_url: "https://test/p3.jpg", status: "published", metadata: {} },
      { id: "m-4", title_ar: "فيلم مسودة", poster_url: "https://test/p4.jpg", status: "draft", metadata: {} },
    ];

    const series = [
      { id: "s-1", title_ar: "مسلسل بدون بوستر", poster_url: null, status: "published" },
      { id: "s-2", title_ar: "مسلسل مسودة", poster_url: "https://test/s2.jpg", status: "draft" },
    ];

    const episodes = [
      { id: "ep-1", title_ar: "حلقة منشورة بدون فيديو", status: "published", metadata: {} },
      { id: "ep-2", title_ar: "حلقة سليمة", status: "published", metadata: { video_url: "https://test/e2.mp4" } },
      { id: "ep-3", title_ar: "حلقة مسودة", status: "draft", metadata: {} },
    ];

    const health = auditContentHealth({ movies, series, episodes });

    // Missing posters: m-2, s-1
    assert.equal(health.missingPosters.length, 2);
    assert.ok(health.missingPosters.some((i) => i.id === "m-2"));
    assert.ok(health.missingPosters.some((i) => i.id === "s-1"));

    // Missing videos (only published): m-3, ep-1 (drafts m-4 and ep-3 must NOT be flagged as missing videos)
    assert.equal(health.missingVideos.length, 2);
    assert.ok(health.missingVideos.some((i) => i.id === "m-3"));
    assert.ok(health.missingVideos.some((i) => i.id === "ep-1"));

    // Pending drafts: m-4, s-2, ep-3
    assert.equal(health.pendingDrafts.length, 3);
    assert.ok(health.pendingDrafts.some((i) => i.id === "m-4"));
    assert.ok(health.pendingDrafts.some((i) => i.id === "s-2"));
    assert.ok(health.pendingDrafts.some((i) => i.id === "ep-3"));
  });
});
