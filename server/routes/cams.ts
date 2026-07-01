import { Readable } from 'node:stream'

import { Router } from 'express'

import { LiveCamService } from '../services/liveCamService.js'

const HLS_CONTENT_TYPE = 'application/vnd.apple.mpegurl'
const ALLOWED_PROXY_HOSTS = ['vstream.command.verkada.com']

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
): Promise<{ ok: boolean; body: string }> => {
  try {
    const response = await fetch(url)
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

    let selection = forceId ? await camService.pickById(forceId) : null
    if (!selection) {
      selection = await camService.pickNext({ excludeId })
    }

    if (!selection) {
      response
        .status(503)
        .json({ error: 'No live animal cams are available right now.' })
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

    const fetched = await fetchPlaylist(src)
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

    const fetched = await fetchPlaylist(src)
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

    let upstream: Response
    try {
      upstream = await fetch(src)
    } catch {
      response.status(502).end()
      return
    }

    if (!upstream.ok || !upstream.body) {
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

    Readable.fromWeb(upstream.body).pipe(response)
  })

  return router
}
