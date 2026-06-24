import type { ChildProcess } from 'node:child_process'

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

const BROWSER_CLOSE_TIMEOUT_MS = 2_000
const PAGE_CLOSE_TIMEOUT_MS = 2_000
const PROCESS_EXIT_WAIT_TIMEOUT_MS = 1_500

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
      return await this.runWithTimeout(
        async () => {
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
        },
        this.operationTimeoutMs,
        `Browser counter scrape timed out after ${this.operationTimeoutMs}ms`,
      )
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('Browser counter scrape timed out')
      ) {
        await this.forceCloseCurrentBrowser('scrape operation timed out')
      }
      throw error
    } finally {
      await this.closePageSafely(page)
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

    await this.closeBrowserWithFallback(browser, 'runtime shutdown')
  }

  private async getOrLaunchBrowser(): Promise<Browser> {
    if (this.browserPromise === null) {
      let launchPromise: Promise<Browser>
      launchPromise = puppeteer
        .launch({
          headless: true,
          timeout: this.launchTimeoutMs,
        })
        .then((browser) => {
          browser.once('disconnected', () => {
            if (this.browserPromise === launchPromise) {
              this.browserPromise = null
            }
          })

          return browser
        })
        .catch((error) => {
          this.browserPromise = null
          throw error
        })

      this.browserPromise = launchPromise
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
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | null = null
    const timeoutPromise = new Promise<T>((_resolve, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(timeoutMessage))
      }, timeoutMs)
    })

    try {
      return await Promise.race([operation(), timeoutPromise])
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }
    }
  }

  private async closePageSafely(page: Page): Promise<void> {
    if (page.isClosed()) {
      return
    }

    try {
      await this.runWithTimeout(
        async () => {
          await page.close()
        },
        PAGE_CLOSE_TIMEOUT_MS,
        `Page close timed out after ${PAGE_CLOSE_TIMEOUT_MS}ms`,
      )
    } catch (error) {
      const message = this.toErrorMessage(error)
      console.warn(
        `[scraper] page.close failed (${message}); forcing browser process recycle.`,
      )
      await this.forceCloseCurrentBrowser('page close failed')
    }
  }

  private async forceCloseCurrentBrowser(reason: string): Promise<void> {
    if (this.browserPromise === null) {
      return
    }

    const browserPromise = this.browserPromise
    this.browserPromise = null

    const browser = await browserPromise.catch(() => null)
    if (!browser) {
      return
    }

    await this.forceKillBrowserProcess(browser, reason)
  }

  private async closeBrowserWithFallback(browser: Browser, reason: string): Promise<void> {
    try {
      await this.runWithTimeout(
        async () => {
          await browser.close()
        },
        BROWSER_CLOSE_TIMEOUT_MS,
        `Browser close timed out after ${BROWSER_CLOSE_TIMEOUT_MS}ms`,
      )
    } catch (error) {
      const message = this.toErrorMessage(error)
      console.warn(
        `[scraper] browser.close failed (${message}); forcing process kill (${reason}).`,
      )
      await this.forceKillBrowserProcess(browser, reason)
    }
  }

  private async forceKillBrowserProcess(browser: Browser, reason: string): Promise<void> {
    const browserProcess = browser.process()
    if (!browserProcess) {
      return
    }

    if (browserProcess.exitCode === null && !browserProcess.killed) {
      browserProcess.kill('SIGKILL')
    }

    await this.waitForProcessExit(browserProcess).catch(() => undefined)
    console.warn(`[scraper] force-killed browser process (${reason}).`)
  }

  private async waitForProcessExit(browserProcess: ChildProcess): Promise<void> {
    if (browserProcess.exitCode !== null) {
      return
    }

    await this.runWithTimeout(
      async () => {
        await new Promise<void>((resolve) => {
          const handleExit = (): void => {
            cleanup()
            resolve()
          }
          const cleanup = (): void => {
            browserProcess.off('exit', handleExit)
            browserProcess.off('error', handleExit)
          }

          browserProcess.once('exit', handleExit)
          browserProcess.once('error', handleExit)
        })
      },
      PROCESS_EXIT_WAIT_TIMEOUT_MS,
      `Timed out waiting for browser process exit after ${PROCESS_EXIT_WAIT_TIMEOUT_MS}ms`,
    )
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    return 'Unknown error'
  }
}
