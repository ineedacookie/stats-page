import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

import type { CamSelection } from '../types/cams'

interface YouTubePlayer {
  mute: () => void
  playVideo: () => void
  destroy: () => void
  getIframe: () => HTMLIFrameElement
}

interface YouTubeStateEvent {
  data: number
  target: YouTubePlayer
}

interface YouTubePlayerOptions {
  videoId: string
  host?: string
  width?: string
  height?: string
  playerVars?: Record<string, number | string>
  events?: {
    onReady?: (event: { target: YouTubePlayer }) => void
    onError?: () => void
    onStateChange?: (event: YouTubeStateEvent) => void
  }
}

interface YouTubeNamespace {
  Player: new (el: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer
  PlayerState: { ENDED: number }
}

declare global {
  interface Window {
    YT?: YouTubeNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<void> | null = null

const loadYouTubeApi = (): Promise<void> => {
  if (apiPromise) {
    return apiPromise
  }
  apiPromise = new Promise<void>((resolve) => {
    if (window.YT?.Player) {
      resolve()
      return
    }
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return apiPromise
}

interface LiveCamStageProps {
  cam: CamSelection | null
  isLoading: boolean
  onError: () => void
}

// Renders the current cam full-screen. YouTube cams (explore.org / USFWS) play
// through YouTube's ad-free IFrame player; direct-HLS cams (San Diego Zoo) play
// through hls.js. The player is built imperatively inside a stable container so
// React never manages the player DOM, and everything is torn down on cam change
// or unmount (the cam stage unmounts entirely during the stats scene), so no
// player instances accumulate over long runs.
export const LiveCamStage = ({ cam, isLoading, onError }: LiveCamStageProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    const container = containerRef.current
    if (!cam || !container) {
      return
    }

    let cancelled = false
    let ytPlayer: YouTubePlayer | null = null
    let hls: Hls | null = null
    let video: HTMLVideoElement | null = null

    const notifyFatal = (): void => {
      onErrorRef.current()
    }

    switch (cam.kind) {
      case 'youtube': {
        const youtubeId = cam.youtubeId
        void loadYouTubeApi().then(() => {
          if (cancelled || !window.YT) {
            return
          }
          const mount = document.createElement('div')
          mount.style.width = '100%'
          mount.style.height = '100%'
          container.appendChild(mount)
          ytPlayer = new window.YT.Player(mount, {
            videoId: youtubeId,
            host: 'https://www.youtube-nocookie.com',
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
            },
            events: {
              onReady: (event) => {
                const iframe = event.target.getIframe()
                iframe.style.width = '100%'
                iframe.style.height = '100%'
                event.target.mute()
                event.target.playVideo()
              },
              onError: notifyFatal,
              onStateChange: (event) => {
                if (event.data === window.YT?.PlayerState.ENDED) {
                  notifyFatal()
                }
              },
            },
          })
        })
        break
      }
      case 'hls': {
        video = document.createElement('video')
        video.muted = true
        video.autoplay = true
        video.playsInline = true
        video.className = 'h-full w-full object-cover'
        container.appendChild(video)

        const source = cam.hlsUrl
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = source
          video.addEventListener('error', notifyFatal)
          void video.play().catch(() => {})
        } else if (Hls.isSupported()) {
          hls = new Hls({ liveDurationInfinity: true, maxBufferLength: 30 })
          let recoveries = 0
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (!data.fatal) {
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
      if (ytPlayer) {
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
        video.removeEventListener('error', notifyFatal)
        video.removeAttribute('src')
        try {
          video.load()
        } catch {
          /* ignore */
        }
      }
      container.innerHTML = ''
    }
  }, [cam])

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div ref={containerRef} className="pointer-events-none absolute inset-0" />

      {!cam || isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-lg text-slate-300">
          Finding a live animal cam...
        </div>
      ) : null}

      {cam ? (
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
