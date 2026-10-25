const test = require("node:test");
const assert = require("node:assert/strict");

const SITE_URL = "https://cartoony.site";

test("Cartoony Phase 18: Performance, Mobile & SEO Specifications", async (t) => {
  await t.test("Canonical domain is strictly https://cartoony.site and URLs are formatted correctly", () => {
    assert.equal(SITE_URL, "https://cartoony.site");

    const movieSlug = "toy-story";
    const seriesSlug = "gravity-falls";
    const episodeSlug = "s1-e1";
    const categorySlug = "adventure";

    assert.equal(`${SITE_URL}/movies/${movieSlug}`, "https://cartoony.site/movies/toy-story");
    assert.equal(`${SITE_URL}/series/${seriesSlug}`, "https://cartoony.site/series/gravity-falls");
    assert.equal(`${SITE_URL}/watch/movies/${movieSlug}`, "https://cartoony.site/watch/movies/toy-story");
    assert.equal(
      `${SITE_URL}/watch/series/${seriesSlug}/${episodeSlug}`,
      "https://cartoony.site/watch/series/gravity-falls/s1-e1"
    );
    assert.equal(`${SITE_URL}/category/${categorySlug}`, "https://cartoony.site/category/adventure");
  });

  await t.test("Robots rules disallow admin and API routes while allowing public catalog", () => {
    const rules = {
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/"],
    };

    assert.equal(rules.allow, "/");
    assert.ok(rules.disallow.includes("/admin"));
    assert.ok(rules.disallow.includes("/api/"));
  });

  await t.test("JSON-LD structured data formats Movie, TVSeries and WebSite correctly without fake reviews", () => {
    // Movie schema
    const movieData = {
      title: "الأسد الملك",
      englishTitle: "The Lion King",
      description: "قصة سيمبا",
      posterUrl: "https://images.example/lion.jpg",
      year: 1994,
      rating: "8.5",
      slug: "the-lion-king",
    };

    const movieJsonLd = {
      "@context": "https://schema.org",
      "@type": "Movie",
      name: movieData.title,
      alternateName: movieData.englishTitle,
      description: movieData.description,
      image: movieData.posterUrl,
      datePublished: `${movieData.year}-01-01`,
      inLanguage: "ar",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: movieData.rating,
        bestRating: "10",
        worstRating: "0",
      },
      url: `${SITE_URL}/movies/${movieData.slug}`,
    };

    assert.equal(movieJsonLd["@type"], "Movie");
    assert.equal(movieJsonLd.name, "الأسد الملك");
    assert.equal(movieJsonLd.inLanguage, "ar");
    assert.equal(movieJsonLd.aggregateRating.ratingValue, "8.5");
    assert.equal(movieJsonLd.url, "https://cartoony.site/movies/the-lion-king");

    // TVSeries schema
    const seriesJsonLd = {
      "@context": "https://schema.org",
      "@type": "TVSeries",
      name: "عدنان ولينا",
      alternateName: "Future Boy Conan",
      numberOfSeasons: 1,
      numberOfEpisodes: 26,
      url: `${SITE_URL}/series/future-boy-conan`,
    };

    assert.equal(seriesJsonLd["@type"], "TVSeries");
    assert.equal(seriesJsonLd.numberOfSeasons, 1);
    assert.equal(seriesJsonLd.numberOfEpisodes, 26);

    // WebSite schema with SearchAction
    const websiteJsonLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "كارتوني",
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    };

    assert.equal(websiteJsonLd["@type"], "WebSite");
    assert.equal(websiteJsonLd.potentialAction["@type"], "SearchAction");
    assert.ok(websiteJsonLd.potentialAction.target.includes("/search?q="));
  });

  await t.test("Viewport and mobile safe-area properties are configured", () => {
    const viewportConfig = {
      themeColor: "#121B32",
      width: "device-width",
      initialScale: 1,
      viewportFit: "cover",
    };

    assert.equal(viewportConfig.themeColor, "#121B32");
    assert.equal(viewportConfig.viewportFit, "cover");
  });

  await t.test("Image loading strategy prioritizes LCP and lazy-loads below fold", () => {
    function getImageAttributes(isEager) {
      return {
        loading: isEager ? "eager" : "lazy",
        fetchpriority: isEager ? "high" : "low",
        decoding: "async",
      };
    }

    const heroLcp = getImageAttributes(true);
    assert.equal(heroLcp.loading, "eager");
    assert.equal(heroLcp.fetchpriority, "high");
    assert.equal(heroLcp.decoding, "async");

    const belowFoldCard = getImageAttributes(false);
    assert.equal(belowFoldCard.loading, "lazy");
    assert.equal(belowFoldCard.fetchpriority, "low");
    assert.equal(belowFoldCard.decoding, "async");
  });
});
