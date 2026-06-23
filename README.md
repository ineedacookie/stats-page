# LiveStats Dashboard

Fullscreen local dashboard for:
- Worldometers live counters
- Tyler Vigen spurious-correlation graphics

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

- InternetLiveStats ingestion is removed from active dashboard sources.
- Worldometers sections are intentionally compact for fullscreen display.
- Spurious-correlation data is persisted and deduplicated in `server-data/`.
- Spurious correlation storage is bounded (`SPURIOUS_MAX_STORED`) and written as compact JSON.
- Metric history is in-memory only and bounded by `MAX_HISTORY_POINTS`.
