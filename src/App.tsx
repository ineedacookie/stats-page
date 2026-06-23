import { SECTION_ROTATION_MS } from './config/sections'
import { SectionCarousel } from './components/SectionCarousel'
import { SpuriousCorrelationWidget } from './components/SpuriousCorrelationWidget'
import { useLiveStats } from './hooks/useLiveStats'
import { formatElapsed, formatTimestamp } from './lib/format'

const sourceStatusTheme = {
  healthy: 'bg-emerald-400/20 text-emerald-100 ring-emerald-400/30',
  stale: 'bg-amber-400/20 text-amber-100 ring-amber-400/30',
  unavailable: 'bg-rose-400/20 text-rose-100 ring-rose-400/30',
}

const getSourceStatusStyle = (
  connected: boolean,
  stale: boolean,
  hasSuccessfulScrape: boolean,
): string => {
  if (connected && !stale) {
    return sourceStatusTheme.healthy
  }

  if (hasSuccessfulScrape) {
    return sourceStatusTheme.stale
  }

  return sourceStatusTheme.unavailable
}

const getSourceStatusLabel = (
  connected: boolean,
  stale: boolean,
  hasSuccessfulScrape: boolean,
): string => {
  if (connected && !stale) {
    return 'live'
  }

  if (hasSuccessfulScrape) {
    return 'stale'
  }

  return 'offline'
}

function App() {
  const { data, error, isLoading, lastFetchAt, refetch } = useLiveStats()

  const totalMetrics =
    data?.sections.reduce(
      (metricCount, section) => metricCount + section.metrics.length,
      0,
    ) ?? 0

  const sources = data?.sources ?? []
  const healthySourceCount = sources.filter(
    (source) => source.connected && !source.stale,
  ).length
  const sourceSummaryLabel =
    sources.length === 0
      ? 'connecting'
      : `${healthySourceCount}/${sources.length} live`

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-6 lg:px-10 lg:py-8">
        <header className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-glow md:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Internet Live Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-50 md:text-4xl">
                Internet Live Stats Pulseboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Hourly multi-source scraping from internetlivestats.com and
                worldometers.info with rolling trend charts, plus an auto-cycling
                Tyler Vigen spurious-correlation widget.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void refetch()
              }}
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-700/80"
            >
              Refresh now
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-800/60 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Sections
              </p>
              <p className="text-xl font-semibold text-slate-100">
                {data?.sections.length ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-slate-800/60 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Metrics
              </p>
              <p className="text-xl font-semibold text-slate-100">{totalMetrics}</p>
            </div>
            <div className="rounded-xl bg-slate-800/60 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Last payload
              </p>
              <p className="text-sm font-medium text-slate-100">
                {formatElapsed(data?.generatedAt ?? lastFetchAt)}
              </p>
              <p className="text-xs text-slate-400">
                {formatTimestamp(data?.generatedAt ?? lastFetchAt)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-800/60 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Sources
              </p>
              <p className="mt-1">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium uppercase ring-1 ${
                    healthySourceCount === sources.length && sources.length > 0
                      ? sourceStatusTheme.healthy
                      : healthySourceCount > 0
                        ? sourceStatusTheme.stale
                        : sourceStatusTheme.unavailable
                  }`}
                >
                  {sourceSummaryLabel}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {sources.length > 0
                  ? 'Hourly source ingestion enabled'
                  : 'Waiting for source health'}
              </p>
            </div>
          </div>

          {sources.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sources.map((source) => {
                const hasSuccessfulScrape = source.lastSuccessfulScrapeAt !== null
                const statusClassName = getSourceStatusStyle(
                  source.connected,
                  source.stale,
                  hasSuccessfulScrape,
                )
                const statusLabel = getSourceStatusLabel(
                  source.connected,
                  source.stale,
                  hasSuccessfulScrape,
                )

                return (
                  <div
                    key={source.sourceId}
                    className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-100">{source.label}</p>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-medium uppercase ring-1 ${statusClassName}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{source.sourceUrl}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Last success {formatElapsed(source.lastSuccessfulScrapeAt)}
                    </p>
                    {source.lastError ? (
                      <p className="mt-1 text-xs text-rose-200">
                        Error: {source.lastError}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              API error: {error}
            </p>
          ) : null}
        </header>

        {isLoading && !data ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-10 text-center text-slate-300">
            Loading live statistics...
          </section>
        ) : (
          <div className="space-y-6">
            <SpuriousCorrelationWidget data={data?.spurious ?? null} />
            <SectionCarousel
              sections={data?.sections ?? []}
              rotationMs={SECTION_ROTATION_MS}
            />
          </div>
        )}
      </div>
    </main>
  )
}

export default App
