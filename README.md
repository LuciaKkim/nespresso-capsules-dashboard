# Nespresso capsule storage dashboard

A local-first web app that syncs Vertuo capsule metadata (images, sleeve size, cup volume) from Nespresso catalog pages and lets you manage inventory per storage zone with drag and drop.

## Getting started

```bash
cd nespresso-capsules-dashboard
npm install
npm run sync:catalog   # build public/catalog.json from nespresso.com
npm start
```

If the browser does not open automatically, go to **`http://localhost:5173`** (or `http://127.0.0.1:5173`).  
Do not open `index.html` directly — you need the Vite dev server.

## Usage

- **Catalog (sidebar)**: Search and filter by line (Vertuo / Original). Drag a capsule into a zone to add **one** unit at a time.
- **Storage zones**: Capacity bar, location, and notes. Use **Edit** to change zone name and max capsules.
- **Stacks in a zone**: Drag a stack card to another zone, or use **+** / **−** to adjust counts.
- **Map edit** (`/edit`): Pan the empty canvas, zoom with scroll, drag zone headers to reposition. Click capsules to select; drag one to another zone. Use the **≡** grip to preview stack order, then release to commit.
- Data is stored in the browser (`localStorage` key `nespresso-dashboard-v2-en`).
- **Guide** (`/guide`): Short onboarding, **Clear** (wipe local data), **Restore demo data** (bundled snapshot).

## Deploy on Vercel

```bash
npm run build
npx vercel deploy --prod
```

`vercel.json` handles SPA routes (`/`, `/edit`, `/guide`).  
On first visit (no saved data), the app applies the snapshot in `src/seed/dashboard.json`.

To refresh the deploy snapshot from your local browser:

```js
copy(localStorage.getItem("nespresso-dashboard-v2-en"))
```

Save the result as `data/dashboard-export.json`, then:

```bash
node scripts/update-seed-from-export.mjs
npm run build && npx vercel deploy --prod
```

## Catalog sync

`scripts/sync-catalog.mjs`:

1. Collects product IDs from [Vertuo](https://www.nespresso.com/kr/ko/order/capsules/vertuo) and [Original](https://www.nespresso.com/kr/ko/order/capsules/original) PLP HTML
2. Fetches details via Nespresso `ecapi` (`/ecapi/products/v2/kr/b2c/{base64(productId)}`)
3. Writes `public/catalog.json` (images, intensity, cup size, sleeve count, etc.)

> For personal, non-commercial inventory tracking. Respect Nespresso terms of use and robots policy; avoid aggressive request rates.
