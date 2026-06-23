export type MetricCategoryId =
  | 'internet-scale'
  | 'activity'
  | 'social'
  | 'infrastructure'
  | 'worldometers'

export type SourceId =
  | 'internetlivestats'
  | 'worldometers'
  | 'spurious-correlations'

export type MetricStatus = 'ok' | 'stale' | 'error'

export interface MetricDefinition {
  id: string
  rel: string
  sourceRel?: string
  label: string
  description: string
  category: MetricCategoryId
  sourceId: SourceId
  unit?: string
  accent: string
  fallbackMode?: 'daily' | 'yearly' | 'absolute'
  fallbackBaseValue?: number
  fallbackRatePerSecond?: number
}

export interface SectionDefinition {
  id: MetricCategoryId
  title: string
  description: string
}

export interface MetricPoint {
  timestamp: number
  value: number
}

export interface ScrapeReading {
  rel: string
  value: number
  rawText: string
  sampledAt: number
}

export interface SourceHealth {
  sourceId: SourceId
  label: string
  sourceUrl: string
  intervalMs: number
  connected: boolean
  stale: boolean
  lastSuccessfulScrapeAt: number | null
  lastAttemptAt: number | null
  lastError: string | null
}

export interface DashboardMetric extends MetricDefinition {
  status: MetricStatus
  latestValue: number | null
  lastUpdated: number | null
  rawText: string | null
  delta: number | null
  changePercent: number | null
  history: MetricPoint[]
}

export interface DashboardSection extends SectionDefinition {
  metrics: DashboardMetric[]
}

export interface DashboardPayload {
  generatedAt: number
  pollingIntervalMs: number
  sources: SourceHealth[]
  sections: DashboardSection[]
  spurious: SpuriousCorrelationWidgetPayload
}

export interface StatsSourceDefinition {
  sourceId: SourceId
  label: string
  sourceUrl: string
  intervalMs: number
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
