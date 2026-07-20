# LiveStats Dashboard

Fullscreen local dashboard that runs as a scene rotator:
- A random live nature cam plays fullscreen for 20 minutes
- Then the stats scene takes over for 3 minutes: Worldometers live counters + Tyler Vigen spurious-correlation graphics
- Then a new random animal cam, and the loop repeats

Live cams are curated from four sources:
- **explore.org** — the nonprofit live-nature-cam network (includes Katmai National Park's Brooks Falls bears). Non-monetized YouTube live streams.
- **U.S. Fish & Wildlife Service** — a federal agency wildlife cam (e.g. a bald eagle nest). Non-monetized YouTube.
- **San Diego Zoo** — direct HLS from the zoo's own CDN.
- **Floating Green (Coeur d'Alene)** — Verkada-hosted golf-course live cam, resolved/proxied server-side.

Ad policy: YouTube sources are restricted to official nonprofit or government
feeds that do not monetize their live broadcasts; commercial channels are
excluded. YouTube ultimately controls embed delivery, so this is a best-effort
ad-free policy rather than an absolute technical guarantee.

YouTube cams play through YouTube's own IFrame player. The registry supports both specific broadcasts (including Brooks Falls, Brooks River, and Anan bear cams) and category channels whose current featured stream is resolved from a stable `/live` URL. San Diego Zoo cams play via `hls.js` straight from the zoo's CDN. The Floating Green Verkada cam is resolved to a short-lived HLS URL server-side and played through an API proxy because direct embedding is domain-restricted. Idle, ended, or non-embeddable cams are skipped automatically.

## Fast Setup (new computer)

Prereqs:
- Node.js 20+
- npm
- git

After cloning the repo, run:

```bash
npm run bootstrap
```

This helper script will:
- install npm dependencies
- install Puppeteer Chrome runtime
- create `server-data/` if missing

For the always-on display, build and start the production kiosk:

```bash
npm run kiosk
```

Open `http://localhost:4321`.

For development with hot reload, use `npm run dev` and open
`http://localhost:5173`.

## Setup After You Pull Latest

If the repo already exists and you just pulled changes, re-run:

```bash
npm run bootstrap
```

It is safe to run repeatedly; it only ensures your local environment is ready.

If you want one command that pulls + sets up + starts everything:

```bash
npm run dev:easy
```

To skip auto-pull in that flow:

```bash
SKIP_PULL=1 npm run dev:easy
```

## Daily Commands

- `npm run bootstrap` - one-step local environment setup
- `npm run kiosk` - production build + single-server mode for long display runs
- `npm run dev:easy` - easiest daily command (update + setup + run)
- `npm run setup:easy` - setup only (no servers started)
- `npm run dev` - run the frontend + backend development servers
- `npm run dev:server` - backend only
- `npm run dev:client` - frontend only
- `npm run build` - build frontend + backend
- `npm run start` - run compiled backend from `server-dist`
- `npm run lint` - run Oxlint

## Environment Variables

All values are optional:

- `PORT` (default `4321`)
- `STATS_SCRAPE_INTERVAL_MS` (default `3600000`)
- `SPURIOUS_SCRAPE_INTERVAL_MS` (default `3600000`)
- `SPURIOUS_PAGES_PER_RUN` (default `5`)
- `SPURIOUS_MAX_STORED` (default `1500`)
- `SPURIOUS_WIDGET_CYCLE_MS` (default `45000`)
- `FRONTEND_POLL_INTERVAL_MS` (default `30000`)
- `CAM_LIVENESS_TTL_MS` (default `60000`)
- `CAM_LIVENESS_TIMEOUT_MS` (default `6000`)
- `STALE_AFTER_MS` (default `7200000`)
- `MAX_HISTORY_POINTS` (default `1000`)
- `REQUEST_TIMEOUT_MS` (default `45000`)
- `BROWSER_LAUNCH_TIMEOUT_MS` (default `30000`)
- `BROWSER_NAVIGATION_TIMEOUT_MS` (default `30000`)
- `BROWSER_POPULATE_TIMEOUT_MS` (default `20000`)
- `BROWSER_OPERATION_TIMEOUT_MS` (default `55000`)
- `SCRAPE_POPULATE_MAX_ATTEMPTS` (default `1`)
- `SCRAPE_POPULATE_WAIT_MS` (default `5000`)
- `POLITE_MIN_DELAY_MS` (default `15000`)
- `POLITE_JITTER_MS` (default `5000`)
- `SCRAPER_USER_AGENT` (default identifies this local dashboard bot)
- `WORLDMETERS_SOURCE_URL` (default `https://www.worldometers.info/`)
- `SPURIOUS_SOURCE_URL` (default `https://www.tylervigen.com/spurious-correlations`)
- `SPURIOUS_STORE_FILE` (default `server-data/spurious-correlations.json`)

## Notes

- The screen is a scene rotator: a live nature cam plays fullscreen for 20 minutes, then the stats + spurious-correlation view for 3 minutes, then a new random cam.
- Edit the curated cam list in `server/config/liveCams.ts`. Entries can be `kind: 'youtube-video'` (specific `videoId`), `kind: 'youtube-channel'` (channel `handle`), `kind: 'hls'` (direct `.m3u8`), or `kind: 'verkada'` (`authUrl` resolved/proxied server-side). Scene durations live in `src/config/scenes.ts`.
- Specific YouTube broadcasts use fixed IDs; if a seasonal stream is offline, the player watchdog skips it. Category channels resolve automatically from their `/live` page. San Diego Zoo channel slugs drift occasionally; if a cam stops loading, open its page under `https://zoo.sandiegozoo.org/cams/*` and update the `channel` in the `camzone(...)` URL.
- Long-run safety: the next cam is prefetched near the end of the stats scene, players have startup/stall watchdogs, proxied HLS requests are aborted when the player disconnects, and the page renews its session at a stats boundary every two hours. Stats polling pauses while videos play and omits history the kiosk does not render. Use `npm run kiosk` so the display runs a production React build without the development server or Strict Mode's development-only double mounting.
- InternetLiveStats ingestion is removed from active dashboard sources.
- Worldometers sections are intentionally compact for fullscreen display.
- Spurious-correlation data is persisted and deduplicated in `server-data/`.
- Spurious correlation storage is bounded (`SPURIOUS_MAX_STORED`) and written as compact JSON.
- Metric history is in-memory only and bounded by `MAX_HISTORY_POINTS`.
