import { useCallback, useEffect, useRef, useState } from 'react'

import {
  DEFAULT_HISTORY_MINUTES,
  DEFAULT_SPURIOUS_LIMIT,
  METRIC_POLL_INTERVAL_MS,
} from '../config/sections'
import type { DashboardPayload } from '../types/stats'

interface UseLiveStatsOptions {
  enabled?: boolean
  historyMinutes?: number
  pollIntervalMs?: number
  spuriousLimit?: number
}

interface UseLiveStatsResult {
  data: DashboardPayload | null
  isLoading: boolean
  error: string | null
  lastFetchAt: number | null
  refetch: () => Promise<void>
}

const createStatsUrl = (
  historyMinutes: number,
  spuriousLimit: number,
): string => {
  const params = new URLSearchParams({
    historyMinutes: String(historyMinutes),
    spuriousLimit: String(spuriousLimit),
  })

  return `/api/stats?${params.toString()}`
}

export const useLiveStats = (
  options: UseLiveStatsOptions = {},
): UseLiveStatsResult => {
  const enabled = options.enabled ?? true
  const historyMinutes = options.historyMinutes ?? DEFAULT_HISTORY_MINUTES
  const pollIntervalMs = options.pollIntervalMs ?? METRIC_POLL_INTERVAL_MS
  const spuriousLimit = options.spuriousLimit ?? DEFAULT_SPURIOUS_LIMIT

  const [data, setData] = useState<DashboardPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const hasCompletedInitialFetchRef = useRef(false)

  const fetchData = useCallback(async () => {
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    if (!hasCompletedInitialFetchRef.current) {
      setIsLoading(true)
    }

    try {
      const response = await fetch(
        createStatsUrl(historyMinutes, spuriousLimit),
        {
          signal: abortController.signal,
        },
      )

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
        hasCompletedInitialFetchRef.current = true
        setIsLoading(false)
      }
    }
  }, [historyMinutes, spuriousLimit])

  useEffect(() => {
    if (!enabled) {
      abortControllerRef.current?.abort()
      return
    }

    void fetchData()

    const timer = setInterval(() => {
      void fetchData()
    }, pollIntervalMs)

    return () => {
      clearInterval(timer)
      abortControllerRef.current?.abort()
    }
  }, [enabled, fetchData, pollIntervalMs])

  return {
    data,
    isLoading,
    error,
    lastFetchAt,
    refetch: fetchData,
  }
}
