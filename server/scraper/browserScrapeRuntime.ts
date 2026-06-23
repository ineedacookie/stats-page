import puppeteer, { type Browser, type Page } from 'puppeteer'

import { LOADING_COUNTER_MARKERS } from './parsers.js'

interface BrowserScrapeRuntimeOptions {
  userAgent: string
  launchTimeoutMs: number
  navigationTimeoutMs: number
  populateTimeoutMs: number
  operationTimeoutMs?: number
}

interface CounterSnapshotEntry {
  rel: string
  text: string
}

export class BrowserScrapeRuntime {
  private readonly userAgent: string
  private readonly launchTimeoutMs: number
  private readonly navigationTimeoutMs: number
  private readonly populateTimeoutMs: number
  private readonly operationTimeoutMs: number
  private browserPromise: Promise<Browser> | null = null

  public constructor(options: BrowserScrapeRuntimeOptions) {
    this.userAgent = options.userAgent
    this.launchTimeoutMs = Math.max(1_000, options.launchTimeoutMs)
    this.navigationTimeoutMs = Math.max(1_000, options.navigationTimeoutMs)
    this.populateTimeoutMs = Math.max(1_000, options.populateTimeoutMs)
    const minimumOperationTimeoutMs =
      this.navigationTimeoutMs + this.populateTimeoutMs
    const requestedOperationTimeoutMs =
      options.operationTimeoutMs ?? minimumOperationTimeoutMs + 10_000
    this.operationTimeoutMs = Math.max(
      minimumOperationTimeoutMs,
      requestedOperationTimeoutMs,
    )
  }

  public async captureCounters(url: string): Promise<Map<string, string>> {
    const browser = await this.getOrLaunchBrowser()
    const page = await browser.newPage()

    try {
      return await this.runWithTimeout(async () => {
        if (this.userAgent !== '') {
          await page.setUserAgent(this.userAgent)
        }

        page.setDefaultNavigationTimeout(this.navigationTimeoutMs)
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: this.navigationTimeoutMs,
        })

        await this.waitForCountersToPopulate(page)

        const snapshots = await page.evaluate(() => {
          const browserGlobal = globalThis as unknown as {
            document?: {
              querySelectorAll: (selector: string) => ArrayLike<{
                getAttribute: (name: string) => string | null
                textContent: string | null
              }>
            }
          }
          const documentRef = browserGlobal.document
          if (!documentRef) {
            return [] as CounterSnapshotEntry[]
          }

          const nodes = Array.from(documentRef.querySelectorAll('.rts-counter[rel]'))
          const entries: CounterSnapshotEntry[] = []

          for (const node of nodes) {
            const rel = node.getAttribute('rel')
            if (!rel) {
              continue
            }

            const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
            entries.push({ rel, text })
          }

          return entries
        })

        const counters = new Map<string, string>()
        for (const snapshot of snapshots) {
          counters.set(snapshot.rel, snapshot.text)
        }

        return counters
      }, `Browser counter scrape timed out after ${this.operationTimeoutMs}ms`)
    } finally {
      await page.close().catch(() => undefined)
    }
  }

  public async close(): Promise<void> {
    if (this.browserPromise === null) {
      return
    }

    const browserPromise = this.browserPromise
    this.browserPromise = null

    const browser = await browserPromise.catch(() => null)
    if (!browser) {
      return
    }

    await browser.close().catch(() => undefined)
  }

  private async getOrLaunchBrowser(): Promise<Browser> {
    if (this.browserPromise === null) {
      this.browserPromise = puppeteer
        .launch({
          headless: true,
          timeout: this.launchTimeoutMs,
        })
        .catch((error) => {
          this.browserPromise = null
          throw error
        })
    }

    const browser = await this.browserPromise
    if (!browser.connected) {
      this.browserPromise = null
      return this.getOrLaunchBrowser()
    }

    return browser
  }

  private async waitForCountersToPopulate(page: Page): Promise<void> {
    await page
      .waitForFunction(
        (loadingMarkers: string[]) => {
          const browserGlobal = globalThis as unknown as {
            document?: {
              querySelectorAll: (selector: string) => ArrayLike<{
                textContent: string | null
              }>
            }
          }
          const documentRef = browserGlobal.document
          if (!documentRef) {
            return false
          }

          const nodes = Array.from(documentRef.querySelectorAll('.rts-counter[rel]'))
          if (nodes.length === 0) {
            return false
          }

          return nodes.some((node) => {
            const normalizedText = (node.textContent ?? '')
              .replace(/\s+/g, ' ')
              .trim()
              .toLowerCase()

            if (normalizedText === '' || normalizedText === '...') {
              return false
            }

            if (loadingMarkers.some((marker) => normalizedText.includes(marker))) {
              return false
            }

            return /[0-9]/.test(normalizedText)
          })
        },
        { timeout: this.populateTimeoutMs },
        LOADING_COUNTER_MARKERS,
      )
      .catch(() => undefined)
  }

  private async runWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMessage: string,
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | null = null
    const timeoutPromise = new Promise<T>((_resolve, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(timeoutMessage))
      }, this.operationTimeoutMs)
    })

    try {
      return await Promise.race([operation(), timeoutPromise])
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }
    }
  }
}
