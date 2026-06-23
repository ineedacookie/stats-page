# Internet Live Stats Dashboard

Modern local dashboard that combines hourly scraped data from InternetLiveStats,
Worldometers, and Tyler Vigen's spurious correlations.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind + Recharts
- Backend: Node + Express + Cheerio scraping services
- Data model: Multi-source metric catalog with rolling history + persisted spurious set

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run frontend and backend together:

   ```bash
   npm run dev
   ```

3. Open:
   - Dashboard: `http://localhost:5173`
   - API: `http://localhost:4321/api/stats`

## Scripts

- `npm run dev` - run backend + frontend concurrently
- `npm run dev:server` - run backend only (`tsx watch`)
- `npm run dev:client` - run frontend only
- `npm run build` - build frontend and backend
- `npm run start` - run compiled backend from `server-dist`
- `npm run lint` - run Oxlint

## Environment Variables

All values are optional.

- `PORT` (default `4321`)
- `STATS_SCRAPE_INTERVAL_MS` (default `3600000`, 1 hour)
- `SPURIOUS_SCRAPE_INTERVAL_MS` (default `3600000`, 1 hour)
- `SPURIOUS_PAGES_PER_RUN` (default `5`)
- `SPURIOUS_WIDGET_CYCLE_MS` (default `9000`)
- `FRONTEND_POLL_INTERVAL_MS` (default `30000`)
- `STALE_AFTER_MS` (default `7200000`)
- `MAX_HISTORY_POINTS` (default `1000`)
- `REQUEST_TIMEOUT_MS` (default `45000`)
- `SCRAPE_POPULATE_MAX_ATTEMPTS` (default `3`) retries when counters still show loading
- `SCRAPE_POPULATE_WAIT_MS` (default `10000`) pause between loading retries
- `POLITE_MIN_DELAY_MS` (default `15000`) minimum delay between requests per host
- `POLITE_JITTER_MS` (default `5000`) additional randomized spacing per host
- `SCRAPER_USER_AGENT` (default identifies this local dashboard bot)
- `ILS_SOURCE_URL` (default `https://www.internetlivestats.com/`)
- `WORLDMETERS_SOURCE_URL` (default `https://www.worldometers.info/`)
- `SPURIOUS_SOURCE_URL` (default `https://www.tylervigen.com/spurious-correlations`)
- `SPURIOUS_STORE_FILE` (default `server-data/spurious-correlations.json`)

## Data Behavior

- InternetLiveStats and Worldometers counters are scraped hourly and stored in rolling
  in-memory history for charting.
- Requests are serialized through a polite fetch client with per-host spacing and jitter
  to avoid burst traffic.
- If a scrape pass still contains loading placeholders, the scraper waits and retries
  before returning results.
- If a source responds with `429`/`503`, the client respects `Retry-After` and backs off.
- Missing or blocked counters are filled with rate-modeled fallback values so charts
  keep updating predictably.
- Tyler Vigen ingestion scrapes exactly 5 pages per hourly run, persists results to
  disk, dedupes by correlation number, and keeps entries sorted by correlation number.
- API response includes a spurious-correlation widget payload for frontend cycling.

## Layout

- `server/index.ts` - backend entrypoint
- `server/metrics/registry.ts` - metric and section catalog
- `server/scraper/` - InternetLiveStats, Worldometers, and Tyler Vigen scrapers
- `server/services/historyStore.ts` - rolling metric history and source health
- `server/services/spuriousCorrelationService.ts` - persisted spurious ingestion + dedupe
- `server/routes/stats.ts` - API endpoints
- `server-data/spurious-correlations.json` - persisted spurious-correlation storage
- `src/components/` - dashboard cards, charts, section UI
- `src/hooks/useLiveStats.ts` - frontend polling hook
- `src/config/sections.ts` - section-cycle timing and theme mapping
