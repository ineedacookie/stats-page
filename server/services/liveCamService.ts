import { LIVE_CAMS, type LiveCamDefinition } from '../config/liveCams.js'

interface CamSelectionBase {
  id: string
  title: string
  location: string
}

export type CamSelection =
  | (CamSelectionBase & { kind: 'youtube'; youtubeId: string })
  | (CamSelectionBase & { kind: 'hls'; hlsUrl: string })

interface CacheEntry {
  selection: CamSelection | null
  resolvedAt: number
}

interface LiveCamServiceOptions {
  livenessTtlMs: number
  livenessTimeoutMs: number
}

const MAX_RECENT = 8
const VERKADA_HLS_HOST = 'vstream.command.verkada.com'

// A desktop browser UA is required — YouTube serves a stripped page (without the
// canonical live video) to unknown/bot agents.
const RESOLVE_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const decodeEntities = (value: string): string =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')

// Trim explore.org's boilerplate ("LIVE ..." prefix, "| explore.org" / "powered
// by EXPLORE.org" suffixes) so the on-screen label stays clean.
const cleanTitle = (raw: string): string =>
  decodeEntities(raw)
    .replace(/^\s*live\s+/i, '')
    .replace(/\s*\|\s*explore\.org\s*$/i, '')
    .replace(/\s*powered by\s+explore\.org\s*$/i, '')
    .trim()

export class LiveCamService {
  private readonly livenessTtlMs: number
  private readonly livenessTimeoutMs: number
  private readonly cams: LiveCamDefinition[]
  private readonly cache = new Map<string, CacheEntry>()
  private recentIds: string[] = []

  public constructor(options: LiveCamServiceOptions) {
    this.livenessTtlMs = options.livenessTtlMs
    this.livenessTimeoutMs = options.livenessTimeoutMs
    this.cams = LIVE_CAMS
  }

  // Pick a random cam that is currently live, skipping the excluded id and (when
  // possible) recently shown cams. Returns null when nothing is live.
  public async pickNext(
    options: { excludeId?: string | null } = {},
  ): Promise<CamSelection | null> {
    const excludeId = options.excludeId ?? null
    const pool = this.cams.filter((cam) => cam.id !== excludeId)
    const candidates = pool.length > 0 ? pool : this.cams
    const ordered = this.orderByFreshness(this.shuffle(candidates))

    for (const cam of ordered) {
      const selection = await this.resolve(cam)
      if (selection) {
        this.markRecent(cam.id)
        return selection
      }
    }

    return null
  }

  // Resolve and return one specific cam id (used for temporary testing pins).
  public async pickById(camId: string): Promise<CamSelection | null> {
    const cam = this.cams.find((entry) => entry.id === camId)
    if (!cam) {
      return null
    }

    const selection = await this.resolve(cam)
    if (selection) {
      this.markRecent(cam.id)
    }
    return selection
  }

  // Resolve a cam to a playable selection, caching hits and misses for a short
  // window so rapid scene cycles don't re-probe every source.
  private async resolve(cam: LiveCamDefinition): Promise<CamSelection | null> {
    const cached = this.cache.get(cam.id)
    if (cached && Date.now() - cached.resolvedAt < this.livenessTtlMs) {
      return cached.selection
    }

    const selection = await this.compute(cam)
    this.cache.set(cam.id, { selection, resolvedAt: Date.now() })
    return selection
  }

  private async compute(cam: LiveCamDefinition): Promise<CamSelection | null> {
    switch (cam.kind) {
      case 'youtube': {
        const live = await this.fetchYouTubeLive(cam.handle)
        if (!live) {
          return null
        }
        return {
          id: cam.id,
          title: live.title || cam.title,
          location: cam.location,
          kind: 'youtube',
          youtubeId: live.videoId,
        }
      }
      case 'hls': {
        const ok = await this.checkManifest(cam.hlsUrl)
        if (!ok) {
          return null
        }
        return {
          id: cam.id,
          title: cam.title,
          location: cam.location,
          kind: 'hls',
          hlsUrl: cam.hlsUrl,
        }
      }
      case 'verkada': {
        const manifestUrl = await this.fetchVerkadaManifest(cam.authUrl)
        if (!manifestUrl) {
          return null
        }
        const ok = await this.checkManifest(manifestUrl)
        if (!ok) {
          return null
        }
        return {
          id: cam.id,
          title: cam.title,
          location: cam.location,
          kind: 'hls',
          hlsUrl: `/api/cams/proxy/master.m3u8?src=${encodeURIComponent(manifestUrl)}`,
        }
      }
      default: {
        const exhaustive: never = cam
        return exhaustive
      }
    }
  }

  private async fetchYouTubeLive(
    handle: string,
  ): Promise<{ videoId: string; title: string } | null> {
    const html = await this.fetchText(
      `https://www.youtube.com/@${handle}/live?hl=en&gl=US`,
      {
        'user-agent': RESOLVE_UA,
        'accept-language': 'en-US,en;q=0.9',
        cookie: 'CONSENT=YES+1; SOCS=CAI',
      },
    )
    if (!html || !html.includes('"isLiveNow":true')) {
      return null
    }

    const idMatch = html.match(
      /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})">/,
    )
    if (!idMatch) {
      return null
    }

    const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/)
    return { videoId: idMatch[1], title: cleanTitle(titleMatch?.[1] ?? '') }
  }

  private async checkManifest(url: string): Promise<boolean> {
    const body = await this.fetchText(url, {})
    return body !== null && body.includes('#EXTM3U')
  }

  // Resolve a Verkada embed-auth URL into the underlying short-lived HLS
  // manifest URL. We extract it from the redirect hash payload.
  private async fetchVerkadaManifest(authUrl: string): Promise<string | null> {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort()
    }, this.livenessTimeoutMs)
    timer.unref()

    try {
      const response = await fetch(authUrl, {
        signal: controller.signal,
        redirect: 'manual',
        headers: { 'user-agent': RESOLVE_UA },
      })
      if (response.status < 300 || response.status >= 400) {
        return null
      }

      const location = response.headers.get('location')
      if (!location) {
        return null
      }

      const parsed = new URL(location)
      const hashPayload = parsed.hash.startsWith('#')
        ? parsed.hash.slice(1)
        : parsed.hash
      if (!hashPayload) {
        return null
      }

      const payload = JSON.parse(
        decodeURIComponent(hashPayload),
      ) as {
        urlHD?: string
        urlSD?: string
      }
      const manifestUrl = payload.urlHD ?? payload.urlSD
      if (!manifestUrl) {
        return null
      }

      let manifestParsed: URL
      try {
        manifestParsed = new URL(manifestUrl)
      } catch {
        return null
      }
      if (
        manifestParsed.hostname !== VERKADA_HLS_HOST ||
        (manifestParsed.protocol !== 'https:' &&
          manifestParsed.protocol !== 'http:')
      ) {
        return null
      }

      return manifestParsed.toString()
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  private async fetchText(
    url: string,
    headers: Record<string, string>,
  ): Promise<string | null> {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort()
    }, this.livenessTimeoutMs)
    timer.unref()

    try {
      const response = await fetch(url, { signal: controller.signal, headers })
      if (!response.ok) {
        return null
      }
      return await response.text()
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  private orderByFreshness(cams: LiveCamDefinition[]): LiveCamDefinition[] {
    const fresh = cams.filter((cam) => !this.recentIds.includes(cam.id))
    const recent = cams.filter((cam) => this.recentIds.includes(cam.id))
    return [...fresh, ...recent]
  }

  private markRecent(camId: string): void {
    const limit = Math.min(MAX_RECENT, Math.max(1, this.cams.length - 1))
    this.recentIds = [
      camId,
      ...this.recentIds.filter((id) => id !== camId),
    ].slice(0, limit)
  }

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items]
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      const temp = copy[index]
      copy[index] = copy[swapIndex]
      copy[swapIndex] = temp
    }
    return copy
  }
}
