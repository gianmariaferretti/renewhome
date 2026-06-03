# Renew Home App Prototype

Working mobile web prototype inspired by the uploaded Renew Home mockup and business model canvas.

## What works

- Onboarding flow: welcome screen, device connection, comfort preference setup.
- Home dashboard: savings, points, home status, weekly shifted-energy chart.
- Energy Shift event: live countdown, opt-out, rejoin and bonus points.
- Rewards: redeem bill credit, gift cards or tree planting with local point balance.
- Impact: CO2 avoided, trees, neighborhood leaderboard and shareable impact card.
- Local persistence with `localStorage`.
- PWA-ready manifest and service worker for offline use after first load on an HTTP server.

## Run locally

From this folder:

```bash
python3 -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

You can also open `index.html` directly in a browser, but the service worker will only work from `http://localhost` or HTTPS.

## Files

- `index.html` - app shell
- `styles.css` - mobile UI styling
- `app.js` - all interactions and demo state
- `manifest.webmanifest` - PWA metadata
- `service-worker.js` - cache/offline support
- `assets/icon.svg` - app icon

## Notes

This is a front-end prototype with simulated data. It does not connect to real Nest, Google Home, utility, payment or grid APIs yet.
