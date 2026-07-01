import type { Server } from 'node:http'

import cors from 'cors'
import express from 'express'

import { SERVER_CONFIG } from './config.js'
import { createCamsRouter } from './routes/cams.js'
import { createStatsRouter } from './routes/stats.js'
import { BrowserScrapeRuntime } from './scraper/browserScrapeRuntime.js'
import { PoliteHtmlClient } from './scraper/politeHtmlClient.js'
import { SpuriousCorrelationsScraper } from './scraper/spuriousCorrelationsScraper.js'
import { WorldometersScraper } from './scraper/worldometersScraper.js'
import { HistoryStore } from './services/historyStore.js'
import { LiveCamService } from './services/liveCamService.js'
import { PollerService } from './services/poller.js'
import { SpuriousCorrelationService } from './services/spuriousCorrelationService.js'
import type { StatsSourceDefinition } from './types.js'

const SHUTDOWN_STEP_TIMEOUT_MS = 4_000
const SHUTDOWN_HARD_TIMEOUT_MS = 6_000

const runWithTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | null = null
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutMessage))
    }, timeoutMs)
  })

  try {
    return await Promise.race([operation(), timeoutPromise])
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  }
}

const closeServer = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

const createApp = async (): Promise<{
  app: express.Express
  poller: PollerService
  spuriousCorrelationService: SpuriousCorrelationService
}> => {
  const statsSources: StatsSourceDefinition[] = [
    {
      sourceId: 'worldometers',
      label: SERVER_CONFIG.sourcesMetadata.worldometersLabel,
      sourceUrl: SERVER_CONFIG.worldometersUrl,
      intervalMs: SERVER_CONFIG.statsScrapeIntervalMs,
    },
  ]

  const historyStore = new HistoryStore({
    sources: statsSources,
    maxHistoryPoints: SERVER_CONFIG.maxHistoryPoints,
    staleAfterMs: SERVER_CONFIG.staleAfterMs,
    pollIntervalMs: SERVER_CONFIG.statsScrapeIntervalMs,
  })

  const politeHtmlClient = new PoliteHtmlClient({
    userAgent: SERVER_CONFIG.scraperUserAgent,
    minDelayMs: SERVER_CONFIG.politeMinDelayMs,
    jitterMs: SERVER_CONFIG.politeJitterMs,
    requestTimeoutMs: SERVER_CONFIG.requestTimeoutMs,
  })

  const browserScrapeRuntime = new BrowserScrapeRuntime({
    userAgent: SERVER_CONFIG.scraperUserAgent,
    launchTimeoutMs: SERVER_CONFIG.browserLaunchTimeoutMs,
    navigationTimeoutMs: SERVER_CONFIG.browserNavigationTimeoutMs,
    populateTimeoutMs: SERVER_CONFIG.browserPopulateTimeoutMs,
    operationTimeoutMs: SERVER_CONFIG.browserOperationTimeoutMs,
  })

  const worldometersScraper = new WorldometersScraper({
    sourceUrl: SERVER_CONFIG.worldometersUrl,
    runtime: browserScrapeRuntime,
    maxPopulateAttempts: SERVER_CONFIG.scrapePopulateMaxAttempts,
    populateWaitMs: SERVER_CONFIG.scrapePopulateWaitMs,
  })

  const spuriousCorrelationsScraper = new SpuriousCorrelationsScraper({
    listingUrl: SERVER_CONFIG.spuriousCorrelationsUrl,
    htmlClient: politeHtmlClient,
  })

  const spuriousCorrelationService = new SpuriousCorrelationService({
    scraper: spuriousCorrelationsScraper,
    sourceUrl: SERVER_CONFIG.spuriousCorrelationsUrl,
    sourceLabel: SERVER_CONFIG.sourcesMetadata.spuriousLabel,
    storageFilePath: SERVER_CONFIG.spuriousStoreFile,
    intervalMs: SERVER_CONFIG.spuriousScrapeIntervalMs,
    pagesPerRun: SERVER_CONFIG.spuriousPagesPerRun,
    maxStoredCorrelations: SERVER_CONFIG.spuriousMaxStored,
    widgetCycleMs: SERVER_CONFIG.spuriousWidgetCycleMs,
  })

  const poller = new PollerService({
    intervalMs: SERVER_CONFIG.statsScrapeIntervalMs,
    sources: [
      {
        ...statsSources[0],
        scraper: worldometersScraper,
      },
    ],
    historyStore,
  })

  const liveCamService = new LiveCamService({
    livenessTtlMs: SERVER_CONFIG.camLivenessTtlMs,
    livenessTimeoutMs: SERVER_CONFIG.camLivenessTimeoutMs,
  })

  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use('/api', createStatsRouter(historyStore, spuriousCorrelationService))
  app.use('/api', createCamsRouter(liveCamService))
  app.get('/', (_request, response) => {
    response.json({
      name: 'multi-source-live-stats-proxy',
      statsIntervalMs: SERVER_CONFIG.statsScrapeIntervalMs,
      spuriousIntervalMs: SERVER_CONFIG.spuriousScrapeIntervalMs,
      pagesPerRun: SERVER_CONFIG.spuriousPagesPerRun,
    })
  })

  return { app, poller, spuriousCorrelationService }
}

const startServer = async (): Promise<void> => {
  const { app, poller, spuriousCorrelationService } = await createApp()
  const server = app.listen(SERVER_CONFIG.port, () => {
    console.log(`[server] listening on http://localhost:${SERVER_CONFIG.port}`)
  })

  void poller.start()
  void spuriousCorrelationService.start()

  let shuttingDown = false

  const shutdown = async (
    signal: string,
    options: { exitCode?: number } = {},
  ): Promise<void> => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    console.log(`[server] received ${signal}, shutting down`)
    const hardExitCode = options.exitCode ?? 1
    const hardTimeoutHandle = setTimeout(() => {
      console.error(
        `[server] shutdown exceeded ${SHUTDOWN_HARD_TIMEOUT_MS}ms, forcing exit`,
      )
      process.exit(hardExitCode)
    }, SHUTDOWN_HARD_TIMEOUT_MS)
    hardTimeoutHandle.unref()

    await Promise.allSettled([
      runWithTimeout(
        async () => {
          await poller.stop()
        },
        SHUTDOWN_STEP_TIMEOUT_MS,
        `poller.stop timed out after ${SHUTDOWN_STEP_TIMEOUT_MS}ms`,
      ),
      runWithTimeout(
        async () => {
          await spuriousCorrelationService.stop()
        },
        SHUTDOWN_STEP_TIMEOUT_MS,
        `spuriousCorrelationService.stop timed out after ${SHUTDOWN_STEP_TIMEOUT_MS}ms`,
      ),
      runWithTimeout(
        async () => {
          await closeServer(server)
        },
        SHUTDOWN_STEP_TIMEOUT_MS,
        `server.close timed out after ${SHUTDOWN_STEP_TIMEOUT_MS}ms`,
      ),
    ])

    clearTimeout(hardTimeoutHandle)

    if (typeof options.exitCode === 'number') {
      process.exit(options.exitCode)
    }
  }

  process.once('SIGINT', () => {
    void shutdown('SIGINT', { exitCode: 0 })
  })
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM', { exitCode: 0 })
  })
  process.once('uncaughtException', (error) => {
    console.error('[server] uncaught exception', error)
    void shutdown('uncaughtException', { exitCode: 1 })
  })
  process.once('unhandledRejection', (reason) => {
    console.error('[server] unhandled rejection', reason)
    void shutdown('unhandledRejection', { exitCode: 1 })
  })
}

void startServer().catch((error) => {
  console.error('[server] failed to start', error)
  process.exit(1)
})
