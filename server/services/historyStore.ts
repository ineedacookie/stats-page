import { METRIC_REGISTRY, SECTION_DEFINITIONS } from '../metrics/registry.js'
import type {
  DashboardMetric,
  DashboardPayload,
  MetricProvenance,
  MetricPoint,
  MetricStatus,
  ScrapeReading,
  SourceHealth,
  SourceId,
  StatsSourceDefinition,
} from '../types.js'

interface HistoryStoreOptions {
  pollIntervalMs: number
  maxHistoryPoints: number
  staleAfterMs: number
  sources: StatsSourceDefinition[]
}

type BaseDashboardPayload = Omit<DashboardPayload, 'spurious'>

const clampHistoryMinutes = (value: number | null): number | null => {
  if (value === null || !Number.isFinite(value)) {
    return null
  }

  if (value <= 0) {
    return 0
  }

  return Math.min(Math.floor(value), 180)
}

export class HistoryStore {
  private readonly pollIntervalMs: number
  private readonly maxHistoryPoints: number
  private readonly staleAfterMs: number
  private readonly metricHistory = new Map<string, MetricPoint[]>()
  private readonly latestReadingsByMetricId = new Map<string, ScrapeReading>()
  private readonly sourceHealthById = new Map<SourceId, SourceHealth>()

  public constructor(options: HistoryStoreOptions) {
    this.pollIntervalMs = options.pollIntervalMs
    this.maxHistoryPoints = options.maxHistoryPoints
    this.staleAfterMs = options.staleAfterMs
    for (const source of options.sources) {
      const expectedMetricCount = METRIC_REGISTRY.filter(
        (metric) => metric.sourceId === source.sourceId,
      ).length

      this.sourceHealthById.set(source.sourceId, {
        sourceId: source.sourceId,
        label: source.label,
        sourceUrl: source.sourceUrl,
        intervalMs: source.intervalMs,
        expectedMetricCount,
        resolvedMetricCount: 0,
        unresolvedMetricCount: expectedMetricCount,
        partial: false,
        freshnessMs: null,
        connected: false,
        stale: true,
        lastAttemptAt: null,
        lastSuccessfulScrapeAt: null,
        lastError: null,
      })
    }
  }

  public getSourceHealths(): SourceHealth[] {
    this.refreshSourceStaleness()
    return Array.from(this.sourceHealthById.values()).map((health) => ({ ...health }))
  }

  public recordAttempt(sourceId: SourceId, attemptedAt: number): void {
    const sourceHealth = this.sourceHealthById.get(sourceId)
    if (!sourceHealth) {
      return
    }
    sourceHealth.lastAttemptAt = attemptedAt
  }

  public recordSuccess(
    sourceId: SourceId,
    readingsByRel: Map<string, ScrapeReading>,
  ): void {
    const sourceHealth = this.sourceHealthById.get(sourceId)
    if (!sourceHealth) {
      return
    }

    const resolvedMetricCount = this.countResolvedMetrics(sourceId, readingsByRel)
    sourceHealth.resolvedMetricCount = resolvedMetricCount
    sourceHealth.unresolvedMetricCount = Math.max(
      0,
      sourceHealth.expectedMetricCount - resolvedMetricCount,
    )
    sourceHealth.partial =
      resolvedMetricCount > 0 && sourceHealth.unresolvedMetricCount > 0

    if (resolvedMetricCount <= 0) {
      sourceHealth.connected = false
      sourceHealth.lastError = 'No expected counters resolved'
      this.refreshSourceStaleness()
      return
    }

    sourceHealth.connected = true
    sourceHealth.lastError = null
    sourceHealth.lastSuccessfulScrapeAt = Date.now()

    for (const metric of METRIC_REGISTRY) {
      if (metric.sourceId !== sourceId) {
        continue
      }

      const reading = readingsByRel.get(metric.rel)
      if (!reading) {
        continue
      }

      this.latestReadingsByMetricId.set(metric.id, reading)
      const history = this.metricHistory.get(metric.id) ?? []
      history.push({ timestamp: reading.sampledAt, value: reading.value })
      while (history.length > this.maxHistoryPoints) {
        history.shift()
      }

      this.metricHistory.set(metric.id, history)
    }

    this.refreshSourceStaleness()
  }

  public recordFailure(sourceId: SourceId, error: unknown): void {
    const sourceHealth = this.sourceHealthById.get(sourceId)
    if (!sourceHealth) {
      return
    }

    sourceHealth.connected = false
    sourceHealth.resolvedMetricCount = 0
    sourceHealth.unresolvedMetricCount = sourceHealth.expectedMetricCount
    sourceHealth.partial = false
    sourceHealth.lastError =
      error instanceof Error ? error.message : 'Unknown polling failure'
    this.refreshSourceStaleness()
  }

  public buildPayload(historyMinutesRaw: number | null): BaseDashboardPayload {
    const now = Date.now()
    const historyMinutes = clampHistoryMinutes(historyMinutesRaw)
    const historyCutoff =
      historyMinutes === null
        ? null
        : historyMinutes === 0
          ? Number.POSITIVE_INFINITY
          : now - historyMinutes * 60 * 1000

    this.refreshSourceStaleness()

    const sections = SECTION_DEFINITIONS.map((section) => {
      const metrics = METRIC_REGISTRY.filter(
        (metric) => metric.category === section.id,
      ).map((metric) => this.buildMetricView(metric.id, historyCutoff, now))

      return {
        ...section,
        metrics,
      }
    })

    return {
      generatedAt: now,
      pollingIntervalMs: this.pollIntervalMs,
      sources: this.getSourceHealths(),
      sections,
    }
  }

  private buildMetricView(
    metricId: string,
    historyCutoff: number | null,
    now: number,
  ): DashboardMetric {
    const metricDefinition = METRIC_REGISTRY.find((metric) => metric.id === metricId)
    if (!metricDefinition) {
      throw new Error(`Unknown metric id: ${metricId}`)
    }
    const sourceHealth = this.sourceHealthById.get(metricDefinition.sourceId)
    if (!sourceHealth) {
      throw new Error(`Unknown source id: ${metricDefinition.sourceId}`)
    }

    const latest = this.latestReadingsByMetricId.get(metricId) ?? null
    const history =
      this.metricHistory.get(metricId)?.filter((point) =>
        historyCutoff === null ? true : point.timestamp >= historyCutoff,
      ) ?? []
    const provenance = this.resolveMetricProvenance(latest, sourceHealth)

    let delta: number | null = null
    let changePercent: number | null = null
    if (history.length >= 2) {
      const first = history[0]
      const last = history[history.length - 1]
      delta = last.value - first.value
      if (first.value !== 0) {
        changePercent = (delta / first.value) * 100
      }
    }

    return {
      ...metricDefinition,
      status: this.resolveMetricStatus(latest, provenance, now),
      provenance,
      freshnessMs: latest ? Math.max(0, now - latest.sampledAt) : null,
      latestValue: latest?.value ?? null,
      lastUpdated: latest?.sampledAt ?? null,
      rawText: latest?.rawText ?? null,
      delta,
      changePercent,
      history,
    }
  }

  private resolveMetricStatus(
    latest: ScrapeReading | null,
    provenance: MetricProvenance,
    now: number,
  ): MetricStatus {
    if (!latest) {
      return 'error'
    }

    const age = now - latest.sampledAt
    if (age > this.staleAfterMs) {
      return 'stale'
    }

    if (provenance === 'last-known') {
      return 'partial'
    }

    return 'ok'
  }

  private resolveMetricProvenance(
    latest: ScrapeReading | null,
    sourceHealth: SourceHealth,
  ): MetricProvenance {
    if (!latest) {
      return 'unavailable'
    }

    if (sourceHealth.lastSuccessfulScrapeAt === null) {
      return 'last-known'
    }

    // Keep a small threshold to account for scrape-time millisecond drift.
    const isFromCurrentScrape =
      latest.sampledAt >= sourceHealth.lastSuccessfulScrapeAt - 1_000

    return isFromCurrentScrape ? 'current-scrape' : 'last-known'
  }

  private countResolvedMetrics(
    sourceId: SourceId,
    readingsByRel: Map<string, ScrapeReading>,
  ): number {
    let resolvedMetricCount = 0
    for (const metric of METRIC_REGISTRY) {
      if (metric.sourceId !== sourceId) {
        continue
      }

      if (readingsByRel.has(metric.rel)) {
        resolvedMetricCount += 1
      }
    }

    return resolvedMetricCount
  }

  private refreshSourceStaleness(): void {
    const now = Date.now()
    for (const sourceHealth of this.sourceHealthById.values()) {
      const lastSuccessfulScrapeAt = sourceHealth.lastSuccessfulScrapeAt
      sourceHealth.freshnessMs =
        lastSuccessfulScrapeAt === null
          ? null
          : Math.max(0, now - lastSuccessfulScrapeAt)
      sourceHealth.stale =
        sourceHealth.freshnessMs === null ||
        sourceHealth.freshnessMs > this.staleAfterMs
      sourceHealth.partial =
        sourceHealth.connected && sourceHealth.unresolvedMetricCount > 0
    }
  }
}
