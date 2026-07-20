import { useCallback, useEffect, useRef, useState } from 'react'

import {
  CAM_PREFETCH_LEAD_MS,
  CAM_REQUEST_TIMEOUT_MS,
  CAM_SCENE_MS,
  KIOSK_SESSION_RENEWAL_MS,
  STATS_SCENE_MS,
} from '../config/scenes'
import type { CamSelection } from '../types/cams'

export type Scene = 'cam' | 'stats'

interface SceneDirectorResult {
  scene: Scene
  cam: CamSelection | null
  isCamLoading: boolean
  requestNextCam: () => void
}

const fetchNextCam = async (
  excludeId: string | null,
  forceId: string | null,
  signal: AbortSignal,
): Promise<CamSelection | null> => {
  const params = new URLSearchParams()
  if (excludeId) {
    params.set('exclude', excludeId)
  }
  if (forceId) {
    params.set('force', forceId)
  }
  const query = params.toString()

  const response = await fetch(
    `/api/cams/next${query ? `?${query}` : ''}`,
    { signal },
  )
  if (!response.ok) {
    return null
  }

  return (await response.json()) as CamSelection
}

// Drives the top-level scene rotation: a live animal cam runs for CAM_SCENE_MS,
// then the stats + correlation scene takes over for STATS_SCENE_MS, then a fresh
// random cam is requested and the loop repeats.
export const useSceneDirector = (): SceneDirectorResult => {
  const [scene, setScene] = useState<Scene>('cam')
  const [cam, setCam] = useState<CamSelection | null>(null)
  const [isCamLoading, setIsCamLoading] = useState(true)
  const [camRequestId, setCamRequestId] = useState(0)
  const [forcedCamId] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }
    const value = new URLSearchParams(window.location.search).get('cam')
    return value && value.length > 0 ? value : null
  })
  const lastCamIdRef = useRef<string | null>(null)
  const camRef = useRef<CamSelection | null>(null)
  const isCamLoadingRef = useRef(isCamLoading)
  const sessionStartedAtRef = useRef(Date.now())
  camRef.current = cam
  isCamLoadingRef.current = isCamLoading

  const requestNextCam = useCallback(() => {
    setCamRequestId((value) => value + 1)
  }, [])

  // Fetch a cam on mount and whenever a new cam is requested (each cam scene
  // entry, or a fatal player error). If nothing resolves, jump to the stats
  // scene early and try again on the next cycle.
  useEffect(() => {
    const abortController = new AbortController()
    const requestTimeout = window.setTimeout(() => {
      abortController.abort()
    }, CAM_REQUEST_TIMEOUT_MS)
    let cancelled = false

    setCam(null)
    isCamLoadingRef.current = true
    setIsCamLoading(true)

    void (async () => {
      const selection = await fetchNextCam(
        lastCamIdRef.current,
        forcedCamId,
        abortController.signal,
      ).catch(() => null)
      window.clearTimeout(requestTimeout)

      if (cancelled) {
        return
      }

      isCamLoadingRef.current = false
      if (selection) {
        lastCamIdRef.current = selection.id
        setCam(selection)
        setIsCamLoading(false)
      } else {
        setIsCamLoading(false)
        setScene('stats')
      }
    })()

    return () => {
      cancelled = true
      window.clearTimeout(requestTimeout)
      abortController.abort()
    }
  }, [camRequestId, forcedCamId])

  // Cam scene duration: starts counting once a cam is actually on screen.
  useEffect(() => {
    if (scene !== 'cam' || !cam) {
      return
    }

    const timer = window.setTimeout(() => {
      // Clear the outgoing cam before the stats scene. This prevents the old
      // player from being remounted for one render when stats hands off.
      setCam(null)
      setScene('stats')
    }, CAM_SCENE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [scene, cam])

  // Resolve the next cam near the end of the stats scene. The selection is
  // ready for an atomic handoff, but short-lived HLS URLs are still fresh.
  useEffect(() => {
    if (scene !== 'stats') {
      return
    }

    const prefetchDelayMs = Math.max(
      0,
      STATS_SCENE_MS - CAM_PREFETCH_LEAD_MS,
    )
    const prefetchTimer = window.setTimeout(() => {
      requestNextCam()
    }, prefetchDelayMs)

    const sceneTimer = window.setTimeout(() => {
      if (
        Date.now() - sessionStartedAtRef.current >=
        KIOSK_SESSION_RENEWAL_MS
      ) {
        window.location.reload()
        return
      }

      setScene('cam')
      if (!camRef.current && !isCamLoadingRef.current) {
        requestNextCam()
      }
    }, STATS_SCENE_MS)

    return () => {
      window.clearTimeout(prefetchTimer)
      window.clearTimeout(sceneTimer)
    }
  }, [requestNextCam, scene])

  return { scene, cam, isCamLoading, requestNextCam }
}
