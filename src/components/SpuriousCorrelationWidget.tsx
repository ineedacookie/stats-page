import { SPURIOUS_WIDGET_FALLBACK_CYCLE_MS } from '../config/sections'
import type { SpuriousCorrelationWidgetPayload } from '../types/stats'

interface SpuriousCorrelationWidgetProps {
  data: SpuriousCorrelationWidgetPayload | null
  className?: string
  rotationAnchorMs: number
  clockMs: number
  rotationMs?: number
}

export const SpuriousCorrelationWidget = ({
  data,
  className,
  rotationAnchorMs,
  clockMs,
  rotationMs,
}: SpuriousCorrelationWidgetProps) => {
  const correlations = data?.items ?? []
  const cycleIntervalMs =
    rotationMs ?? data?.cycleIntervalMs ?? SPURIOUS_WIDGET_FALLBACK_CYCLE_MS

  const rotationElapsedMs = Math.max(0, clockMs - rotationAnchorMs)
  const activeIndex =
    correlations.length === 0
      ? 0
      : Math.floor(rotationElapsedMs / cycleIntervalMs) % correlations.length

  const activeCorrelation = correlations[activeIndex] ?? null

  if (!activeCorrelation) {
    return (
      <section
        className={`rounded-3xl border border-slate-800 bg-slate-900/60 p-5 ${className ?? ''}`}
      >
        <p className="text-sm uppercase tracking-[0.2em] text-slate-300">
          Spurious Correlations
        </p>
        <p className="mt-2 text-base text-slate-200">
          Waiting for scraped correlations...
        </p>
      </section>
    )
  }

  return (
    <section
      className={`rounded-3xl border border-violet-400/30 bg-slate-900/60 p-3 ring-1 ring-violet-300/20 ${className ?? ''}`}
    >
      <div
        key={activeCorrelation.correlationNumber}
        className="h-full correlation-slide-in-right"
      >
        <a
          href={activeCorrelation.detailUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open spurious correlation #${activeCorrelation.correlationNumber}`}
          className="flex h-full items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <img
            src={activeCorrelation.imageUrl}
            alt=""
            className="h-full max-h-full w-auto max-w-full object-contain"
            loading="lazy"
          />
        </a>
      </div>
    </section>
  )
}
