# Cartoony

Arabic RTL cartoon homepage built with Next.js, TypeScript and Tailwind CSS.

Install [Node.js LTS](https://nodejs.org/en/download), which includes npm, and restart your IDE so its terminals pick up PATH changes. Dependencies are already installed in this workspace; start with `npm run dev`.

For a fresh checkout:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. Check with `npm run build` and `npm run typecheck`. In PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`.

Published movies are read from Supabase. The protected admin area supports movie CRUD and artwork uploads; series remain mock data. Video hosting is not included. See [the Vercel deployment checklist](VERCEL_DEPLOYMENT.md) for production setup and outstanding launch blockers.

The supplied logo is copied unchanged to `public/branding/cartoony-original.jpg`; its original white background is intentionally preserved. All other illustrations are original SVGs in `src/components/illustrations.tsx`. No reference artwork is included in the app.

## Phase 8 — Supabase Database Setup & Migrations

1. Copy `.env.example` to `.env.local` and configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, plus the admin auth variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`).
2. Apply the versioned SQL migration and optional fictional seed data using the Supabase CLI (or paste directly into the Supabase SQL Editor):

```sh
npx supabase db push
# Or run against a linked/local database with psql:
psql "$DATABASE_URL" -f supabase/migrations/202610240001_cartoony_schema.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```
