import { load } from 'cheerio'

import { PoliteHtmlClient } from './politeHtmlClient.js'
import type { SpuriousCorrelationRecord } from '../types.js'

interface SpuriousCorrelationsScraperOptions {
  listingUrl: string
  htmlClient: PoliteHtmlClient
}

interface SpuriousScrapeBatch {
  items: SpuriousCorrelationRecord[]
  nextPage: number
  pagesScraped: number
}

interface SpuriousScrapePageResult {
  items: SpuriousCorrelationRecord[]
  nextPage: number
}

const parsePageNumber = (value: string | null, fallback: number): number => {
  if (value === null) {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

export class SpuriousCorrelationsScraper {
  private readonly listingUrl: string
  private readonly listingPathname: string
  private readonly sourceOrigin: string
  private readonly htmlClient: PoliteHtmlClient

  public constructor(options: SpuriousCorrelationsScraperOptions) {
    const listing = new URL(options.listingUrl)
    this.listingUrl = `${listing.origin}${listing.pathname}`
    this.listingPathname = listing.pathname
    this.sourceOrigin = listing.origin
    this.htmlClient = options.htmlClient
  }

  public async scrapePages(
    startPage: number,
    pagesToScrape: number,
  ): Promise<SpuriousScrapeBatch> {
    let currentPage = Math.max(1, startPage)
    const allItems: SpuriousCorrelationRecord[] = []
    let pagesScraped = 0

    for (let index = 0; index < pagesToScrape; index += 1) {
      const pageResult = await this.scrapePage(currentPage)
      allItems.push(...pageResult.items)
      currentPage = pageResult.nextPage
      pagesScraped += 1
    }

    return {
      items: allItems,
      nextPage: currentPage,
      pagesScraped,
    }
  }

  private async scrapePage(pageNumber: number): Promise<SpuriousScrapePageResult> {
    const pageUrl = this.createPageUrl(pageNumber)
    const html = await this.htmlClient.fetchHtml(pageUrl)
    const sampledAt = Date.now()
    const $ = load(html)
    const seenCorrelationNumbers = new Set<number>()
    const items: SpuriousCorrelationRecord[] = []

    $('a[href*="spurious/correlation/"]').each((_index, element) => {
      const href = $(element).attr('href')
      if (!href) {
        return
      }

      const match = href.match(/spurious\/correlation\/(\d+)_([^/?#]+)/)
      if (!match) {
        return
      }

      const correlationNumber = Number(match[1])
      if (!Number.isFinite(correlationNumber)) {
        return
      }

      if (seenCorrelationNumbers.has(correlationNumber)) {
        return
      }
      seenCorrelationNumbers.add(correlationNumber)

      const slugSuffix = match[2]
      const slug = `${match[1]}_${slugSuffix}`
      const [rawA, rawB] = slugSuffix.split('_correlates-with_')
      const variableA = this.humanizeSlugToken(rawA ?? '')
      const variableB = this.humanizeSlugToken(rawB ?? '')
      const title =
        variableA && variableB
          ? `${variableA} correlates with ${variableB}`
          : this.humanizeSlugToken(slugSuffix)

      const imageSrc =
        $(element).find('img[src*="spurious/correlation/image/"]').first().attr('src') ??
        ''
      const imageUrl = imageSrc
        ? new URL(imageSrc, this.sourceOrigin).href
        : new URL(`spurious/correlation/image/${slug}.svg`, this.sourceOrigin).href

      items.push({
        correlationNumber,
        slug,
        title,
        variableA,
        variableB,
        detailUrl: new URL(href, this.sourceOrigin).href,
        imageUrl,
        sourcePage: pageNumber,
        scrapedAt: sampledAt,
      })
    })

    const nextPage = this.parseNextPage($, pageUrl, pageNumber)
    return { items, nextPage }
  }

  private createPageUrl(pageNumber: number): string {
    const url = new URL(this.listingUrl)
    if (pageNumber <= 1) {
      url.search = ''
      return url.toString()
    }

    url.searchParams.set('page', String(pageNumber))
    return url.toString()
  }

  private parseNextPage($: ReturnType<typeof load>, pageUrl: string, currentPage: number): number {
    const nextLink =
      $('a[href*="page="]')
        .filter((_index, element) =>
          ($(element).text() ?? '').toLowerCase().includes('next page'),
        )
        .first()
        .attr('href') ??
      $('a[href*="page="]').first().attr('href') ??
      null

    if (!nextLink) {
      return 1
    }

    const nextUrl = new URL(nextLink, pageUrl)
    if (nextUrl.pathname !== this.listingPathname) {
      return 1
    }

    return parsePageNumber(nextUrl.searchParams.get('page'), currentPage + 1)
  }

  private humanizeSlugToken(token: string): string {
    return decodeURIComponent(token)
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
}
