# Cartoony

Arabic RTL cartoon homepage built with Next.js, TypeScript and Tailwind CSS.

Install [Node.js LTS](https://nodejs.org/en/download), which includes npm, and restart your IDE so its terminals pick up PATH changes. Dependencies are already installed in this workspace; start with `npm run dev`.

For a fresh checkout:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. Check with `npm run build` and `npm run typecheck`. In PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`.

Phase 1 is frontend only. Titles, ratings, franchises and illustrations are fictional placeholders. Franchise selection updates the featured movie; category buttons filter the movie row. The native login dialog is a UI preview and never submits credentials. Movie buttons show an honest availability notice.

The supplied logo is copied unchanged to `public/branding/cartoony-original.jpg`; its original white background is intentionally preserved. All other illustrations are original SVGs in `src/components/illustrations.tsx`. No reference artwork is included in the app.
