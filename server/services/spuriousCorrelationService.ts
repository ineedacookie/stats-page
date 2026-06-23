import path from 'node:path'
import { promises as fs } from 'node:fs'

import { SpuriousCorrelationsScraper } from '../scraper/spuriousCorrelationsScraper.js'
import type {
  SourceHealth,
  SpuriousCorrelationRecord,
  SpuriousCorrelationWidgetPayload,
} from '../types.js'

interface SpuriousCorrelationServiceOptions {
  scraper: SpuriousCorrelationsScraper
  sourceUrl: string
  sourceLabel: string
  storageFilePath: string
  intervalMs: number
  pagesPerRun: number
  widgetCycleMs: number
}

interface SpuriousStoreFile {
  version: 1
  nextPage: number
  lastScrapedAt: number | null
  correlations: SpuriousCorrelationRecord[]
}

const DEFAULT_STORE_FILE: SpuriousStoreFile = {
  version: 1,
  nextPage: 1,
  lastScrapedAt: null,
  correlations: [],
}

const SPURIOUS_WRITE_TEMP_SUFFIX = '.tmp-write'

export class SpuriousCorrelationService {
  private readonly scraper: SpuriousCorrelationsScraper
  private readonly sourceUrl: string
  private readonly sourceLabel: string
  private readonly storageFilePath: string
  private readonly intervalMs: number
  private readonly pagesPerRun: number
  private readonly widgetCycleMs: number
  private timer: NodeJS.Timeout | null = null
  private loaded = false
  private ingestInFlight = false
  private storeFile: SpuriousStoreFile = { ...DEFAULT_STORE_FILE }
  private readonly sourceHealth: SourceHealth

  public constructor(options: SpuriousCorrelationServiceOptions) {
    this.scraper = options.scraper
    this.sourceUrl = options.sourceUrl
    this.sourceLabel = options.sourceLabel
    this.storageFilePath = options.storageFilePath
    this.intervalMs = options.intervalMs
    this.pagesPerRun = options.pagesPerRun
    this.widgetCycleMs = options.widgetCycleMs

    this.sourceHealth = {
      sourceId: 'spurious-correlations',
      label: options.sourceLabel,
      sourceUrl: options.sourceUrl,
      intervalMs: options.intervalMs,
      expectedMetricCount: 0,
      resolvedMetricCount: 0,
      unresolvedMetricCount: 0,
      partial: false,
      freshnessMs: null,
      connected: false,
      stale: true,
      lastSuccessfulScrapeAt: null,
      lastAttemptAt: null,
      lastError: null,
    }
  }

  public async start(): Promise<void> {
    await this.loadFromDisk()
    await this.ingestOnce()

    this.timer = setInterval(() => {
      void this.ingestOnce()
    }, this.intervalMs)
  }

  public async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  public getSourceHealth(): SourceHealth {
    this.refreshStaleness()
    return { ...this.sourceHealth }
  }

  public getWidgetPayload(limit = 140): SpuriousCorrelationWidgetPayload {
    this.refreshStaleness()

    const items = this.storeFile.correlations.slice(0, limit)
    return {
      generatedAt: Date.now(),
      cycleIntervalMs: this.widgetCycleMs,
      pagesPerRun: this.pagesPerRun,
      total: this.storeFile.correlations.length,
      nextPage: this.storeFile.nextPage,
      lastScrapedAt: this.storeFile.lastScrapedAt,
      items,
    }
  }

  private async ingestOnce(): Promise<void> {
    if (this.ingestInFlight) {
      return
    }

    this.ingestInFlight = true
    this.sourceHealth.lastAttemptAt = Date.now()

    try {
      await this.loadFromDisk()
      const result = await this.scraper.scrapePages(
        this.storeFile.nextPage,
        this.pagesPerRun,
      )

      const byCorrelationNumber = new Map<number, SpuriousCorrelationRecord>()
      for (const item of this.storeFile.correlations) {
        byCorrelationNumber.set(item.correlationNumber, item)
      }
      for (const item of result.items) {
        byCorrelationNumber.set(item.correlationNumber, item)
      }

      this.storeFile.correlations = Array.from(byCorrelationNumber.values()).sort(
        (left, right) => left.correlationNumber - right.correlationNumber,
      )
      this.storeFile.nextPage = this.resolveNextPage(result.nextPage, result.pagesScraped)
      this.storeFile.lastScrapedAt = Date.now()

      await this.saveToDisk()

      this.sourceHealth.connected = true
      this.sourceHealth.lastError = null
      this.sourceHealth.lastSuccessfulScrapeAt = this.storeFile.lastScrapedAt
      this.refreshStaleness()
    } catch (error) {
      this.sourceHealth.connected = false
      this.sourceHealth.lastError =
        error instanceof Error ? error.message : 'Unknown spurious scrape failure'
      this.refreshStaleness()
      console.error('[spurious] ingest failed', error)
    } finally {
      this.ingestInFlight = false
    }
  }

  private async loadFromDisk(): Promise<void> {
    if (this.loaded) {
      return
    }

    await fs.mkdir(path.dirname(this.storageFilePath), { recursive: true })

    try {
      const raw = await fs.readFile(this.storageFilePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<SpuriousStoreFile>
      this.storeFile = {
        version: 1,
        nextPage:
          typeof parsed.nextPage === 'number' && parsed.nextPage > 0
            ? Math.floor(parsed.nextPage)
            : 1,
        lastScrapedAt:
          typeof parsed.lastScrapedAt === 'number' ? parsed.lastScrapedAt : null,
        correlations: this.sanitizeCorrelations(parsed.correlations),
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }

      this.storeFile = { ...DEFAULT_STORE_FILE }
      await this.saveToDisk()
    } finally {
      this.loaded = true
    }
  }

  private async saveToDisk(): Promise<void> {
    const json = JSON.stringify(this.storeFile, null, 2)
    const tempFilePath = `${this.storageFilePath}${SPURIOUS_WRITE_TEMP_SUFFIX}`
    await fs.writeFile(tempFilePath, json, 'utf8')
    await fs.rename(tempFilePath, this.storageFilePath)
  }

  private refreshStaleness(): void {
    const now = Date.now()
    const staleThresholdMs = this.intervalMs * 1.5
    this.sourceHealth.freshnessMs =
      this.sourceHealth.lastSuccessfulScrapeAt === null
        ? null
        : Math.max(0, now - this.sourceHealth.lastSuccessfulScrapeAt)
    this.sourceHealth.stale =
      this.sourceHealth.freshnessMs === null ||
      this.sourceHealth.freshnessMs > staleThresholdMs
  }

  private sanitizeCorrelations(
    unknownEntries: unknown,
  ): SpuriousCorrelationRecord[] {
    if (!Array.isArray(unknownEntries)) {
      return []
    }

    const dedupedByCorrelation = new Map<number, SpuriousCorrelationRecord>()
    for (const entry of unknownEntries) {
      if (
        typeof entry !== 'object' ||
        entry === null ||
        typeof (entry as SpuriousCorrelationRecord).correlationNumber !== 'number' ||
        !Number.isInteger((entry as SpuriousCorrelationRecord).correlationNumber) ||
        typeof (entry as SpuriousCorrelationRecord).title !== 'string' ||
        typeof (entry as SpuriousCorrelationRecord).detailUrl !== 'string' ||
        typeof (entry as SpuriousCorrelationRecord).imageUrl !== 'string'
      ) {
        continue
      }

      dedupedByCorrelation.set(
        (entry as SpuriousCorrelationRecord).correlationNumber,
        entry as SpuriousCorrelationRecord,
      )
    }

    return Array.from(dedupedByCorrelation.values()).sort(
      (left, right) => left.correlationNumber - right.correlationNumber,
    )
  }

  private resolveNextPage(rawNextPage: number, pagesScraped: number): number {
    const candidateNextPage = Number.isInteger(rawNextPage) ? rawNextPage : 1
    if (candidateNextPage > this.storeFile.nextPage) {
      return candidateNextPage
    }

    const guaranteedForwardProgress = Math.max(
      1,
      this.storeFile.nextPage + Math.max(1, pagesScraped),
    )
    return guaranteedForwardProgress
  }
}
