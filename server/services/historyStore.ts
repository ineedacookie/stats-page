import { METRIC_REGISTRY, SECTION_DEFINITIONS } from '../metrics/registry.js'
import type {
  DashboardMetric,
  DashboardPayload,
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
    return null
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
      this.sourceHealthById.set(source.sourceId, {
        sourceId: source.sourceId,
        label: source.label,
        sourceUrl: source.sourceUrl,
        intervalMs: source.intervalMs,
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
    sourceHealth.lastError =
      error instanceof Error ? error.message : 'Unknown polling failure'
    this.refreshSourceStaleness()
  }

  public buildPayload(historyMinutesRaw: number | null): BaseDashboardPayload {
    const now = Date.now()
    const historyMinutes = clampHistoryMinutes(historyMinutesRaw)
    const historyCutoff =
      historyMinutes === null ? null : now - historyMinutes * 60 * 1000

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

    const latest = this.latestReadingsByMetricId.get(metricId) ?? null
    const history =
      this.metricHistory.get(metricId)?.filter((point) =>
        historyCutoff === null ? true : point.timestamp >= historyCutoff,
      ) ?? []

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
      status: this.resolveMetricStatus(latest, now),
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
    now: number,
  ): MetricStatus {
    if (!latest) {
      return 'error'
    }

    const age = now - latest.sampledAt
    if (age > this.staleAfterMs) {
      return 'stale'
    }

    return 'ok'
  }

  private refreshSourceStaleness(): void {
    const now = Date.now()
    for (const sourceHealth of this.sourceHealthById.values()) {
      const lastSuccessfulScrapeAt = sourceHealth.lastSuccessfulScrapeAt
      sourceHealth.stale =
        lastSuccessfulScrapeAt === null ||
        now - lastSuccessfulScrapeAt > this.staleAfterMs
    }
  }
}
