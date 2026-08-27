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

Repo root is this folder. After the first push to `main`:

1. GitHub → Settings → Pages → Deploy from branch **`gh-pages`**, folder `/` (root)
2. Workflow `.github/workflows/deploy.yml` builds and publishes `dist/` to `gh-pages`
3. App URL: `https://<user>.github.io/<repo>/`

`vite` `base` is `/` locally and `/<repo>/` on CI (`GITHUB_PAGES=true`). SPA routes are covered by copying `index.html` → `404.html` after build.
