# Guide

[English](guide.md) · [Русский](guide.ru.md) · [README](../README.md)

Paper-trade live Binance and Bybit spot quotes in the browser. No API keys. No real orders.

Live site: https://denq.github.io/live-spot-dashboard/

## Requirements

- **Node.js 24** (same major version as CI)
- npm (comes with Node)

## Install and run

```bash
npm ci
npm run dev
```

Vite prints a local URL (typically `http://localhost:5173`).

Other scripts:

```bash
npm run build     # TypeScript check + production bundle
npm run preview   # Serve the production build locally
npm run lint
```

## Modes

| Route | What it is |
| --- | --- |
| `/` **Markets** | Live candlestick chart and watchlist |
| `/trainer` **Trainer** | Same feed plus paper ticket, portfolio, open orders, ledger |

Header switch: **Binance Spot** / **Bybit Spot**. Data is public REST + WebSocket. You do not log in.

When the socket is healthy, the header shows **Live** and an RTT in milliseconds.

Watchlist pairs: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, DOGEUSDT.

## Paper account

Trainer starts you with **$1,000** cash. State is stored in the browser (`localStorage`).

| Rule | Value |
| --- | --- |
| Taker fee | 0.10% |
| Fill delay | about 0.8–3.5 seconds |
| Fill chance | 90% (the book can miss you) |
| Slippage | up to 12 bps |
| Reset | **Reset $1,000** — clears cash, positions, and open orders |

The ticket is a **limit** order (quantity + limit). Limit can follow last price or you can type it. Notional, fee, cash, and max sell are shown on the ticket.

This is not instant. Price can move while the order is working.

**Disclaimer:** simulation only. Not financial advice. Nothing is sent to an exchange.

## Tests

CI on `main` and pull requests runs lint, unit tests, e2e, then build.

```bash
npm test
npx playwright install --with-deps chromium   # once, or on CI
npm run test:e2e
```

- **Vitest** — unit tests (chart viewport / storage)
- **Playwright** — Chromium e2e against `npm run dev`

The **tests** badge on the README is the GitHub Actions workflow [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

## GitHub Pages

Deploys from **CI** after a merge (or push) to `main`. There is no `npm run deploy`: a local build is not a release.

Pipeline (`.github/workflows/deploy.yml`):

1. PR → `lint` + tests + `build` (no publish)
2. `main` → same, then official [deploy-pages](https://github.com/actions/deploy-pages)
3. Manual rerun: Actions → **Pages** → **Run workflow** (on `main`)

One-time repo settings — **without this the deploy job 404s**:

1. Open https://github.com/DenQ/live-spot-dashboard/settings/pages
2. **Build and deployment → Source: GitHub Actions** (not “Deploy from a branch” / `gh-pages`)
3. Save, then re-run **Pages** on `main` (or push this workflow)
4. Site: https://denq.github.io/live-spot-dashboard/

A 404 from `actions/deploy-pages` (`Failed to create deployment`) means Pages is still off or still pointed at a branch.

The old `gh-pages` branch can be deleted after Actions is the source. Vite `base` is `/` locally and `/live-spot-dashboard/` in CI. SPA fallback: `dist/404.html`.
