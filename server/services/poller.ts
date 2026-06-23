import { HistoryStore } from './historyStore.js'
import type { ScrapeReading, SourceId } from '../types.js'

interface SourceScraper {
  scrape: () => Promise<Map<string, ScrapeReading>>
  close: () => Promise<void>
}

interface StatsSourceRunner {
  sourceId: SourceId
  label: string
  sourceUrl: string
  scraper: SourceScraper
}

interface StatsPollerOptions {
  intervalMs: number
  sources: StatsSourceRunner[]
  historyStore: HistoryStore
}

export class PollerService {
  private readonly intervalMs: number
  private readonly sources: StatsSourceRunner[]
  private readonly historyStore: HistoryStore
  private timer: NodeJS.Timeout | null = null
  private pollInFlight = false

  public constructor(options: StatsPollerOptions) {
    this.intervalMs = options.intervalMs
    this.sources = options.sources
    this.historyStore = options.historyStore
  }

  public async start(): Promise<void> {
    await this.pollOnce()

    this.timer = setInterval(() => {
      void this.pollOnce()
    }, this.intervalMs)
  }

  public async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    for (const source of this.sources) {
      await source.scraper.close().catch(() => undefined)
    }
  }

  public async pollOnce(): Promise<void> {
    if (this.pollInFlight) {
      return
    }

    this.pollInFlight = true

    try {
      for (const source of this.sources) {
        const attemptedAt = Date.now()
        this.historyStore.recordAttempt(source.sourceId, attemptedAt)

        try {
          const readings = await source.scraper.scrape()
          this.historyStore.recordSuccess(source.sourceId, readings)
        } catch (error) {
          this.historyStore.recordFailure(source.sourceId, error)
          console.error(
            `[poller] scrape failed for ${source.label} (${source.sourceUrl})`,
            error,
          )
        }
      }
    } finally {
      this.pollInFlight = false
    }
  }
}
