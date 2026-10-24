// Offline regression checks: no real credentials, network, database or storage writes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const sharp = require('sharp');
const { NextRequest } = require('next/server');

const env = {
  NODE_ENV: 'production', ADMIN_EMAIL: 'test@example.invalid',
  ADMIN_SESSION_SECRET: 'synthetic-test-secret-'.repeat(3),
  NEXT_PUBLIC_SUPABASE_URL: 'https://storage.example.invalid',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_test_only',
  SUPABASE_SECRET_KEY: 'sb_secret_synthetic_test_only',
};

function harness() {
  const sessions = new Map(), attempts = new Map(), objects = new Map();
  let unavailable = false, calls = 0;
  const response = (data, status = 200) => new Response(JSON.stringify(data), { status });
  async function transport(url, options = {}) {
    calls++;
    assert.equal(options.headers.apikey, env.SUPABASE_SECRET_KEY);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.cache, 'no-store');
    if (unavailable) throw new Error('Simulated outage');
    const pathname = new URL(url).pathname;
    if (pathname.includes('/rpc/')) {
      const args = JSON.parse(options.body);
      switch (pathname.split('/').pop()) {
        case 'cartoony_consume_login': {
          assert.match(args.p_key, /^[a-f0-9]{64}$/);
          const n = (attempts.get(args.p_key) ?? 0) + 1;
          attempts.set(args.p_key, n);
          return response({ allowed: n <= 5, retryAfterSeconds: n <= 5 ? 0 : 900 });
        }
        case 'cartoony_create_session': sessions.set(args.p_hash, { revoked: false, exp: Date.parse(args.p_expires) }); return response(true);
        case 'cartoony_session_active': {
          const s = sessions.get(args.p_hash);
          return response(!!s && !s.revoked && s.exp > Date.now());
        }
        case 'cartoony_revoke_session': {
          const s = sessions.get(args.p_hash);
          if (s) s.revoked = true;
          return response(true);
        }
        default: throw new Error('Unexpected RPC');
      }
    }
    if (pathname.includes('/bucket/')) return response({
      public: pathname.endsWith('/movie-images'), file_size_limit: 5242880,
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (pathname.includes('/object/upload/sign/')) {
      assert.equal(options.headers['x-upsert'], 'false');
      return response({ url: pathname.replace('/storage/v1', '') + '?token=synthetic-capability' });
    }
    if (pathname.includes('/object/authenticated/')) {
      const obj = objects.get(pathname.replace('/storage/v1/object/authenticated/', ''));
      return obj ? new Response(obj.bytes, { headers: { 'Content-Type': obj.mime } }) : response({}, 404);
    }
    if (options.method === 'DELETE') {
      const bucket = pathname.split('/').pop();
      for (const prefix of JSON.parse(options.body).prefixes) objects.delete(bucket + '/' + prefix);
      return response([]);
    }
    if (pathname.includes('/object/movie-images/')) {
      const key = pathname.replace('/storage/v1/object/', '');
      if (objects.has(key)) return response({}, 409);
      objects.set(key, { bytes: Buffer.from(options.body), mime: options.headers['Content-Type'] });
      return response({});
    }
    throw new Error('Unexpected network operation');
  }
  function instance() {
    const modules = new Map();
    const state = { cookie: undefined };
    function load(file) {
      file = path.resolve(file);
      if (modules.has(file)) return modules.get(file).exports;
      const module = { exports: {} }; modules.set(file, module);
      const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      }).outputText;
      vm.runInNewContext(code, {
        module, exports: module.exports, process: { env }, Buffer, URL, Uint8Array, AbortSignal,
        fetch: transport, require(name) {
          if (name === 'server-only') return {};
          if (name === 'next/headers') return { cookies: async () => ({
            get: () => state.cookie ? { value: state.cookie } : undefined,
            set: (_name, value) => { state.cookie = value; },
          }) };
          if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts');
          if (name.startsWith('.')) return load(path.join(path.dirname(file), name + '.ts'));
          return require(name);
        },
      });
      return module.exports;
    }
    return { load, state, auth: load('src/lib/admin-auth.ts') };
  }
  return { instance, objects, sessions, get calls() { return calls; }, set unavailable(value) { unavailable = value; } };
}

test('Shared rate limit consumption, cross-instance logout, unknown/expired sessions and outages fail closed', async () => {
  const h = harness(), a = h.instance(), b = h.instance();
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    (i % 2 ? a : b).auth.checkLoginRateLimit('same-test-ip')));
  assert.equal(results.filter(result => result.allowed).length, 5);
  const token = await a.auth.createSessionToken(env.ADMIN_EMAIL);
  a.state.cookie = b.state.cookie = token;
  assert.ok(await b.auth.getAdminSession());
  assert.equal(await b.auth.verifySessionToken(token + 'tampered'), null);
  await a.auth.clearAdminSessionCookie();
  assert.equal(await b.auth.getAdminSession(), null);
  const token2 = await a.auth.createSessionToken(env.ADMIN_EMAIL);
  const id = crypto.createHash('sha256').update(token2).digest('hex');
  h.sessions.get(id).exp = Date.now() - 1;
  assert.equal(await b.auth.verifySessionToken(token2), null);
  h.sessions.delete(id);
  assert.equal(await b.auth.verifySessionToken(token2), null);
  const token3 = await a.auth.createSessionToken(env.ADMIN_EMAIL);
  a.state.cookie = token3;
  h.unavailable = true;
  assert.equal(await b.auth.verifySessionToken(token3), null);
  assert.equal((await b.auth.checkLoginRateLimit('new-ip')).allowed, false);
  await assert.rejects(() => a.auth.clearAdminSessionCookie());
  assert.equal(a.state.cookie, token3); // no false logout success
});

test('Upload API rejects anonymous, cross-origin and multipart requests; sign enforces MIME and 5 MB', async () => {
  const h = harness(), a = h.instance();
  const route = a.load('src/app/api/admin/upload-image/route.ts');
  const req = (data, origin = 'https://cartoony.test', type = 'application/json') => new NextRequest('https://cartoony.test/api/admin/upload-image', {
    method: 'POST', headers: { origin, 'Content-Type': type }, body: JSON.stringify(data),
  });
  assert.equal((await route.POST(req({ action: 'sign' }))).status, 401);
  assert.equal(h.calls, 0);
  a.state.cookie = await a.auth.createSessionToken(env.ADMIN_EMAIL);
  assert.equal((await route.POST(req({}, 'https://evil.test'))).status, 403);
  assert.equal((await route.POST(req({}, 'https://cartoony.test', 'multipart/form-data'))).status, 415);
  assert.equal((await route.POST(req({ pad: 'x'.repeat(9000) }))).status, 413);
  const sign = data => route.POST(req({ action: 'sign', kind: 'poster', mime: 'image/png', size: 5242880, ...data }));
  assert.equal((await sign({})).status, 200);
  assert.equal((await sign({ size: 5242881 })).status, 400);
  assert.equal((await sign({ size: 0 })).status, 400);
  assert.equal((await sign({ mime: 'image/svg+xml' })).status, 400);
  assert.equal((await sign({ kind: 'video' })).status, 400);
});

test('Private staging, session-bound tickets, full decoding and metadata removal; >4.5 MB valid image works', async () => {
  const h = harness(), a = h.instance(), b = h.instance();
  a.state.cookie = await a.auth.createSessionToken(env.ADMIN_EMAIL);
  b.state.cookie = await b.auth.createSessionToken(env.ADMIN_EMAIL);
  const storage = a.load('src/lib/storage-admin.ts');
  const bytes = await sharp(crypto.randomBytes(1600 * 1000 * 3), { raw: { width: 1600, height: 1000, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer();
  assert.ok(bytes.length > 4500000 && bytes.length < 5242880);
  const signed = await storage.signMovieArtworkUpload({ kind: 'poster', mime: 'image/png', size: bytes.length, slug: '../../unsafe' });
  const ticketData = JSON.parse(Buffer.from(signed.ticket.split('.')[0], 'base64url').toString());
  assert.match(signed.signedUrl, /movie-image-staging/);
  h.objects.set('movie-image-staging/' + ticketData.path, { bytes, mime: 'image/png' });
  await assert.rejects(() => b.load('src/lib/storage-admin.ts').finalizeMovieArtworkUpload(signed.ticket));
  await assert.rejects(() => storage.finalizeMovieArtworkUpload(signed.ticket + 'bad'));
  const result = await storage.finalizeMovieArtworkUpload(signed.ticket);
  assert.ok(result.publicUrl.includes('/object/public/movie-images/posters/'));
  assert.equal(h.objects.has('movie-image-staging/' + ticketData.path), false);
  assert.ok(h.objects.has('movie-images/' + ticketData.path));
  await assert.rejects(() => storage.finalizeMovieArtworkUpload(signed.ticket));
  const jpeg = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).jpeg().withMetadata().toBuffer();
  assert.ok((await sharp(jpeg).metadata()).exif);
  const clean = await storage.sanitizeImage(jpeg, 'image/jpeg');
  assert.equal((await sharp(clean).metadata()).exif, undefined);
  await assert.rejects(() => storage.sanitizeImage(Buffer.from('<svg/>'), 'image/png'));
  await assert.rejects(() => storage.sanitizeImage(Buffer.alloc(5242881), 'image/png'));
  await assert.rejects(() => storage.sanitizeImage(jpeg, 'image/png'));
  const fakePng = Buffer.alloc(64); bytes.copy(fakePng, 0, 0, 24); bytes.copy(fakePng, 56, bytes.length - 8);
  await assert.rejects(() => storage.sanitizeImage(fakePng, 'image/png'));
});

test('Staged content/size spoofing cannot reach the public bucket; revoked sessions cannot finalize', async () => {
  const h = harness(), a = h.instance();
  a.state.cookie = await a.auth.createSessionToken(env.ADMIN_EMAIL);
  const st = a.load('src/lib/storage-admin.ts');
  for (const [bytes, mime] of [[Buffer.alloc(5242881), 'image/png'], [Buffer.from('bad-image'), 'image/png'], [Buffer.alloc(12), 'text/html']]) {
    const signed = await st.signMovieArtworkUpload({ kind: 'backdrop', mime: 'image/png', size: 12 });
    const data = JSON.parse(Buffer.from(signed.ticket.split('.')[0], 'base64url'));
    h.objects.set('movie-image-staging/' + data.path, { bytes, mime });
    await assert.rejects(() => st.finalizeMovieArtworkUpload(signed.ticket));
    assert.equal(h.objects.has('movie-images/' + data.path), false);
    assert.equal(h.objects.has('movie-image-staging/' + data.path), false);
  }
  const signed = await st.signMovieArtworkUpload({ kind: 'poster', mime: 'image/png', size: 12 });
  await a.auth.clearAdminSessionCookie();
  await assert.rejects(() => st.finalizeMovieArtworkUpload(signed.ticket));
});

test('Browser transport sends image bytes only to the signed Storage URL and keeps API requests small', async () => {
  const code = ts.transpileModule(fs.readFileSync('src/lib/upload-movie-image.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} }, apiCalls = [], uploads = [], progress = [];
  const file = new File([Buffer.alloc(5 * 1024 * 1024)], 'image.png', { type: 'image/png' });
  let failUpload = false;
  class XHR {
    upload = {};
    headers = {};
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader(key, value) { this.headers[key] = value; }
    send(body) {
      uploads.push(this);
      assert.equal(body, file);
      assert.equal(this.method, 'PUT');
      assert.equal(this.url, 'https://storage.example.invalid/signed');
      assert.equal(this.headers['Content-Type'], 'image/png');
      assert.equal(this.headers.apikey, undefined);
      this.upload.onprogress({ lengthComputable: true, loaded: file.size, total: file.size });
      this.status = failUpload ? 413 : 200;
      this.onload();
    }
  }
  vm.runInNewContext(code, {
    module, exports: module.exports, XMLHttpRequest: XHR, AbortSignal,
    fetch: async (url, options) => {
      assert.equal(url, '/api/admin/upload-image');
      assert.ok(options.body.length < 8192);
      const data = JSON.parse(options.body); apiCalls.push(data.action);
      return new Response(JSON.stringify(data.action === 'sign'
        ? { ok: true, signedUrl: 'https://storage.example.invalid/signed', ticket: 'opaque-ticket' }
        : { ok: true, publicUrl: 'https://storage.example.invalid/public/validated.png' }));
    },
  });
  const url = await module.exports.uploadMovieImage(file, 'poster', 'test', value => progress.push(value));
  assert.ok(url.endsWith('/validated.png'));
  assert.deepEqual(apiCalls, ['sign', 'finalize']);
  assert.ok(progress.includes(95));
  failUpload = true;
  await assert.rejects(() => module.exports.uploadMovieImage(file, 'backdrop', 'test', () => {}));
  assert.deepEqual(apiCalls.slice(2), ['sign', 'cancel']);
});
