# Cartoony

Arabic RTL cartoon homepage built with Next.js, TypeScript and Tailwind CSS.

Install [Node.js LTS](https://nodejs.org/en/download), which includes npm, and restart your IDE so its terminals pick up PATH changes. Dependencies are already installed in this workspace; start with `npm run dev`.

For a fresh checkout:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. Check with `npm run build` and `npm run typecheck`. In PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`.

Public movies and series are read only from published Supabase records with public credentials and uncached requests. The hero, franchise strip, categories, related cards and sitemap share this source. Known fictional seed entries are excluded from public results by their exact slug, Arabic title and original title; stored data is never changed. Empty homepage rows are hidden, with Arabic empty/error states and neutral missing artwork. Movie details use `/movies/[slug]` and series details use `/series/[slug]` so identical slugs remain distinct. The protected admin area retains movie CRUD, artwork uploads and its existing dashboard previews. Video hosting is not included. See [the Vercel deployment checklist](VERCEL_DEPLOYMENT.md).

The supplied logo is copied unchanged to `public/branding/cartoony-original.jpg`; its original white background is intentionally preserved. All other illustrations are original SVGs in `src/components/illustrations.tsx`. No reference artwork is included in the app.

## Phase 8 — Supabase Database Setup & Migrations

1. Copy `.env.example` to `.env.local` and configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, plus the admin auth variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`).
2. For a new database, apply the versioned migrations following the deployment checklist. Existing databases need no migration for the public-content cleanup. Do not replay `supabase/seed.sql` on production; it is optional fictional development data and is preserved in the repository.

```sh
npx supabase db push
# Or run against a linked/local database with psql:
psql "$DATABASE_URL" -f supabase/migrations/202610240001_cartoony_schema.sql
```
