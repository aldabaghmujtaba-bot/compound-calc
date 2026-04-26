# Compound Interest Calculator (PWA)

A fully offline, installable Progressive Web App for calculating compound interest with a year-by-year growth chart and a contribution-tier comparison. Pure HTML/CSS/JS — no frameworks, no build step.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | App shell and markup |
| `styles.css` | Mobile-first styling (dark + light) |
| `app.js` | Math engine, charts, comparison, input handling, SW registration |
| `manifest.json` | PWA manifest (name, icons, theme) |
| `service-worker.js` | Offline cache (cache-first for assets, network-first for HTML) |
| `icon.svg` | Vector app icon |
| `icon-192.png`, `icon-512.png` | PNG icons referenced by the manifest |
| `icon-180.png` | iOS Apple touch icon |

## Run locally

A service worker requires HTTPS or `localhost`:

```bash
cd Portfolio-Calculator
python3 -m http.server 8080
# open http://localhost:8080
```

## Host on GitHub Pages

```bash
git init
git add .
git commit -m "Compound interest PWA"
git branch -M main
git remote add origin https://github.com/<your-user>/<repo>.git
git push -u origin main
```

Then **Settings → Pages → Source: Deploy from branch → main / (root) → Save**. Your URL will be `https://<your-user>.github.io/<repo>/`.

Netlify, Cloudflare Pages, and Vercel work identically — drag the folder in.

## Install on iPhone (Safari)

Open the URL in **Safari** → **Share** → **Add to Home Screen** → **Add**.

## Install on Android (Chrome)

Open the URL in **Chrome** → ⋮ menu → **Install app**.

## Features

- Inputs: principal, monthly contribution, annual rate, compounding frequency (monthly/quarterly/annually), time period (1–40 year slider).
- Final balance, total contributions, total interest, year-by-year stacked bar chart with tap tooltips.
- **Contribution comparison**: live horizontal-bar chart and table for $1k–$7k monthly tiers using your principal/rate/time. The tier matching your input is highlighted with an accent gradient and a "← you" badge.
- Math: month-by-month simulation. Interest applies at every compounding boundary using the annual rate divided by frequency.
- Offline: service worker caches the shell on first load; updates picked up automatically.

## Updating

Bump `VERSION` at the top of `service-worker.js` whenever you change cached assets — old caches are purged on activate.
