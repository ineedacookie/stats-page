import { Router } from 'express'

import { HistoryStore } from '../services/historyStore.js'
import { SpuriousCorrelationService } from '../services/spuriousCorrelationService.js'

const parseHistoryMinutes = (value: unknown): number | null => {
  if (typeof value === 'undefined') {
    return null
  }

  if (Array.isArray(value)) {
    return parseHistoryMinutes(value[0])
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed
}

const parsePositiveInt = (
  value: unknown,
  fallback: number,
  maxValue: number,
): number => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.min(parsed, maxValue)
}

export const createStatsRouter = (
  historyStore: HistoryStore,
  spuriousCorrelationService: SpuriousCorrelationService,
): Router => {
  const router = Router()

  router.get('/stats', (request, response) => {
    const historyMinutes = parseHistoryMinutes(request.query.historyMinutes)
    const spuriousLimit = parsePositiveInt(request.query.spuriousLimit, 120, 500)
    const basePayload = historyStore.buildPayload(historyMinutes)
    const payload = {
      ...basePayload,
      sources: [
        ...basePayload.sources,
        spuriousCorrelationService.getSourceHealth(),
      ],
      spurious: spuriousCorrelationService.getWidgetPayload(spuriousLimit),
    }
    response.json(payload)
  })

  router.get('/health', (_request, response) => {
    const basePayload = historyStore.buildPayload(10)
    const spuriousPayload = spuriousCorrelationService.getWidgetPayload(10)
    const sources = [
      ...basePayload.sources,
      spuriousCorrelationService.getSourceHealth(),
    ]
    const expectedMetricCount = sources.reduce(
      (count, source) => count + source.expectedMetricCount,
      0,
    )
    const resolvedMetricCount = sources.reduce(
      (count, source) => count + source.resolvedMetricCount,
      0,
    )
    const unresolvedMetricCount = sources.reduce(
      (count, source) => count + source.unresolvedMetricCount,
      0,
    )

    response.json({
      generatedAt: basePayload.generatedAt,
      sources,
      connectedSourceCount: sources.filter((source) => source.connected).length,
      staleSourceCount: sources.filter((source) => source.stale).length,
      partialSourceCount: sources.filter((source) => source.partial).length,
      sectionCount: basePayload.sections.length,
      metricCount: basePayload.sections.reduce(
        (count, section) => count + section.metrics.length,
        0,
      ),
      expectedMetricCount,
      resolvedMetricCount,
      unresolvedMetricCount,
      spuriousCount: spuriousPayload.total,
      spuriousNextPage: spuriousPayload.nextPage,
    })
  })

  return router
}
