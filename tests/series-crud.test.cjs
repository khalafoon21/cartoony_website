// Offline unit & regression checks for Cartoony Phase 13: Series, Seasons & Episodes CRUD.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function loadModule(relPath, mocks = {}) {
  const fullPath = path.resolve(root, relPath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require: (id) => {
      if (id === 'server-only') return {};
      if (mocks[id]) return mocks[id];
      if (id.startsWith('@/')) {
        return loadModule(id.replace('@/', 'src/'), mocks);
      }
      return require(id);
    },
    process,
    console,
    Buffer,
    URL,
  };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  vm.runInContext(transpiled, sandbox);
  return sandbox.module.exports;
}

test('Series payload validation enforces schema constraints, required Arabic fields and valid slug', () => {
  const seriesAdmin = loadModule('src/lib/series-admin.ts', {
    './admin-auth': { getAdminSession: async () => ({ user: { email: 'admin@cartoony.test' } }) },
    './storage-admin': { deleteStorageImageIfOwnedAndUnused: async () => true },
    './supabase-server': { executeAdminRead: async () => ({ ok: true, data: [] }), executeAdminWrite: async () => ({ ok: true, data: [] }) },
  });

  // Missing Arabic title
  const noTitle = seriesAdmin.validateSeriesPayload({
    title_ar: '',
    title_original: 'Conan',
    slug: 'conan',
    description_ar: 'وصف المسلسل الكرتوني',
    release_year: 2026,
  });
  assert.equal(noTitle.ok, false);
  assert.match(noTitle.error, /العنوان بالعربية مطلوب/);

  // Invalid slug
  const badSlug = seriesAdmin.validateSeriesPayload({
    title_ar: 'المحقق كونان',
    title_original: 'Detective Conan',
    slug: 'BAD SLUG!!',
    description_ar: 'مسلسل المحقق كونان الشهير',
    release_year: 2026,
  });
  assert.equal(badSlug.ok, false);
  assert.match(badSlug.error, /الرابط المختصر/);

  // Invalid year
  const badYear = seriesAdmin.validateSeriesPayload({
    title_ar: 'المحقق كونان',
    title_original: 'Detective Conan',
    slug: 'detective-conan',
    description_ar: 'مسلسل المحقق كونان الشهير',
    release_year: 1800,
  });
  assert.equal(badYear.ok, false);
  assert.match(badYear.error, /سنة الإصدار/);

  // Valid payload
  const valid = seriesAdmin.validateSeriesPayload({
    title_ar: 'المحقق كونان',
    title_original: 'Detective Conan',
    slug: 'detective-conan',
    description_ar: 'مسلسل المحقق الصغير وحل القضايا الغامضة',
    release_year: 1996,
    rating: '9.2',
    age_rating: '9+',
    audio_badge: 'dubbed',
    theme: 'desert',
    accent_color: '#F5A623',
    status: 'published',
    category_ids: ['e1b2c3d4-0000-0000-0000-000000000001'],
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.data.title_ar, 'المحقق كونان');
  assert.equal(valid.data.rating, 9.2);
  assert.equal(valid.data.category_ids.length, 1);
});

test('Season payload validation enforces season number > 0 and generates correct slug', () => {
  const seriesAdmin = loadModule('src/lib/series-admin.ts', {
    './admin-auth': { getAdminSession: async () => ({ user: { email: 'admin@cartoony.test' } }) },
    './storage-admin': { deleteStorageImageIfOwnedAndUnused: async () => true },
    './supabase-server': { executeAdminRead: async () => ({ ok: true, data: [] }), executeAdminWrite: async () => ({ ok: true, data: [] }) },
  });

  const seriesId = 'a0000000-0000-0000-0000-000000000001';

  // Negative or zero season number
  const badNum = seriesAdmin.validateSeasonPayload('conan', {
    series_id: seriesId,
    season_number: 0,
    title_ar: 'الموسم صفر',
  });
  assert.equal(badNum.ok, false);
  assert.match(badNum.error, /رقم الموسم/);

  // Valid season
  const valid = seriesAdmin.validateSeasonPayload('conan', {
    series_id: seriesId,
    season_number: 1,
    title_ar: 'الموسم الأول',
    title_original: 'Season 1',
    description_ar: 'بداية القصة والغموض',
    release_year: 1996,
    status: 'published',
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.data.season_number, 1);
  assert.equal(valid.data.slug, 'conan-season-1');
  assert.equal(valid.data.title_ar, 'الموسم الأول');
});

test('Episode payload validation enforces episode number, duration, and optional video_url in metadata', () => {
  const seriesAdmin = loadModule('src/lib/series-admin.ts', {
    './admin-auth': { getAdminSession: async () => ({ user: { email: 'admin@cartoony.test' } }) },
    './storage-admin': { deleteStorageImageIfOwnedAndUnused: async () => true },
    './supabase-server': { executeAdminRead: async () => ({ ok: true, data: [] }), executeAdminWrite: async () => ({ ok: true, data: [] }) },
  });

  const seriesId = 'a0000000-0000-0000-0000-000000000001';
  const seasonId = 'b0000000-0000-0000-0000-000000000001';

  // Invalid duration
  const badDuration = seriesAdmin.validateEpisodePayload('conan', 1, {
    series_id: seriesId,
    season_id: seasonId,
    episode_number: 1,
    duration_minutes: 0,
    title_ar: 'الحلقة الأولى',
  });
  assert.equal(badDuration.ok, false);
  assert.match(badDuration.error, /مدة الحلقة/);

  // Valid episode with authorized video URL in metadata
  const valid = seriesAdmin.validateEpisodePayload('conan', 1, {
    series_id: seriesId,
    season_id: seasonId,
    episode_number: 1,
    duration_minutes: 24,
    title_ar: 'جريمة في مدينة الملاهي',
    title_original: 'Roller Coaster Murder',
    description_ar: 'ظهور سينشي كودو وتحوله إلى كونان',
    video_url: 'https://cdn.cartoony.test/videos/conan-e1.mp4',
    status: 'published',
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.data.episode_number, 1);
  assert.equal(valid.data.slug, 'conan-s1-e1');
  assert.equal(valid.data.duration_minutes, 24);
  assert.equal(valid.data.metadata.video_url, 'https://cdn.cartoony.test/videos/conan-e1.mp4');
});

test('Public series details query isolates unpublished/draft seasons and episodes and orders sequentially', async () => {
  const mockSeriesData = [
    {
      id: 'series-uuid-1',
      slug: 'future-boy-conan',
      title_ar: 'عدنان ولينا',
      subtitle_ar: 'مغامرات المستقبل',
      title_original: 'Future Boy Conan',
      franchise_ar: 'عالم نيبون',
      description_ar: 'مغامرات الفتى عدنان ولينا في عالم ما بعد الكارثة',
      poster_url: 'https://cdn.test/poster.jpg',
      backdrop_url: 'https://cdn.test/backdrop.jpg',
      release_year: 1978,
      age_rating: 'الكل',
      rating: 9.5,
      audio_badge: 'dubbed',
      theme: 'ocean',
      accent_color: '#F5A623',
      is_featured: true,
      is_most_watched: true,
      is_recently_added: false,
      status: 'published',
      series_categories: [
        { category_id: 'cat-1', is_primary: true, categories: { id: 'cat-1', slug: 'adventure', title_ar: 'مغامرات' } },
      ],
      seasons: [
        {
          id: 'season-2',
          series_id: 'series-uuid-1',
          season_number: 2,
          slug: 'conan-season-2',
          title_ar: 'الموسم الثاني (مسودة)',
          title_original: 'Season 2',
          description_ar: 'غير منشور بعد',
          status: 'draft', // DRAFT SEASON
          episodes: [
            {
              id: 'ep-s2-1',
              episode_number: 1,
              slug: 'conan-s2-e1',
              title_ar: 'حلقة مسودة',
              duration_minutes: 24,
              status: 'published',
            },
          ],
        },
        {
          id: 'season-1',
          series_id: 'series-uuid-1',
          season_number: 1,
          slug: 'conan-season-1',
          title_ar: 'الموسم الأول',
          title_original: 'Season 1',
          description_ar: 'أحداث الجزيرة المفقودة',
          status: 'published',
          episodes: [
            {
              id: 'ep-2',
              episode_number: 2,
              slug: 'conan-s1-e2',
              title_ar: 'الرحلة',
              title_original: 'The Journey',
              description_ar: 'انطلاق عدنان في البحر',
              duration_minutes: 24,
              audio_badge: 'dubbed',
              metadata: { video_url: 'https://cdn.test/ep2.mp4' },
              status: 'published',
            },
            {
              id: 'ep-draft',
              episode_number: 3,
              slug: 'conan-s1-e3',
              title_ar: 'حلقة غير منشورة',
              duration_minutes: 24,
              audio_badge: 'dubbed',
              status: 'draft', // DRAFT EPISODE
            },
            {
              id: 'ep-1',
              episode_number: 1,
              slug: 'conan-s1-e1',
              title_ar: 'الجزيرة المفقودة',
              title_original: 'Remnant Island',
              description_ar: 'لقاء عدنان بلينا',
              duration_minutes: 24,
              audio_badge: 'dubbed',
              metadata: { video_url: 'https://cdn.test/ep1.mp4' },
              status: 'published',
            },
          ],
        },
      ],
    },
  ];

  const moviesPublic = loadModule('src/lib/movies-public.ts', {
    './sample-content': { isSampleContent: () => false },
    './supabase-server': {
      executePublicRead: async (table, query) => {
        assert.ok(query.includes('status=eq.published'));
        return { ok: true, data: mockSeriesData };
      },
    },
  });

  const res = await moviesPublic.getPublicSeriesWithDetails('future-boy-conan');
  assert.equal(res.ok, true);
  assert.ok(res.item);
  assert.equal(res.item.title, 'عدنان ولينا');

  // Draft season MUST be excluded
  assert.equal(res.seasons.length, 1);
  assert.equal(res.seasons[0].seasonNumber, 1);
  assert.equal(res.seasons[0].title, 'الموسم الأول');

  // Draft episode MUST be excluded and episodes sorted sequentially (1, 2)
  assert.equal(res.seasons[0].episodes.length, 2);
  assert.equal(res.seasons[0].episodes[0].episodeNumber, 1);
  assert.equal(res.seasons[0].episodes[0].title, 'الجزيرة المفقودة');
  assert.equal(res.seasons[0].episodes[0].videoUrl, 'https://cdn.test/ep1.mp4');

  assert.equal(res.seasons[0].episodes[1].episodeNumber, 2);
  assert.equal(res.seasons[0].episodes[1].title, 'الرحلة');
});
