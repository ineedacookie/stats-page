import { useEffect, useState } from 'react'

import { SPURIOUS_WIDGET_FALLBACK_CYCLE_MS } from '../config/sections'
import type { SpuriousCorrelationWidgetPayload } from '../types/stats'

interface SpuriousCorrelationWidgetProps {
  data: SpuriousCorrelationWidgetPayload | null
  className?: string
}

export const SpuriousCorrelationWidget = ({
  data,
  className,
}: SpuriousCorrelationWidgetProps) => {
  const [activeIndex, setActiveIndex] = useState(0)

  const correlations = data?.items ?? []
  const cycleIntervalMs =
    data?.cycleIntervalMs ?? SPURIOUS_WIDGET_FALLBACK_CYCLE_MS

  useEffect(() => {
    setActiveIndex(0)
  }, [correlations.length])

  useEffect(() => {
    if (correlations.length <= 1) {
      return
    }

    const timer = setInterval(() => {
      setActiveIndex((previousIndex) =>
        previousIndex + 1 >= correlations.length ? 0 : previousIndex + 1,
      )
    }, cycleIntervalMs)

    return () => {
      clearInterval(timer)
    }
  }, [correlations.length, cycleIntervalMs])

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
