const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

const parseRetryAfterMs = (retryAfterHeader: string | null): number | null => {
  if (!retryAfterHeader) {
    return null
  }

  const seconds = Number(retryAfterHeader)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  const timestamp = Date.parse(retryAfterHeader)
  if (!Number.isFinite(timestamp)) {
    return null
  }

  return Math.max(0, timestamp - Date.now())
}

interface PoliteHtmlClientOptions {
  userAgent: string
  minDelayMs: number
  jitterMs: number
  requestTimeoutMs: number
}

/**
 * Single-flight HTML fetch client that spaces requests to reduce source impact.
 * It serializes outbound requests and enforces per-host minimum delay + jitter.
 */
export class PoliteHtmlClient {
  private readonly userAgent: string
  private readonly minDelayMs: number
  private readonly jitterMs: number
  private readonly requestTimeoutMs: number
  private queueTail = Promise.resolve()
  private readonly nextAllowedAtByHost = new Map<string, number>()

  public constructor(options: PoliteHtmlClientOptions) {
    this.userAgent = options.userAgent
    this.minDelayMs = Math.max(0, options.minDelayMs)
    this.jitterMs = Math.max(0, options.jitterMs)
    this.requestTimeoutMs = Math.max(1000, options.requestTimeoutMs)
  }

  public async fetchHtml(url: string): Promise<string> {
    return this.runSerial(async () => {
      const parsedUrl = new URL(url)
      const host = parsedUrl.host
      const now = Date.now()
      const nextAllowedAt = this.nextAllowedAtByHost.get(host) ?? now

      if (nextAllowedAt > now) {
        await sleep(nextAllowedAt - now)
      }

      const spacingMs = this.nextSpacingMs()
      this.nextAllowedAtByHost.set(host, Date.now() + spacingMs)

      const controller = new AbortController()
      const timeout = setTimeout(() => {
        controller.abort()
      }, this.requestTimeoutMs)

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'user-agent': this.userAgent,
            accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'accept-language': 'en-US,en;q=0.8',
            'cache-control': 'no-cache',
          },
        })

        if (response.status === 429 || response.status === 503) {
          const retryAfterMs =
            parseRetryAfterMs(response.headers.get('retry-after')) ?? 5 * 60 * 1000
          this.extendHostBackoff(host, retryAfterMs)
          throw new Error(
            `Source requested slowdown (${response.status}); respecting backoff`,
          )
        }

        if (!response.ok) {
          throw new Error(
            `Request failed (${response.status} ${response.statusText}) for ${url}`,
          )
        }

        return response.text()
      } finally {
        clearTimeout(timeout)
      }
    })
  }

  private nextSpacingMs(): number {
    if (this.jitterMs <= 0) {
      return this.minDelayMs
    }

    return this.minDelayMs + Math.floor(Math.random() * (this.jitterMs + 1))
  }

  private extendHostBackoff(host: string, backoffMs: number): void {
    const now = Date.now()
    const current = this.nextAllowedAtByHost.get(host) ?? now
    const candidate = now + Math.max(0, backoffMs)
    this.nextAllowedAtByHost.set(host, Math.max(current, candidate))
  }

  private async runSerial<T>(operation: () => Promise<T>): Promise<T> {
    const prior = this.queueTail
    let releaseQueue: () => void = () => undefined
    this.queueTail = new Promise<void>((resolve) => {
      releaseQueue = resolve
    })

    await prior
    try {
      return await operation()
    } finally {
      releaseQueue()
    }
  }
}
