# LiveStats Dashboard

Fullscreen local dashboard that runs as a scene rotator:
- A random, ad-free live animal cam plays fullscreen for 20 minutes
- Then the stats scene takes over for 3 minutes: Worldometers live counters + Tyler Vigen spurious-correlation graphics
- Then a new random animal cam, and the loop repeats

Live cams are all ad-free, from three sources:
- **explore.org** — the nonprofit live-nature-cam network (includes Katmai National Park's Brooks Falls bears). Non-monetized YouTube live streams.
- **U.S. Fish & Wildlife Service** — a federal agency wildlife cam (e.g. a bald eagle nest). Non-monetized YouTube.
- **San Diego Zoo** — direct HLS from the zoo's own CDN.

YouTube cams play through YouTube's own IFrame player (adaptive HD, rock-solid); the server resolves each channel's current live video at request time via its stable `/live` URL, so video IDs never need maintaining. San Diego Zoo cams play via `hls.js` straight from the zoo's CDN. Idle/offline cams are skipped automatically.

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

Then start the dashboard:

```bash
npm run dev
```

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

Open:
- Dashboard: `http://localhost:5173`
- API: `http://localhost:4321/api/stats`

## Daily Commands

- `npm run bootstrap` - one-step local environment setup
- `npm run dev:easy` - easiest daily command (update + setup + run)
- `npm run setup:easy` - setup only (no servers started)
- `npm run dev` - run frontend + backend
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

- The screen is a scene rotator: an ad-free live animal cam plays fullscreen for 20 minutes, then the stats + spurious-correlation view for 3 minutes, then a new random cam.
- Edit the curated cam list in `server/config/liveCams.ts`. Each entry is either `kind: 'youtube'` (a channel `handle`, resolved to its current live video) or `kind: 'hls'` (a direct `.m3u8` URL). Scene durations live in `src/config/scenes.ts` (`CAM_SCENE_MS`, `STATS_SCENE_MS`).
- YouTube cams resolve automatically from each channel's `/live` page (no video-ID maintenance). To add one, add its channel handle (e.g. `youtube.com/@ExploreOceans`). San Diego Zoo channel slugs drift occasionally; if a cam stops loading, open its page under `https://zoo.sandiegozoo.org/cams/*` and update the `channel` in the `camzone(...)` URL.
- Memory: the cam player is built imperatively and fully destroyed on every cam change and whenever the stats scene takes over (the cam stage unmounts), so no YouTube/hls.js instances accumulate over long kiosk runs. Server-side caches (resolved cams, recent-ids) are bounded by the cam count.
- InternetLiveStats ingestion is removed from active dashboard sources.
- Worldometers sections are intentionally compact for fullscreen display.
- Spurious-correlation data is persisted and deduplicated in `server-data/`.
- Spurious correlation storage is bounded (`SPURIOUS_MAX_STORED`) and written as compact JSON.
- Metric history is in-memory only and bounded by `MAX_HISTORY_POINTS`.
