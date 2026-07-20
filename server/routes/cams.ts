import { Readable } from 'node:stream'

import {
  Router,
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from 'express'

import { LiveCamService } from '../services/liveCamService.js'

const HLS_CONTENT_TYPE = 'application/vnd.apple.mpegurl'
const ALLOWED_PROXY_HOSTS = ['vstream.command.verkada.com']
const PLAYLIST_FETCH_TIMEOUT_MS = 15_000
const SEGMENT_FETCH_TIMEOUT_MS = 30_000

const readQueryString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null

const isAllowedUpstream = (rawUrl: string): boolean => {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return false
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return false
  }

  return ALLOWED_PROXY_HOSTS.some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
  )
}

const toMediaProxyPath = (absoluteUrl: string): string =>
  `/api/cams/proxy/media.m3u8?src=${encodeURIComponent(absoluteUrl)}`

const toSegmentProxyPath = (absoluteUrl: string): string =>
  `/api/cams/proxy/segment?src=${encodeURIComponent(absoluteUrl)}`

interface AbortScope {
  signal: AbortSignal
  cleanup: () => void
}

const createAbortScope = (
  request: ExpressRequest,
  response: ExpressResponse,
  timeoutMs: number,
): AbortScope => {
  const controller = new AbortController()
  const abort = (): void => {
    controller.abort()
  }
  const timeout = setTimeout(abort, timeoutMs)
  timeout.unref()
  request.once('aborted', abort)
  response.once('close', abort)

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout)
      request.off('aborted', abort)
      response.off('close', abort)
    },
  }
}

// Rewrite every URL in an HLS playlist so it is fetched back through this API.
// Needed for sources that do not allow cross-origin browser playback.
const rewritePlaylist = (playlist: string, baseUrl: string): string => {
  const isMaster = playlist.includes('#EXT-X-STREAM-INF')

  return playlist
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (trimmed.length === 0) {
        return line
      }

      if (trimmed.startsWith('#')) {
        const uriMatch = trimmed.match(/URI="([^"]+)"/)
        if (!uriMatch) {
          return line
        }
        const absolute = new URL(uriMatch[1], baseUrl).toString()
        const replacement = isMaster
          ? toMediaProxyPath(absolute)
          : toSegmentProxyPath(absolute)
        return trimmed.replace(uriMatch[0], `URI="${replacement}"`)
      }

      const absolute = new URL(trimmed, baseUrl).toString()
      return isMaster ? toMediaProxyPath(absolute) : toSegmentProxyPath(absolute)
    })
    .join('\n')
}

const fetchPlaylist = async (
  url: string,
  signal: AbortSignal,
): Promise<{ ok: boolean; body: string }> => {
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) {
      return { ok: false, body: '' }
    }
    return { ok: true, body: await response.text() }
  } catch {
    return { ok: false, body: '' }
  }
}

export const createCamsRouter = (camService: LiveCamService): Router => {
  const router = Router()

  // Returns a currently-live cam selection for the client to play.
  router.get('/cams/next', async (request, response) => {
    const excludeId = readQueryString(request.query.exclude)
    const forceId = readQueryString(request.query.force)

    const selection = forceId
      ? await camService.pickById(forceId)
      : await camService.pickNext({ excludeId })

    if (!selection) {
      response
        .status(503)
        .json({
          error: forceId
            ? `The requested cam "${forceId}" is not available.`
            : 'No live animal cams are available right now.',
        })
      return
    }

    response.json(selection)
  })

  router.get('/cams/proxy/master.m3u8', async (request, response) => {
    const src = readQueryString(request.query.src)
    if (!src || !isAllowedUpstream(src)) {
      response.status(400).json({ error: 'Invalid or disallowed source.' })
      return
    }

    const abortScope = createAbortScope(
      request,
      response,
      PLAYLIST_FETCH_TIMEOUT_MS,
    )
    const fetched = await fetchPlaylist(src, abortScope.signal)
    abortScope.cleanup()
    if (!fetched.ok) {
      response.status(502).json({ error: 'Failed to load cam manifest.' })
      return
    }

    response.setHeader('Cache-Control', 'no-store')
    response.type(HLS_CONTENT_TYPE).send(rewritePlaylist(fetched.body, src))
  })

  router.get('/cams/proxy/media.m3u8', async (request, response) => {
    const src = readQueryString(request.query.src)
    if (!src || !isAllowedUpstream(src)) {
      response.status(400).json({ error: 'Invalid or disallowed source.' })
      return
    }

    const abortScope = createAbortScope(
      request,
      response,
      PLAYLIST_FETCH_TIMEOUT_MS,
    )
    const fetched = await fetchPlaylist(src, abortScope.signal)
    abortScope.cleanup()
    if (!fetched.ok) {
      response.status(502).json({ error: 'Failed to load media playlist.' })
      return
    }

    response.setHeader('Cache-Control', 'no-store')
    response.type(HLS_CONTENT_TYPE).send(rewritePlaylist(fetched.body, src))
  })

  router.get('/cams/proxy/segment', async (request, response) => {
    const src = readQueryString(request.query.src)
    if (!src || !isAllowedUpstream(src)) {
      response.status(400).end()
      return
    }

    const abortScope = createAbortScope(
      request,
      response,
      SEGMENT_FETCH_TIMEOUT_MS,
    )
    let upstream: Response
    try {
      upstream = await fetch(src, { signal: abortScope.signal })
    } catch {
      abortScope.cleanup()
      response.status(502).end()
      return
    }

    if (!upstream.ok || !upstream.body) {
      abortScope.cleanup()
      void upstream.body?.cancel().catch(() => undefined)
      response.status(502).end()
      return
    }

    response.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') ?? 'video/mp2t',
    )
    const contentLength = upstream.headers.get('content-length')
    if (contentLength) {
      response.setHeader('Content-Length', contentLength)
    }
    response.setHeader('Cache-Control', 'no-store')

    const readable = Readable.fromWeb(upstream.body)
    let settled = false
    const cleanup = (): void => {
      if (settled) {
        return
      }
      settled = true
      abortScope.cleanup()
      response.off('close', handleResponseClose)
      response.off('error', handleResponseError)
      response.off('finish', cleanup)
      readable.off('error', handleReadableError)
    }
    const handleResponseClose = (): void => {
      if (!response.writableEnded) {
        readable.destroy()
      }
      cleanup()
    }
    const handleResponseError = (error: Error): void => {
      readable.destroy(error)
      cleanup()
    }
    const handleReadableError = (): void => {
      if (!response.headersSent) {
        response.statusCode = 502
      }
      if (!response.writableEnded) {
        response.end()
      }
      cleanup()
    }

    response.once('close', handleResponseClose)
    response.once('error', handleResponseError)
    response.once('finish', cleanup)
    readable.once('error', handleReadableError)
    readable.pipe(response)
  })

  return router
}
