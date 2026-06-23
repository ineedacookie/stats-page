import { formatDelta, formatPercent, formatTimestamp, formatValue } from '../lib/format'
import type { DashboardMetric } from '../types/stats'
import { TrendChart } from './charts/TrendChart'

interface StatCardProps {
  metric: DashboardMetric
  selected: boolean
  onSelect: (metricId: string) => void
}

const statusStyles: Record<DashboardMetric['status'], string> = {
  ok: 'bg-emerald-400/20 text-emerald-200 ring-emerald-300/30',
  stale: 'bg-amber-400/20 text-amber-100 ring-amber-300/30',
  error: 'bg-rose-400/20 text-rose-100 ring-rose-300/30',
}

export const StatCard = ({
  metric,
  selected,
  onSelect,
}: StatCardProps) => {
  const cardClassName = selected
    ? 'ring-2 ring-sky-400/60'
    : 'ring-1 ring-slate-700/80 hover:ring-slate-500/80'

  return (
    <button
      type="button"
      onClick={() => onSelect(metric.id)}
      className={`w-full rounded-2xl bg-slate-900/70 p-4 text-left shadow-glow transition ${cardClassName}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-slate-400">
            {metric.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-50">
            {formatValue(metric.latestValue, metric.unit)}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${statusStyles[metric.status]}`}
        >
          {metric.status}
        </span>
      </div>

      <p className="mb-3 text-xs text-slate-400">{metric.description}</p>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
        <div className="rounded-lg bg-slate-800/60 px-2 py-1.5">
          <p className="text-slate-400">Delta</p>
          <p className="font-medium">{formatDelta(metric.delta, metric.unit)}</p>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-2 py-1.5">
          <p className="text-slate-400">Change</p>
          <p className="font-medium">{formatPercent(metric.changePercent)}</p>
        </div>
      </div>

      <TrendChart metric={metric} compact />

      <p className="mt-2 text-[11px] text-slate-500">
        Last update {formatTimestamp(metric.lastUpdated)}
      </p>
    </button>
  )
}
