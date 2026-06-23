import { SECTION_THEME } from '../config/sections'
import { formatDelta, formatElapsed, formatPercent, formatValue } from '../lib/format'
import type { DashboardSection } from '../types/stats'
import { StatCard } from './StatCard'
import { TrendChart } from './charts/TrendChart'

interface SectionPanelProps {
  section: DashboardSection
  selectedMetricId: string | null
  onMetricSelect: (metricId: string) => void
}

export const SectionPanel = ({
  section,
  selectedMetricId,
  onMetricSelect,
}: SectionPanelProps) => {
  const selectedMetric =
    section.metrics.find((metric) => metric.id === selectedMetricId) ??
    section.metrics[0] ??
    null
  const theme = SECTION_THEME[section.id] ?? {
    ringClassName: 'ring-slate-500/40',
    badgeClassName: 'bg-slate-500/20 text-slate-200',
  }

  if (!selectedMetric) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        No metrics found for this section.
      </section>
    )
  }

  return (
    <section className={`rounded-3xl border border-slate-800 bg-slate-900/60 p-6 ring-1 ${theme.ringClassName}`}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${theme.badgeClassName}`}>
            {section.title}
          </span>
          <h2 className="mt-3 text-3xl font-semibold text-slate-100">
            {selectedMetric.label}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            {section.description}
          </p>
        </div>
        <div className="grid min-w-60 grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-slate-800/70 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Current</p>
            <p className="font-semibold text-slate-100">
              {formatValue(selectedMetric.latestValue, selectedMetric.unit)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-800/70 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Delta</p>
            <p className="font-semibold text-slate-100">
              {formatDelta(selectedMetric.delta, selectedMetric.unit)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-800/70 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Change</p>
            <p className="font-semibold text-slate-100">
              {formatPercent(selectedMetric.changePercent)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-800/70 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Updated</p>
            <p className="font-semibold text-slate-100">
              {formatElapsed(selectedMetric.lastUpdated)}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <TrendChart metric={selectedMetric} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {section.metrics.map((metric) => (
          <StatCard
            key={metric.id}
            metric={metric}
            selected={metric.id === selectedMetric.id}
            onSelect={onMetricSelect}
          />
        ))}
      </div>
    </section>
  )
}
