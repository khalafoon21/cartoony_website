const test = require("node:test");
const assert = require("node:assert/strict");

test("Video Source & Player Specifications", async (t) => {
  await t.test("Validates safe video & subtitle URLs", () => {
    const SAFE_PROTOCOLS = ["https:", "http:"];

    function isSafeUrl(raw) {
      if (!raw || typeof raw !== "string") return true;
      const trimmed = raw.trim();
      if (!trimmed) return true;
      try {
        const parsed = new URL(trimmed);
        return SAFE_PROTOCOLS.includes(parsed.protocol);
      } catch {
        return false;
      }
    }

    assert.equal(isSafeUrl("https://commondatastorage.googleapis.com/sample.mp4"), true);
    assert.equal(isSafeUrl("https://test-streams.mux.dev/stream.m3u8"), true);
    assert.equal(isSafeUrl("javascript:alert(1)"), false);
    assert.equal(isSafeUrl("data:text/html,<script>"), false);
    assert.equal(isSafeUrl(""), true);
  });

  await t.test("Sequencing logic for previous/next episode navigation", () => {
    const seasons = [
      {
        seasonNumber: 1,
        title: "الموسم الأول",
        episodes: [
          { episodeNumber: 1, slug: "gravity-falls-s1-e1", title: "الحلقة 1" },
          { episodeNumber: 2, slug: "gravity-falls-s1-e2", title: "الحلقة 2" },
        ],
      },
      {
        seasonNumber: 2,
        title: "الموسم الثاني",
        episodes: [
          { episodeNumber: 1, slug: "gravity-falls-s2-e1", title: "الحلقة 1" },
        ],
      },
    ];

    const flat = [];
    for (const s of seasons) {
      for (const ep of s.episodes) {
        flat.push({ season: s, episode: ep });
      }
    }

    assert.equal(flat.length, 3);

    // Episode 1 Season 1
    const idx0 = flat.findIndex((item) => item.episode.slug === "gravity-falls-s1-e1");
    assert.equal(idx0, 0);
    const prev0 = idx0 > 0 ? flat[idx0 - 1] : null;
    const next0 = idx0 < flat.length - 1 ? flat[idx0 + 1] : null;
    assert.equal(prev0, null);
    assert.equal(next0.episode.slug, "gravity-falls-s1-e2");

    // Episode 2 Season 1 -> Next should be Season 2 Episode 1!
    const idx1 = flat.findIndex((item) => item.episode.slug === "gravity-falls-s1-e2");
    assert.equal(idx1, 1);
    const prev1 = flat[idx1 - 1];
    const next1 = flat[idx1 + 1];
    assert.equal(prev1.episode.slug, "gravity-falls-s1-e1");
    assert.equal(next1.season.seasonNumber, 2);
    assert.equal(next1.episode.slug, "gravity-falls-s2-e1");

    // Episode 1 Season 2 -> Last episode
    const idx2 = flat.findIndex((item) => item.episode.slug === "gravity-falls-s2-e1");
    const next2 = idx2 < flat.length - 1 ? flat[idx2 + 1] : null;
    assert.equal(next2, null);
  });

  await t.test("Google Cast MediaInfo and options specification", () => {
    function buildCastMediaOptions({ src, title, poster, subtitleUrl, subtitleLang, subtitleLabel, isHls, currentTime }) {
      const mimeType = isHls ? "application/x-mpegurl" : "video/mp4";
      const metadata = {
        title: title || "كارتوني",
        images: poster ? [{ url: poster }] : [],
      };
      const tracks = subtitleUrl
        ? [
            {
              trackId: 1,
              type: "TEXT",
              trackContentId: subtitleUrl,
              trackContentType: "text/vtt",
              subtype: "SUBTITLES",
              name: subtitleLabel || "العربية",
              language: subtitleLang || "ar",
            },
          ]
        : [];

      return {
        contentId: src,
        contentType: mimeType,
        streamType: "BUFFERED",
        metadata,
        tracks,
        currentTime: currentTime || 0,
        autoplay: true,
        activeTrackIds: subtitleUrl ? [1] : [],
      };
    }

    // MP4 movie casting
    const mp4Cast = buildCastMediaOptions({
      src: "https://example.com/movie.mp4",
      title: "فيلم الأسد الملك",
      poster: "https://example.com/poster.jpg",
      currentTime: 125.4,
    });
    assert.equal(mp4Cast.contentType, "video/mp4");
    assert.equal(mp4Cast.currentTime, 125.4);
    assert.equal(mp4Cast.metadata.title, "فيلم الأسد الملك");
    assert.equal(mp4Cast.metadata.images[0].url, "https://example.com/poster.jpg");
    assert.equal(mp4Cast.tracks.length, 0);

    // HLS episode casting with WebVTT subtitles
    const hlsCast = buildCastMediaOptions({
      src: "https://example.com/stream/index.m3u8",
      title: "غرافيتي فولز: الحلقة 1",
      poster: "https://example.com/still.jpg",
      subtitleUrl: "https://example.com/subs/ar.vtt",
      subtitleLang: "ar",
      subtitleLabel: "العربية",
      isHls: true,
      currentTime: 45.0,
    });
    assert.equal(hlsCast.contentType, "application/x-mpegurl");
    assert.equal(hlsCast.tracks.length, 1);
    assert.equal(hlsCast.tracks[0].trackContentType, "text/vtt");
    assert.equal(hlsCast.activeTrackIds[0], 1);
  });
});
