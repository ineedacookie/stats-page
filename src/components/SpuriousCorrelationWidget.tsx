import { useEffect, useState } from 'react'

import { SPURIOUS_WIDGET_FALLBACK_CYCLE_MS } from '../config/sections'
import { formatTimestamp } from '../lib/format'
import type { SpuriousCorrelationWidgetPayload } from '../types/stats'

interface SpuriousCorrelationWidgetProps {
  data: SpuriousCorrelationWidgetPayload | null
}

export const SpuriousCorrelationWidget = ({
  data,
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
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Spurious Correlations
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Waiting for scraped correlations...
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-violet-400/30 bg-slate-900/60 p-5 ring-1 ring-violet-300/20">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-200">
          Spurious Correlations
        </p>
        <span className="rounded-full bg-violet-400/20 px-2 py-1 text-[11px] font-medium text-violet-100">
          #{activeCorrelation.correlationNumber.toLocaleString('en-US')}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-slate-50">{activeCorrelation.title}</h3>
      <p className="mt-1 text-xs text-slate-300">
        {activeCorrelation.variableA} vs {activeCorrelation.variableB}
      </p>

      <a
        href={activeCorrelation.detailUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 block overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/70"
      >
        <img
          src={activeCorrelation.imageUrl}
          alt={activeCorrelation.title}
          className="h-60 w-full object-contain"
          loading="lazy"
        />
      </a>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <p>
          {activeIndex + 1} / {correlations.length} shown ({data?.total.toLocaleString('en-US')} stored)
        </p>
        <p>Scraped {formatTimestamp(activeCorrelation.scrapedAt)}</p>
      </div>
    </section>
  )
}
