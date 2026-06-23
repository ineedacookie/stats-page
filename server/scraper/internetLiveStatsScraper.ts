import {
  INTERNET_LIVE_STATS_METRICS,
  METRIC_REGISTRY_BY_SOURCE_REL,
  metricSourceRelKey,
} from '../metrics/registry.js'
import { BrowserScrapeRuntime } from './browserScrapeRuntime.js'
import { parseCounterValue, sanitizeCounterText } from './parsers.js'
import type { ScrapeReading } from '../types.js'

interface ScraperOptions {
  sourceUrl: string
  runtime: BrowserScrapeRuntime
  maxPopulateAttempts: number
  populateWaitMs: number
}

export class InternetLiveStatsScraper {
  private readonly sourceUrl: string
  private readonly runtime: BrowserScrapeRuntime
  private readonly maxPopulateAttempts: number
  private readonly populateWaitMs: number

  public constructor(options: ScraperOptions) {
    this.sourceUrl = options.sourceUrl
    this.runtime = options.runtime
    this.maxPopulateAttempts = Math.max(1, Math.floor(options.maxPopulateAttempts))
    this.populateWaitMs = Math.max(0, Math.floor(options.populateWaitMs))
  }

  public async scrape(): Promise<Map<string, ScrapeReading>> {
    let bestReadings = new Map<string, ScrapeReading>()
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxPopulateAttempts; attempt += 1) {
      try {
        const countersBySourceRel = await this.runtime.captureCounters(this.sourceUrl)
        const sampledAt = Date.now()
        const readings = this.extractReadings(countersBySourceRel, sampledAt)

        if (readings.size > bestReadings.size) {
          bestReadings = readings
        }

        if (readings.size >= INTERNET_LIVE_STATS_METRICS.length) {
          return readings
        }
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error('Unknown browser scrape failure')
      }

      if (attempt < this.maxPopulateAttempts && this.populateWaitMs > 0) {
        await this.wait(this.populateWaitMs)
      }
    }

    if (bestReadings.size > 0) {
      return bestReadings
    }

    if (lastError) {
      throw new Error(
        `Unable to resolve populated Internet Live Stats counters: ${lastError.message}`,
      )
    }

    throw new Error('Unable to resolve populated Internet Live Stats counters')
  }

  public async close(): Promise<void> {
    await this.runtime.close()
  }

  private extractReadings(
    countersBySourceRel: Map<string, string>,
    sampledAt: number,
  ): Map<string, ScrapeReading> {
    const readings = new Map<string, ScrapeReading>()

    for (const [sourceRel, counterText] of countersBySourceRel.entries()) {
      const metric = METRIC_REGISTRY_BY_SOURCE_REL.get(
        metricSourceRelKey('internetlivestats', sourceRel),
      )
      if (!metric) {
        continue
      }

      const rawText = sanitizeCounterText(counterText)
      const value = parseCounterValue(rawText)
      if (value === null) {
        continue
      }

      readings.set(metric.rel, {
        rel: metric.rel,
        rawText,
        value,
        sampledAt,
      })
    }

    return readings
  }

  private async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }
}
