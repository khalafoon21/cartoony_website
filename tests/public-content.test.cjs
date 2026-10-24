// Offline regression checks: no credentials, network, database or storage writes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const siteUrl = 'https://cartoony.example.invalid';

function movieRow(overrides = {}) {
  return {
    id: 'real-movie', slug: 'real-movie', title_ar: 'فيلم منشور حقيقي',
    subtitle_ar: 'عنوان فرعي', title_original: 'REAL MOVIE', franchise_ar: 'عالم الفيلم',
    description_ar: 'وصف من قاعدة البيانات', poster_url: 'https://images.example.invalid/poster.jpg',
    backdrop_url: 'https://images.example.invalid/backdrop.jpg', release_year: 2026,
    duration_minutes: 92, duration_label_ar: '', age_rating: '12+', rating: 7.4,
    audio_badge: 'subtitled', theme: 'ocean', accent_color: '#123456',
    is_featured: false, is_most_watched: false, is_recently_added: false,
    status: 'published', published_at: '2026-10-25T00:00:00Z',
    created_at: '2026-10-25T00:00:00Z', updated_at: '2026-10-25T00:00:00Z',
    movie_categories: [], ...overrides,
  };
}

function seriesRow(overrides = {}) {
  const { duration_minutes, duration_label_ar, movie_categories, ...row } = movieRow();
  return {
    ...row, id: 'real-series', slug: 'real-series', title_ar: 'مسلسل منشور حقيقي',
    title_original: 'REAL SERIES', series_categories: [], ...overrides,
  };
}

function category(slug, title, primary = false) {
  return { category_id: slug, is_primary: primary, categories: { id: slug, slug, title_ar: title } };
}

function harness({ movies = [], series = [], failures = [] } = {}) {
  const modules = new Map();
  const calls = [];
  const allowed = new Set([
    'src/lib/movies-public.ts', 'src/lib/movies.ts', 'src/lib/sample-content.ts',
    'src/lib/content-links.ts', 'src/lib/admin-demo-catalog.ts', 'src/app/sitemap.ts',
  ].map(file => path.resolve(root, file)));

  async function executePublicRead(table, query) {
    assert.ok(table === 'movies' || table === 'series');
    const params = new URLSearchParams(query);
    assert.equal(params.get('status'), 'eq.published');
    assert.ok(params.get('select').includes(table === 'movies' ? 'movie_categories(' : 'series_categories('));
    calls.push({ table, query });
    if (failures.includes(table)) return { ok: false, error: 'Synthetic internal error: never expose this' };
    let data = table === 'movies' ? movies : series;
    const slug = params.get('slug');
    if (slug) {
      assert.ok(slug.startsWith('eq.'));
      data = data.filter(row => row.slug === slug.slice(3));
    }
    const limit = params.get('limit');
    if (limit) data = data.slice(0, Number(limit));
    // Deliberately return all statuses to verify the application also fails closed.
    return { ok: true, data };
  }

  function load(relativeFile) {
    const file = path.resolve(root, relativeFile);
    assert.ok(allowed.has(file), `Unexpected module: ${file}`);
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} };
    modules.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, {
      module, exports: module.exports,
      process: { env: {} },
      fetch() { throw new Error('Real network access is forbidden in these tests'); },
      require(name) {
        if (name === 'server-only') return {};
        if (name === './supabase-server') return { executePublicRead };
        if (name === '@/lib/site') return { SITE_URL: siteUrl };
        if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
        if (name.startsWith('.')) return load(path.join(path.dirname(file), `${name}.ts`));
        throw new Error(`Unexpected dependency: ${name}`);
      },
    }, { filename: file });
    return module.exports;
  }

  const api = load('src/lib/movies-public.ts');
  const fixtures = load('src/lib/admin-demo-catalog.ts').allMovies;
  return { api, fixtures, calls, load };
}

function sampleRows(fixtures) {
  const rows = { movies: [], series: [] };
  for (const fixture of fixtures) {
    const row = {
      id: fixture.id, slug: fixture.slug, title_ar: fixture.title,
      title_original: fixture.englishTitle, is_featured: true,
      is_most_watched: true, is_recently_added: true,
    };
    rows[fixture.format === 'movie' ? 'movies' : 'series'].push(
      fixture.format === 'movie' ? movieRow(row) : seriesRow(row)
    );
  }
  return rows;
}

const identities = items => Array.from(items, item => `${item.format}:${item.id}`);
const sectionIds = home => Array.from(home.sections, section => section.id);

test('Only published movies and series are mapped, including primary categories and real metadata', async () => {
  const h = harness({
    movies: [movieRow({ movie_categories: [
      category('family', 'عائلي'), category('adventure', 'مغامرات', true),
      category('adventure', 'مغامرات'), category('unknown', 'غير معتمد'),
    ] }), movieRow({ id: 'draft', status: 'draft' }), movieRow({ id: 'archived', status: 'archived' })],
    series: [seriesRow({ series_categories: [category('comedy', 'كوميديا', true)] }),
      seriesRow({ id: 'draft-series', status: 'draft' }), seriesRow({ id: 'archived-series', status: 'archived' })],
  });
  const catalog = await h.api.getPublicPublishedCatalog();
  assert.equal(catalog.ok, true);
  assert.deepEqual(identities(catalog.movies), ['movie:real-movie', 'series:real-series']);
  const [movie, series] = catalog.movies;
  assert.deepEqual(Array.from(movie.categories), ['adventure', 'family']);
  assert.deepEqual(Array.from(movie.categoryLabels), ['مغامرات', 'عائلي']);
  assert.equal(movie.category, 'adventure');
  assert.equal(movie.posterUrl, 'https://images.example.invalid/poster.jpg');
  assert.equal(movie.backdropUrl, 'https://images.example.invalid/backdrop.jpg');
  assert.equal(movie.ageRating, '12+');
  assert.equal(movie.rating, '7.4');
  assert.equal(movie.audioBadge, 'مترجم');
  assert.equal(movie.duration, '1 ساعة و32 دقيقة');
  assert.equal(series.category, 'comedy');
  assert.equal(series.duration, ''); // No invented episode total or movie duration.
  for (const [slug, format] of [['real-movie', 'movie'], ['real-series', 'series']]) {
    assert.equal((await h.api.getPublicContentBySlug(slug, format)).item.format, format);
  }
});

test('Every legacy fixture and nonpublished row is excluded from catalogs, details, related items and homepage', async () => {
  const fixtures = harness().fixtures;
  assert.equal(fixtures.length, 14);
  const samples = sampleRows(fixtures);
  const h = harness({
    movies: [movieRow(), ...samples.movies, movieRow({ id: 'draft', slug: 'draft', status: 'draft' })],
    series: [seriesRow(), ...samples.series, seriesRow({ id: 'archived', slug: 'archived', status: 'archived' })],
  });
  assert.deepEqual(identities((await h.api.getPublicPublishedMovies()).movies), ['movie:real-movie']);
  assert.deepEqual(identities((await h.api.getPublicPublishedSeries()).movies), ['series:real-series']);
  assert.deepEqual(identities((await h.api.getPublicPublishedCatalog()).movies), ['movie:real-movie', 'series:real-series']);
  for (const fixture of fixtures) {
    const result = await h.api.getPublicContentBySlug(fixture.slug, fixture.format);
    assert.equal(result.item, null, fixture.slug);
    assert.equal(result.related.length, 0, fixture.slug);
  }
  assert.equal((await h.api.getPublicContentBySlug('draft')).item, null);
  assert.equal((await h.api.getPublicContentBySlug('archived', 'series')).item, null);
  const detail = await h.api.getPublicContentBySlug('real-movie');
  assert.deepEqual(identities(detail.related), ['series:real-series']);
  const home = await h.api.getPublicHomepageSections();
  assert.deepEqual(identities(home.heroSlides), ['movie:real-movie', 'series:real-series']);
  assert.deepEqual(sectionIds(home), ['cartoon-movies', 'cartoon-series']);
  assert.deepEqual(identities(home.sections.flatMap(section => section.items)), ['movie:real-movie', 'series:real-series']);
});

test('Known slugs with edited real titles remain published and accessible', async () => {
  const fixtures = harness().fixtures;
  const isSampleContent = harness().load('src/lib/sample-content.ts').isSampleContent;
  for (const fixture of fixtures) {
    const row = { slug: fixture.slug, title_ar: fixture.title, title_original: fixture.englishTitle };
    assert.equal(isSampleContent(row), true, fixture.slug);
    assert.equal(isSampleContent({ ...row, title_ar: 'عنوان حقيقي جديد' }), false);
    assert.equal(isSampleContent({ ...row, title_original: 'REAL NEW TITLE' }), false);
    assert.equal(isSampleContent({ ...row, slug: 'different-real-slug' }), false);
  }
  const h = harness({ movies: [movieRow({
    slug: 'moon-forest', title_ar: 'عنوان حقيقي جديد', title_original: 'FOREST GUARDIANS',
  })] });
  assert.equal((await h.api.getPublicPublishedCatalog()).movies.length, 1);
  assert.equal((await h.api.getPublicContentBySlug('moon-forest')).item.title, 'عنوان حقيقي جديد');
});

test('Empty, sample-only and unavailable databases never produce fixture slides or empty homepage sections', async () => {
  const fixtureRows = sampleRows(harness().fixtures);
  for (const options of [{}, fixtureRows, { failures: ['movies', 'series'] }]) {
    const h = harness(options);
    const home = await h.api.getPublicHomepageSections();
    assert.equal(home.heroSlides.length, 0);
    assert.equal(home.sections.length, 0);
    assert.equal((await h.api.getPublicPublishedCatalog()).movies.length, 0);
    const result = await h.api.getPublicContentBySlug('real-movie');
    assert.equal(result.item, null);
    assert.equal(result.related.length, 0);
    if (options.failures) {
      assert.equal(home.ok, false);
      assert.ok(home.error);
      assert.ok(!home.error.includes('Synthetic internal error'));
      assert.equal(result.ok, false);
    } else {
      assert.equal(home.ok, true);
    }
  }
});

test('A partial outage retains available real content and reports a public error', async () => {
  for (const failedTable of ['movies', 'series']) {
    const h = harness({ movies: [movieRow()], series: [seriesRow()], failures: [failedTable] });
    const expected = failedTable === 'movies' ? 'series:real-series' : 'movie:real-movie';
    const catalog = await h.api.getPublicPublishedCatalog();
    assert.equal(catalog.ok, false);
    assert.ok(catalog.error);
    assert.deepEqual(identities(catalog.movies), [expected]);
    const home = await h.api.getPublicHomepageSections();
    assert.equal(home.ok, false);
    assert.ok(home.error);
    assert.deepEqual(identities(home.heroSlides), [expected]);
    assert.deepEqual(sectionIds(home), [failedTable === 'movies' ? 'cartoon-series' : 'cartoon-movies']);
    const format = failedTable === 'movies' ? 'series' : 'movie';
    assert.equal((await h.api.getPublicContentBySlug(`real-${format}`, format)).item.format, format);
  }
});

test('Homepage flags are respected and hero uses only featured live content or a bounded live fallback', async () => {
  const h = harness({
    movies: [movieRow(), movieRow({ id: 'featured-movie', slug: 'featured-movie', is_featured: true, is_most_watched: true })],
    series: [seriesRow({ is_featured: true, is_recently_added: true })],
  });
  const home = await h.api.getPublicHomepageSections();
  assert.deepEqual(identities(home.heroSlides), ['movie:featured-movie', 'series:real-series']);
  assert.deepEqual(identities(home.sections.find(section => section.id === 'most-watched').items), ['movie:featured-movie']);
  assert.deepEqual(identities(home.sections.find(section => section.id === 'recently-added').items), ['series:real-series']);
  const fallback = harness({ movies: Array.from({ length: 8 }, (_, i) => movieRow({ id: `live-${i}`, slug: `live-${i}` })) });
  const fallbackHome = await fallback.api.getPublicHomepageSections();
  assert.deepEqual(identities(fallbackHome.heroSlides), Array.from({ length: 5 }, (_, i) => `movie:live-${i}`));
  assert.deepEqual(sectionIds(fallbackHome), ['cartoon-movies']);
});

test('Movie and series URLs and detail reads stay distinct even with identical slugs and IDs', async () => {
  const h = harness({
    movies: [movieRow({ id: 'shared-id', slug: 'shared-slug' })],
    series: [seriesRow({ id: 'shared-id', slug: 'shared-slug' })],
  });
  const getContentHref = h.load('src/lib/content-links.ts').getContentHref;
  assert.equal(getContentHref({ slug: 'shared-slug', format: 'movie' }), '/movies/shared-slug');
  assert.equal(getContentHref({ slug: 'shared-slug', format: 'series' }), '/series/shared-slug');
  assert.equal(getContentHref({ slug: 'a b', format: 'series' }), '/series/a%20b');
  const movie = await h.api.getPublicContentBySlug('shared-slug');
  const series = await h.api.getPublicContentBySlug('shared-slug', 'series');
  assert.equal(movie.item.title, 'فيلم منشور حقيقي');
  assert.equal(series.item.title, 'مسلسل منشور حقيقي');
  assert.deepEqual(identities(movie.related), ['series:shared-id']);
  assert.deepEqual(identities(series.related), ['movie:shared-id']);
  const before = h.calls.length;
  for (const slug of ['', '../admin', 'slug?status=eq.draft']) {
    assert.equal((await h.api.getPublicContentBySlug(slug)).item, null);
  }
  assert.equal(h.calls.length, before);
});

test('Sitemap includes only live content URLs and preserves both formats; unavailable data fails closed', async () => {
  const samples = sampleRows(harness().fixtures);
  const h = harness({
    movies: [...samples.movies, movieRow({ slug: 'same-live-slug' }), movieRow({ slug: 'draft', status: 'draft' })],
    series: [...samples.series, seriesRow({ slug: 'same-live-slug' })],
  });
  const entries = await h.load('src/app/sitemap.ts').default();
  const urls = Array.from(entries, entry => entry.url);
  const contentUrls = urls.filter(url => /\/(movies|series)\//.test(url));
  assert.deepEqual(contentUrls, [`${siteUrl}/movies/same-live-slug`, `${siteUrl}/series/same-live-slug`]);
  assert.ok(urls.includes(`${siteUrl}/category/adventure`));
  const failed = harness({ failures: ['series'] });
  await assert.rejects(() => failed.load('src/app/sitemap.ts').default(), /Sitemap temporarily unavailable/);
});
