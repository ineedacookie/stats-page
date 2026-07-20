import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

import type { CamSelection } from '../types/cams'

const HLS_START_TIMEOUT_MS = 30_000
const PLAYBACK_WATCHDOG_INTERVAL_MS = 15_000
const MAX_STALLED_WATCHDOG_CHECKS = 3
const HLS_INITIAL_BANDWIDTH_ESTIMATE = 5_000_000

interface LiveCamStageProps {
  cam: CamSelection | null
  isLoading: boolean
  onError: () => void
  onNext: () => void
}

// YouTube uses a standard interactive iframe. Direct HLS streams retain
// startup/progress watchdogs and explicit teardown for long-running sessions.
export const LiveCamStage = ({
  cam,
  isLoading,
  onError,
  onNext,
}: LiveCamStageProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const onErrorRef = useRef(onError)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  onErrorRef.current = onError

  useEffect(() => {
    const container = containerRef.current
    setIsPlayerReady(false)
    if (!cam || !container) {
      return
    }

    container.replaceChildren()

    if (cam.kind === 'youtube') {
      const params = new URLSearchParams({
        autoplay: '1',
        mute: '1',
        controls: '1',
        playsinline: '1',
        rel: '0',
      })
      const iframe = document.createElement('iframe')
      iframe.src = `https://www.youtube.com/embed/${cam.youtubeId}?${params.toString()}`
      iframe.title = cam.title
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
      iframe.allowFullscreen = true
      iframe.loading = 'eager'
      iframe.referrerPolicy = 'strict-origin-when-cross-origin'
      iframe.className = 'h-full w-full border-0'
      container.appendChild(iframe)
      setIsPlayerReady(true)

      return () => {
        iframe.src = 'about:blank'
        container.replaceChildren()
      }
    }

    let cancelled = false
    let fatalNotified = false
    let hasStarted = false
    let stalledWatchdogChecks = 0
    let lastPlaybackTime = -1
    let hls: Hls | null = null
    const video = document.createElement('video')
    let playerStartTimer: number | null = null
    let playbackWatchdogTimer: number | null = null

    const clearRuntimeTimers = (): void => {
      if (playerStartTimer !== null) {
        window.clearTimeout(playerStartTimer)
        playerStartTimer = null
      }
      if (playbackWatchdogTimer !== null) {
        window.clearInterval(playbackWatchdogTimer)
        playbackWatchdogTimer = null
      }
    }

    const notifyFatal = (): void => {
      if (cancelled || fatalNotified) {
        return
      }
      fatalNotified = true
      clearRuntimeTimers()
      setIsPlayerReady(false)
      onErrorRef.current()
    }

    const markPlaying = (): void => {
      if (cancelled || fatalNotified) {
        return
      }
      hasStarted = true
      stalledWatchdogChecks = 0
      const currentTime = video.currentTime
      if (Number.isFinite(currentTime)) {
        lastPlaybackTime = currentTime
      }
      if (playerStartTimer !== null) {
        window.clearTimeout(playerStartTimer)
        playerStartTimer = null
      }
      setIsPlayerReady(true)
    }

    playerStartTimer = window.setTimeout(
      notifyFatal,
      HLS_START_TIMEOUT_MS,
    )
    playbackWatchdogTimer = window.setInterval(() => {
      if (
        cancelled ||
        fatalNotified ||
        !hasStarted ||
        document.hidden
      ) {
        return
      }

      const currentTime = video.currentTime
      if (!Number.isFinite(currentTime)) {
        stalledWatchdogChecks += 1
      } else if (
        lastPlaybackTime < 0 ||
        currentTime > lastPlaybackTime + 0.25 ||
        currentTime < lastPlaybackTime - 1
      ) {
        lastPlaybackTime = currentTime
        stalledWatchdogChecks = 0
      } else {
        stalledWatchdogChecks += 1
      }

      if (stalledWatchdogChecks >= MAX_STALLED_WATCHDOG_CHECKS) {
        notifyFatal()
      }
    }, PLAYBACK_WATCHDOG_INTERVAL_MS)

    video.muted = true
    video.autoplay = true
    video.playsInline = true
    video.disablePictureInPicture = true
    video.className = 'h-full w-full object-cover'
    video.addEventListener('playing', markPlaying)
    video.addEventListener('error', notifyFatal)
    container.appendChild(video)

    const source = cam.hlsUrl
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source
      void video.play().catch(() => {})
    } else if (Hls.isSupported()) {
      hls = new Hls({
        liveDurationInfinity: true,
        maxBufferLength: 20,
        maxMaxBufferLength: 60,
        backBufferLength: 30,
        abrEwmaDefaultEstimate: HLS_INITIAL_BANDWIDTH_ESTIMATE,
      })
      let recoveries = 0
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || cancelled || fatalNotified) {
          return
        }
        if (recoveries < 3) {
          recoveries += 1
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls?.startLoad()
            return
          }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls?.recoverMediaError()
            return
          }
        }
        notifyFatal()
      })
      hls.loadSource(source)
      hls.attachMedia(video)
      void video.play().catch(() => {})
    } else {
      notifyFatal()
    }

    return () => {
      cancelled = true
      clearRuntimeTimers()
      if (hls) {
        hls.destroy()
      }
      video.removeEventListener('playing', markPlaying)
      video.removeEventListener('error', notifyFatal)
      video.pause()
      video.removeAttribute('src')
      try {
        video.load()
      } catch {
        /* ignore */
      }
      container.replaceChildren()
    }
  }, [cam])

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div
        ref={containerRef}
        className={`pointer-events-auto absolute inset-0 transition-opacity duration-500 ${
          isPlayerReady ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {!cam || isLoading || !isPlayerReady ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-lg text-slate-300">
          {!cam || isLoading
            ? 'Finding a live animal cam...'
            : `Starting ${cam.title}...`}
        </div>
      ) : null}

      {cam && isPlayerReady ? (
        <div className="group absolute bottom-0 right-0 z-10 flex h-32 w-44 items-end justify-end p-5">
          <button
            type="button"
            aria-label="Play next video"
            onClick={onNext}
            className="pointer-events-auto flex translate-y-2 items-center gap-2 whitespace-nowrap rounded-full border border-white/20 bg-black/70 px-4 py-2.5 text-base font-semibold text-white opacity-0 shadow-lg backdrop-blur transition duration-200 hover:bg-black/85 focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
          >
            Next video <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}

      {cam && isPlayerReady ? (
        <div className="pointer-events-none absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-base text-slate-100 backdrop-blur">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
          <span className="font-semibold">{cam.title}</span>
          {cam.location ? (
            <span className="text-slate-300">· {cam.location}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
