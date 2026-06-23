export type MetricStatus = 'ok' | 'stale' | 'partial' | 'error'
export type MetricProvenance = 'current-scrape' | 'last-known' | 'unavailable'

export interface MetricPoint {
  timestamp: number
  value: number
}

export interface DashboardMetric {
  id: string
  rel: string
  sourceId: string
  label: string
  description: string
  category: string
  unit?: string
  accent: string
  status: MetricStatus
  provenance: MetricProvenance
  freshnessMs: number | null
  latestValue: number | null
  lastUpdated: number | null
  rawText: string | null
  delta: number | null
  changePercent: number | null
  history: MetricPoint[]
}

export interface DashboardSection {
  id: string
  title: string
  description: string
  metrics: DashboardMetric[]
}

export interface SourceHealth {
  sourceId: string
  label: string
  sourceUrl: string
  intervalMs: number
  expectedMetricCount: number
  resolvedMetricCount: number
  unresolvedMetricCount: number
  partial: boolean
  freshnessMs: number | null
  connected: boolean
  stale: boolean
  lastSuccessfulScrapeAt: number | null
  lastAttemptAt: number | null
  lastError: string | null
}

export interface SpuriousCorrelationRecord {
  correlationNumber: number
  slug: string
  title: string
  variableA: string
  variableB: string
  detailUrl: string
  imageUrl: string
  sourcePage: number
  scrapedAt: number
}

export interface SpuriousCorrelationWidgetPayload {
  generatedAt: number
  cycleIntervalMs: number
  pagesPerRun: number
  total: number
  nextPage: number
  lastScrapedAt: number | null
  items: SpuriousCorrelationRecord[]
}

export interface DashboardPayload {
  generatedAt: number
  pollingIntervalMs: number
  sources: SourceHealth[]
  sections: DashboardSection[]
  spurious: SpuriousCorrelationWidgetPayload
}
