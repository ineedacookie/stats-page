import path from 'node:path'

const parsePositiveNumberEnv = (
  value: string | undefined,
  fallback: number,
): number => {
  if (typeof value === 'undefined') {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

export const SERVER_CONFIG = {
  port: parsePositiveNumberEnv(process.env.PORT, 4321),
  statsScrapeIntervalMs: parsePositiveNumberEnv(
    process.env.STATS_SCRAPE_INTERVAL_MS,
    3_600_000,
  ),
  spuriousScrapeIntervalMs: parsePositiveNumberEnv(
    process.env.SPURIOUS_SCRAPE_INTERVAL_MS,
    3_600_000,
  ),
  staleAfterMs: parsePositiveNumberEnv(process.env.STALE_AFTER_MS, 7_200_000),
  maxHistoryPoints: parsePositiveNumberEnv(process.env.MAX_HISTORY_POINTS, 1_000),
  requestTimeoutMs: parsePositiveNumberEnv(process.env.REQUEST_TIMEOUT_MS, 45_000),
  browserLaunchTimeoutMs: parsePositiveNumberEnv(
    process.env.BROWSER_LAUNCH_TIMEOUT_MS,
    30_000,
  ),
  browserNavigationTimeoutMs: parsePositiveNumberEnv(
    process.env.BROWSER_NAVIGATION_TIMEOUT_MS,
    30_000,
  ),
  browserPopulateTimeoutMs: parsePositiveNumberEnv(
    process.env.BROWSER_POPULATE_TIMEOUT_MS,
    20_000,
  ),
  browserOperationTimeoutMs: parsePositiveNumberEnv(
    process.env.BROWSER_OPERATION_TIMEOUT_MS,
    55_000,
  ),
  scrapePopulateMaxAttempts: parsePositiveNumberEnv(
    process.env.SCRAPE_POPULATE_MAX_ATTEMPTS,
    1,
  ),
  scrapePopulateWaitMs: parsePositiveNumberEnv(
    process.env.SCRAPE_POPULATE_WAIT_MS,
    5_000,
  ),
  politeMinDelayMs: parsePositiveNumberEnv(process.env.POLITE_MIN_DELAY_MS, 15_000),
  politeJitterMs: parsePositiveNumberEnv(process.env.POLITE_JITTER_MS, 5_000),
  scraperUserAgent:
    process.env.SCRAPER_USER_AGENT ??
    'LiveStatsDashboardBot/1.0 (+local educational dashboard; hourly polite fetches)',
  spuriousPagesPerRun: parsePositiveNumberEnv(
    process.env.SPURIOUS_PAGES_PER_RUN,
    5,
  ),
  spuriousMaxStored: parsePositiveNumberEnv(
    process.env.SPURIOUS_MAX_STORED,
    1_500,
  ),
  spuriousWidgetCycleMs: parsePositiveNumberEnv(
    process.env.SPURIOUS_WIDGET_CYCLE_MS,
    45_000,
  ),
  frontendPollIntervalMs: parsePositiveNumberEnv(
    process.env.FRONTEND_POLL_INTERVAL_MS,
    30_000,
  ),
  internetLiveStatsUrl:
    process.env.ILS_SOURCE_URL ?? 'https://www.internetlivestats.com/',
  worldometersUrl: process.env.WORLDMETERS_SOURCE_URL ?? 'https://www.worldometers.info/',
  spuriousCorrelationsUrl:
    process.env.SPURIOUS_SOURCE_URL ?? 'https://www.tylervigen.com/spurious-correlations',
  dataDirectory:
    process.env.DATA_DIRECTORY ?? path.resolve(process.cwd(), 'server-data'),
  spuriousStoreFile:
    process.env.SPURIOUS_STORE_FILE ??
    path.resolve(process.cwd(), 'server-data/spurious-correlations.json'),
  statsStoreFile:
    process.env.STATS_STORE_FILE ??
    path.resolve(process.cwd(), 'server-data/stats-snapshots.json'),
  worldometersSectionDescription:
    process.env.WORLDMETERS_SECTION_DESCRIPTION ??
    'Worldometers global activity counters sampled hourly.',
  internetLiveStatsSectionDescription:
    process.env.ILS_SECTION_DESCRIPTION ??
    'Internet Live Stats counters sampled hourly.',
  sourcesMetadata: {
    internetLiveStatsLabel: 'Internet Live Stats',
    worldometersLabel: 'Worldometers',
    spuriousLabel: 'Tyler Vigen Spurious Correlations',
  },
}
