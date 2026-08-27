# Markets

Spot demo: React, TypeScript, Vite, Feature-Sliced Design.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

Header switch: **Binance** / **Bybit**. Public REST + WebSocket, no API key.

## GitHub Pages

Deploys from **CI** after a merge (or push) to `main`. There is no `npm run deploy`: a local build is not a release.

Pipeline (`.github/workflows/deploy.yml`):

1. PR → `lint` + `build` (no publish)
2. `main` → same, then official [deploy-pages](https://github.com/actions/deploy-pages)
3. Manual rerun: Actions → **Pages** → **Run workflow** (on `main`)

One-time repo settings — **without this the deploy job 404s**:

1. Open https://github.com/DenQ/live-spot-dashboard/settings/pages
2. **Build and deployment → Source: GitHub Actions** (not “Deploy from a branch” / `gh-pages`)
3. Save, then re-run **Pages** on `main` (or push this workflow)
4. Site: https://denq.github.io/live-spot-dashboard/

A 404 from `actions/deploy-pages` (`Failed to create deployment`) means Pages is still off or still pointed at a branch. Node 20 deprecation came from `deploy-pages@v4`; the workflow now uses Node 24 actions (`deploy-pages@v5`).

The old `gh-pages` branch can be deleted after Actions is the source. Vite `base` is `/` locally and `/live-spot-dashboard/` in CI. SPA fallback: `dist/404.html`.
