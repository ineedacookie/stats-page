import { load } from 'cheerio'

import {
  METRIC_REGISTRY_BY_SOURCE_REL,
  WORLDMETERS_METRICS,
  metricSourceRelKey,
} from '../metrics/registry.js'
import { PoliteHtmlClient } from './politeHtmlClient.js'
import { parseCounterValue, sanitizeCounterText } from './parsers.js'
import type { MetricDefinition, ScrapeReading } from '../types.js'

interface WorldometersScraperOptions {
  sourceUrl: string
  htmlClient: PoliteHtmlClient
  maxPopulateAttempts: number
  populateWaitMs: number
}

const FALLBACK_ABSOLUTE_BASE_TIMESTAMP_MS = Date.UTC(2026, 0, 1, 0, 0, 0)

export class WorldometersScraper {
  private readonly sourceUrl: string
  private readonly htmlClient: PoliteHtmlClient
  private readonly maxPopulateAttempts: number
  private readonly populateWaitMs: number
  private fallbackValuesByRel = new Map<string, number>()
  private fallbackLastSampledAt: number | null = null

  public constructor(options: WorldometersScraperOptions) {
    this.sourceUrl = options.sourceUrl
    this.htmlClient = options.htmlClient
    this.maxPopulateAttempts = Math.max(1, Math.floor(options.maxPopulateAttempts))
    this.populateWaitMs = Math.max(0, Math.floor(options.populateWaitMs))
  }

  public async scrape(): Promise<Map<string, ScrapeReading>> {
    let bestReadings = new Map<string, ScrapeReading>()
    let lastSampledAt = Date.now()

    for (let attempt = 1; attempt <= this.maxPopulateAttempts; attempt += 1) {
      const html = await this.htmlClient.fetchHtml(this.sourceUrl)
      lastSampledAt = Date.now()
      const readings = this.extractReadings(html, lastSampledAt)

      if (readings.size > bestReadings.size) {
        bestReadings = readings
      }

      if (readings.size >= WORLDMETERS_METRICS.length) {
        bestReadings = readings
        break
      }

      if (attempt < this.maxPopulateAttempts && this.populateWaitMs > 0) {
        await this.wait(this.populateWaitMs)
      }
    }

    return this.fillMissingWithFallback(
      bestReadings,
      lastSampledAt,
      WORLDMETERS_METRICS,
    )
  }

  public async close(): Promise<void> {
    return Promise.resolve()
  }

  private extractReadings(
    html: string,
    sampledAt: number,
  ): Map<string, ScrapeReading> {
    const $ = load(html)
    const readings = new Map<string, ScrapeReading>()

    $('.rts-counter[rel]').each((_index, element) => {
      const sourceRel = $(element).attr('rel')
      if (!sourceRel) {
        return
      }

      const metric = METRIC_REGISTRY_BY_SOURCE_REL.get(
        metricSourceRelKey('worldometers', sourceRel),
      )
      if (!metric) {
        return
      }

      const rawText = sanitizeCounterText($(element).text())
      const value = parseCounterValue(rawText)
      if (value === null) {
        return
      }

      readings.set(metric.rel, {
        rel: metric.rel,
        rawText,
        value,
        sampledAt,
      })
    })

    return readings
  }

  private fillMissingWithFallback(
    realReadings: Map<string, ScrapeReading>,
    sampledAt: number,
    sourceMetrics: MetricDefinition[],
  ): Map<string, ScrapeReading> {
    for (const reading of realReadings.values()) {
      this.fallbackValuesByRel.set(reading.rel, reading.value)
    }

    const seededReadings = new Map(realReadings)

    const startOfDay = new Date(sampledAt)
    startOfDay.setHours(0, 0, 0, 0)
    const secondsSinceDayStart = Math.max(0, (sampledAt - startOfDay.getTime()) / 1000)

    const startOfYear = new Date(sampledAt)
    startOfYear.setMonth(0, 1)
    startOfYear.setHours(0, 0, 0, 0)
    const secondsSinceYearStart = Math.max(
      0,
      (sampledAt - startOfYear.getTime()) / 1000,
    )

    for (const metric of sourceMetrics) {
      if (seededReadings.has(metric.rel)) {
        continue
      }

      if (
        typeof metric.fallbackRatePerSecond !== 'number' ||
        typeof metric.fallbackBaseValue !== 'number'
      ) {
        continue
      }

      const previousValue = this.fallbackValuesByRel.get(metric.rel)
      let nextValue: number

      if (typeof previousValue === 'number' && this.fallbackLastSampledAt !== null) {
        nextValue = previousValue
      } else if (metric.fallbackMode === 'daily') {
        nextValue =
          metric.fallbackBaseValue + metric.fallbackRatePerSecond * secondsSinceDayStart
      } else if (metric.fallbackMode === 'yearly') {
        nextValue =
          metric.fallbackBaseValue + metric.fallbackRatePerSecond * secondsSinceYearStart
      } else {
        const elapsedSecondsSinceBase = Math.max(
          0,
          (sampledAt - FALLBACK_ABSOLUTE_BASE_TIMESTAMP_MS) / 1000,
        )
        nextValue =
          metric.fallbackBaseValue +
          metric.fallbackRatePerSecond * elapsedSecondsSinceBase
      }

      this.fallbackValuesByRel.set(metric.rel, nextValue)
      seededReadings.set(metric.rel, {
        rel: metric.rel,
        value: nextValue,
        sampledAt,
        rawText: Math.round(nextValue).toLocaleString('en-US'),
      })
    }

    this.fallbackLastSampledAt = sampledAt
    return seededReadings
  }

  private async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }
}
