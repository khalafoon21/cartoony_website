const test = require("node:test");
const assert = require("node:assert/strict");

// Default configuration replica from src/lib/homepage-admin.ts
const DEFAULT_HOMEPAGE_SECTIONS = [
  {
    id: "editors-picks",
    title: "مختارات كارتوني",
    eyebrow: "توصيات خاصة",
    subtitle: "أعمال منتقاة بعناية ننصح بمشاهدتها",
    enabled: true,
    order: 1,
  },
  {
    id: "cartoon-movies",
    title: "أفلام الكرتون",
    eyebrow: "أحدث الإضافات",
    subtitle: "مكتبة سينمائية متكاملة للأفلام المدبلجة والمترجمة",
    enabled: true,
    order: 2,
  },
  {
    id: "cartoon-series",
    title: "مسلسلات الكرتون والانمي",
    eyebrow: "حلقات متسلسلة",
    subtitle: "مواسم كاملة لأشهر كرتون الأجيال والأنمي العائلي",
    enabled: true,
    order: 3,
  },
  {
    id: "recently-added",
    title: "أضيف حديثاً",
    eyebrow: "جديد كارتوني",
    subtitle: "أحدث الأفلام والمسلسلات التي انضمت إلى المنصة",
    enabled: true,
    order: 4,
  },
  {
    id: "most-watched",
    title: "الأكثر مشاهدة",
    eyebrow: "شائع الآن",
    subtitle: "الأعمال الأكثر إقبالاً ومشاهدة من زوار كارتوني",
    enabled: true,
    order: 5,
  },
];

// Pure sorting and filtering logic matching getPublicHomepageSections()
function buildPublicHeroSlides(rawItems) {
  return rawItems
    .filter((item) => item.status === "published" && item.is_featured)
    .filter((item) => {
      const heroEnabled = item.metadata?.hero_enabled !== false;
      return heroEnabled;
    })
    .sort((a, b) => {
      const orderA = typeof a.metadata?.hero_order === "number" ? a.metadata.hero_order : 999;
      const orderB = typeof b.metadata?.hero_order === "number" ? b.metadata.hero_order : 999;
      if (orderA !== orderB) return orderA - orderB;
      return (b.year || 0) - (a.year || 0);
    });
}

function buildPublicSections({ movies, series, sectionSettings }) {
  const publishedMovies = movies.filter((m) => m.status === "published");
  const publishedSeries = series.filter((s) => s.status === "published");
  const allPublished = [...publishedMovies, ...publishedSeries];

  const editorsPicks = allPublished
    .filter((item) => Boolean(item.metadata?.is_editors_pick))
    .sort((a, b) => {
      const orderA = typeof a.metadata?.editors_pick_order === "number" ? a.metadata.editors_pick_order : 999;
      const orderB = typeof b.metadata?.editors_pick_order === "number" ? b.metadata.editors_pick_order : 999;
      return orderA - orderB;
    });

  const latestMovies = publishedMovies.slice(0, 10);
  const latestSeries = publishedSeries.slice(0, 10);
  const recentlyAdded = allPublished.filter((item) => item.is_recently_added).slice(0, 10);
  const mostWatched = allPublished.filter((item) => item.is_most_watched).slice(0, 10);

  const sectionMap = {
    "editors-picks": editorsPicks,
    "cartoon-movies": latestMovies,
    "cartoon-series": latestSeries,
    "recently-added": recentlyAdded,
    "most-watched": mostWatched,
  };

  const activeSettings = (sectionSettings && sectionSettings.length > 0)
    ? sectionSettings
    : DEFAULT_HOMEPAGE_SECTIONS;

  return activeSettings
    .filter((cfg) => cfg.enabled)
    .sort((a, b) => a.order - b.order)
    .map((cfg) => {
      const items = sectionMap[cfg.id] || [];
      return {
        id: cfg.id,
        title: cfg.title,
        eyebrow: cfg.eyebrow,
        subtitle: cfg.subtitle,
        items,
      };
    })
    .filter((section) => section.items.length > 0); // Gracefully omit empty sections
}

test("Cartoony Phase 16: Dynamic Homepage Specifications", async (t) => {
  const mockDataset = [
    {
      id: "m-1",
      title: "فيلم الأسد الملك",
      status: "published",
      is_featured: true,
      year: 1994,
      metadata: { hero_order: 2, hero_enabled: true, is_editors_pick: true, editors_pick_order: 1 },
      is_recently_added: true,
      is_most_watched: true,
    },
    {
      id: "m-2",
      title: "فيلم حكاية لعبة",
      status: "published",
      is_featured: true,
      year: 1995,
      metadata: { hero_order: 1, hero_enabled: true, is_editors_pick: false },
      is_recently_added: false,
      is_most_watched: false,
    },
    {
      id: "m-3",
      title: "فيلم البحث عن نيمو (مسودة)",
      status: "draft",
      is_featured: true,
      year: 2003,
      metadata: { hero_order: 0, hero_enabled: true, is_editors_pick: true },
      is_recently_added: true,
      is_most_watched: true,
    },
    {
      id: "m-4",
      title: "فيلم كرتون معطل من الهيرو",
      status: "published",
      is_featured: true,
      year: 2020,
      metadata: { hero_order: 3, hero_enabled: false },
      is_recently_added: false,
      is_most_watched: false,
    },
  ];

  const mockSeriesDataset = [
    {
      id: "s-1",
      title: "مسلسل غرافيتي فولز",
      status: "published",
      is_featured: true,
      year: 2012,
      metadata: { hero_order: 4, hero_enabled: true, is_editors_pick: true, editors_pick_order: 2 },
      is_recently_added: true,
      is_most_watched: false,
    },
    {
      id: "s-2",
      title: "مسلسل مغامرات سندباد (مسودة)",
      status: "draft",
      is_featured: false,
      year: 1975,
      metadata: {},
      is_recently_added: false,
      is_most_watched: false,
    },
  ];

  await t.test("Dynamic Hero sorts by hero_order asc, respects hero_enabled, and excludes drafts", () => {
    const slides = buildPublicHeroSlides([...mockDataset, ...mockSeriesDataset]);
    
    // Drafts (m-3) and disabled hero items (m-4) must be excluded
    assert.equal(slides.length, 3);
    assert.equal(slides[0].id, "m-2"); // hero_order: 1
    assert.equal(slides[1].id, "m-1"); // hero_order: 2
    assert.equal(slides[2].id, "s-1"); // hero_order: 4
  });

  await t.test("Editor's Picks contains published items with is_editors_pick, sorted by editors_pick_order", () => {
    const sections = buildPublicSections({
      movies: mockDataset,
      series: mockSeriesDataset,
      sectionSettings: DEFAULT_HOMEPAGE_SECTIONS,
    });

    const editorsSection = sections.find((s) => s.id === "editors-picks");
    assert.ok(editorsSection, "Editor's Picks section should exist");
    assert.equal(editorsSection.items.length, 2);
    assert.equal(editorsSection.items[0].id, "m-1"); // order 1
    assert.equal(editorsSection.items[1].id, "s-1"); // order 2
  });

  await t.test("Sections ordering respects custom section order and can disable sections", () => {
    const customSettings = [
      { id: "cartoon-series", title: "مسلسلات", enabled: true, order: 1 },
      { id: "cartoon-movies", title: "أفلام", enabled: true, order: 2 },
      { id: "editors-picks", title: "المختارات", enabled: false, order: 3 }, // disabled!
    ];

    const sections = buildPublicSections({
      movies: mockDataset,
      series: mockSeriesDataset,
      sectionSettings: customSettings,
    });

    assert.equal(sections.length, 2);
    assert.equal(sections[0].id, "cartoon-series");
    assert.equal(sections[1].id, "cartoon-movies");
    assert.equal(sections.find((s) => s.id === "editors-picks"), undefined);
  });

  await t.test("Empty sections are gracefully omitted from public rendering", () => {
    // If no published items have is_most_watched, "most-watched" is not shown
    const sectionsWithoutMostWatched = buildPublicSections({
      movies: [mockDataset[1]], // m-2 has is_most_watched: false
      series: [mockSeriesDataset[0]], // s-1 has is_most_watched: false
      sectionSettings: DEFAULT_HOMEPAGE_SECTIONS,
    });

    const mostWatchedSec = sectionsWithoutMostWatched.find((s) => s.id === "most-watched");
    assert.equal(mostWatchedSec, undefined, "Empty section must not render to public");
  });

  await t.test("Draft movies and series are completely excluded from all homepage sections", () => {
    const sections = buildPublicSections({
      movies: mockDataset,
      series: mockSeriesDataset,
      sectionSettings: DEFAULT_HOMEPAGE_SECTIONS,
    });

    for (const section of sections) {
      for (const item of section.items) {
        assert.equal(item.status, "published", `Item ${item.id} in ${section.id} must be published`);
        assert.notEqual(item.id, "m-3", "Draft movie must not appear");
        assert.notEqual(item.id, "s-2", "Draft series must not appear");
      }
    }
  });
});
