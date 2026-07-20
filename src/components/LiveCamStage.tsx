import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

import type { CamSelection } from '../types/cams'

interface YouTubePlayer {
  mute: () => void
  playVideo: () => void
  stopVideo: () => void
  destroy: () => void
  getIframe: () => HTMLIFrameElement
  getCurrentTime: () => number
  getPlayerState: () => number
}

interface YouTubeStateEvent {
  data: number
  target: YouTubePlayer
}

interface YouTubeErrorEvent {
  data: number
}

interface YouTubePlayerOptions {
  videoId: string
  width?: string
  height?: string
  playerVars?: Record<string, number | string>
  events?: {
    onReady?: (event: { target: YouTubePlayer }) => void
    onError?: (event: YouTubeErrorEvent) => void
    onStateChange?: (event: YouTubeStateEvent) => void
  }
}

interface YouTubeNamespace {
  Player: new (el: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer
  PlayerState: { ENDED: number; PLAYING: number }
}

declare global {
  interface Window {
    YT?: YouTubeNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

const YOUTUBE_API_URL = 'https://www.youtube.com/iframe_api'
const YOUTUBE_API_TIMEOUT_MS = 15_000
const PLAYER_START_TIMEOUT_MS = 30_000
const PLAYBACK_WATCHDOG_INTERVAL_MS = 15_000
const MAX_STALLED_WATCHDOG_CHECKS = 3
const HLS_INITIAL_BANDWIDTH_ESTIMATE = 5_000_000

let apiPromise: Promise<void> | null = null

const loadYouTubeApi = (): Promise<void> => {
  if (window.YT?.Player) {
    return Promise.resolve()
  }
  if (apiPromise) {
    return apiPromise
  }

  const pending = new Promise<void>((resolve, reject) => {
    let settled = false
    let tag = document.querySelector<HTMLScriptElement>(
      `script[src="${YOUTUBE_API_URL}"]`,
    )
    const previous = window.onYouTubeIframeAPIReady

    const restoreCallback = (): void => {
      if (window.onYouTubeIframeAPIReady === onReady) {
        window.onYouTubeIframeAPIReady = previous
      }
    }
    const succeed = (): void => {
      if (settled) {
        return
      }
      settled = true
      window.clearTimeout(timeout)
      restoreCallback()
      resolve()
    }
    const fail = (error: Error): void => {
      if (settled) {
        return
      }
      settled = true
      window.clearTimeout(timeout)
      restoreCallback()
      tag?.remove()
      reject(error)
    }
    const onReady = (): void => {
      previous?.()
      if (window.YT?.Player) {
        succeed()
      } else {
        fail(new Error('YouTube player API initialized without a Player'))
      }
    }

    const timeout = window.setTimeout(() => {
      fail(new Error('YouTube player API load timed out'))
    }, YOUTUBE_API_TIMEOUT_MS)

    window.onYouTubeIframeAPIReady = onReady
    if (!tag) {
      tag = document.createElement('script')
      tag.src = YOUTUBE_API_URL
      tag.addEventListener(
        'error',
        () => {
          fail(new Error('YouTube player API failed to load'))
        },
        { once: true },
      )
      document.head.appendChild(tag)
    }
  })

  apiPromise = pending.catch((error: unknown) => {
    apiPromise = null
    throw error
  })
  return apiPromise
}

interface LiveCamStageProps {
  cam: CamSelection | null
  isLoading: boolean
  onError: () => void
  onNext: () => void
}

// Renders one cam at a time inside an imperative container. Startup and
// progress watchdogs prevent a failed embed from leaving a black screen, while
// one-shot error handling prevents overlapping replacement requests.
export const LiveCamStage = ({
  cam,
  isLoading,
  onError,
  onNext,
}: LiveCamStageProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const onErrorRef = useRef(onError)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [playerNeedsAttention, setPlayerNeedsAttention] = useState(false)
  onErrorRef.current = onError

  useEffect(() => {
    const container = containerRef.current
    setIsPlayerReady(false)
    setPlayerNeedsAttention(false)
    if (!cam || !container) {
      return
    }

    container.replaceChildren()
    let cancelled = false
    let fatalNotified = false
    let hasStarted = false
    let stalledWatchdogChecks = 0
    let lastPlaybackTime = -1
    let ytPlayer: YouTubePlayer | null = null
    let hls: Hls | null = null
    let video: HTMLVideoElement | null = null
    let readPlaybackTime: (() => number) | null = null
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
      setPlayerNeedsAttention(false)
      onErrorRef.current()
    }

    const showInteractivePlayer = (): void => {
      if (cancelled || fatalNotified) {
        return
      }
      clearRuntimeTimers()
      setIsPlayerReady(true)
      setPlayerNeedsAttention(true)
    }

    const markPlaying = (): void => {
      if (cancelled || fatalNotified) {
        return
      }
      hasStarted = true
      stalledWatchdogChecks = 0
      const currentTime = readPlaybackTime?.()
      if (typeof currentTime === 'number' && Number.isFinite(currentTime)) {
        lastPlaybackTime = currentTime
      }
      if (playerStartTimer !== null) {
        window.clearTimeout(playerStartTimer)
        playerStartTimer = null
      }
      setPlayerNeedsAttention(false)
      setIsPlayerReady(true)
    }

    playerStartTimer = window.setTimeout(
      notifyFatal,
      PLAYER_START_TIMEOUT_MS,
    )
    playbackWatchdogTimer = window.setInterval(() => {
      if (
        cancelled ||
        fatalNotified ||
        !hasStarted ||
        document.hidden ||
        !readPlaybackTime
      ) {
        return
      }

      const currentTime = readPlaybackTime()
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

    switch (cam.kind) {
      case 'youtube': {
        const youtubeId = cam.youtubeId
        void loadYouTubeApi()
          .then(() => {
            if (cancelled || !window.YT) {
              return
            }
            const mount = document.createElement('div')
            mount.style.width = '100%'
            mount.style.height = '100%'
            container.appendChild(mount)
            ytPlayer = new window.YT.Player(mount, {
              videoId: youtubeId,
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: 1,
                mute: 1,
                controls: 0,
                playsinline: 1,
                rel: 0,
                modestbranding: 1,
                fs: 0,
                disablekb: 1,
                iv_load_policy: 3,
                origin: window.location.origin,
                widget_referrer: window.location.href,
              },
              events: {
                onReady: (event) => {
                  if (cancelled || fatalNotified) {
                    return
                  }
                  const iframe = event.target.getIframe()
                  iframe.style.width = '100%'
                  iframe.style.height = '100%'
                  iframe.referrerPolicy = 'strict-origin-when-cross-origin'
                  setIsPlayerReady(true)
                  event.target.mute()
                  event.target.playVideo()
                },
                onError: (event) => {
                  console.warn(`[cam] YouTube player error ${event.data}`)
                  if (
                    event.data === 101 ||
                    event.data === 150 ||
                    event.data === 153
                  ) {
                    showInteractivePlayer()
                    return
                  }
                  notifyFatal()
                },
                onStateChange: (event) => {
                  if (event.data === window.YT?.PlayerState.PLAYING) {
                    markPlaying()
                    return
                  }
                  if (event.data === window.YT?.PlayerState.ENDED) {
                    notifyFatal()
                  }
                },
              },
            })
            readPlaybackTime = () => ytPlayer?.getCurrentTime() ?? Number.NaN
          })
          .catch(() => {
            notifyFatal()
          })
        break
      }
      case 'hls': {
        video = document.createElement('video')
        video.muted = true
        video.autoplay = true
        video.playsInline = true
        video.disablePictureInPicture = true
        video.className = 'h-full w-full object-cover'
        video.addEventListener('playing', markPlaying)
        video.addEventListener('error', notifyFatal)
        readPlaybackTime = () => video?.currentTime ?? Number.NaN
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
            // Start multi-rendition streams with an HD-capable estimate. ABR
            // still steps down automatically if the connection cannot sustain it.
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
        break
      }
      default: {
        const exhaustive: never = cam
        void exhaustive
      }
    }

    return () => {
      cancelled = true
      clearRuntimeTimers()
      if (ytPlayer) {
        try {
          ytPlayer.stopVideo()
        } catch {
          /* player may already be gone */
        }
        try {
          ytPlayer.destroy()
        } catch {
          /* player may already be gone */
        }
      }
      if (hls) {
        hls.destroy()
      }
      if (video) {
        video.removeEventListener('playing', markPlaying)
        video.removeEventListener('error', notifyFatal)
        video.pause()
        video.removeAttribute('src')
        try {
          video.load()
        } catch {
          /* ignore */
        }
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

      {playerNeedsAttention ? (
        <div className="pointer-events-none absolute left-1/2 top-5 z-20 -translate-x-1/2 rounded-full border border-amber-300/40 bg-black/80 px-5 py-2.5 text-center text-sm font-medium text-amber-100 backdrop-blur">
          YouTube needs verification in this browser. Use the sign-in prompt in
          the player, then reload this page.
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
