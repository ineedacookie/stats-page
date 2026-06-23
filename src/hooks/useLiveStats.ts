import { useCallback, useEffect, useRef, useState } from 'react'

import {
  DEFAULT_HISTORY_MINUTES,
  METRIC_POLL_INTERVAL_MS,
} from '../config/sections'
import type { DashboardPayload } from '../types/stats'

interface UseLiveStatsOptions {
  historyMinutes?: number
  pollIntervalMs?: number
}

interface UseLiveStatsResult {
  data: DashboardPayload | null
  isLoading: boolean
  error: string | null
  lastFetchAt: number | null
  refetch: () => Promise<void>
}

const createStatsUrl = (historyMinutes: number): string => {
  const params = new URLSearchParams({
    historyMinutes: String(historyMinutes),
  })

  return `/api/stats?${params.toString()}`
}

export const useLiveStats = (
  options: UseLiveStatsOptions = {},
): UseLiveStatsResult => {
  const historyMinutes = options.historyMinutes ?? DEFAULT_HISTORY_MINUTES
  const pollIntervalMs = options.pollIntervalMs ?? METRIC_POLL_INTERVAL_MS

  const [data, setData] = useState<DashboardPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    if (data === null) {
      setIsLoading(true)
    }

    try {
      const response = await fetch(createStatsUrl(historyMinutes), {
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`Stats request failed (${response.status})`)
      }

      const payload = (await response.json()) as DashboardPayload
      setData(payload)
      setError(null)
      setLastFetchAt(Date.now())
    } catch (requestError) {
      if (abortController.signal.aborted) {
        return
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unknown stats request error',
      )
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [data, historyMinutes])

  useEffect(() => {
    void fetchData()

    const timer = setInterval(() => {
      void fetchData()
    }, pollIntervalMs)

    return () => {
      clearInterval(timer)
      abortControllerRef.current?.abort()
    }
  }, [fetchData, pollIntervalMs])

  return {
    data,
    isLoading,
    error,
    lastFetchAt,
    refetch: fetchData,
  }
}
