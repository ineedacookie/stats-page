import { formatValue } from '../lib/format'
import { resolveMetricIconName } from '../lib/metricIcon'
import type { DashboardMetric } from '../types/stats'
import { MetricIcon } from './icons/MetricIcon'

interface StatCardProps {
  metric: DashboardMetric
  selected: boolean
  onSelect: (metricId: string) => void
}

export const StatCard = ({
  metric,
  selected,
  onSelect,
}: StatCardProps) => {
  const iconName = resolveMetricIconName(metric)
  const cardClassName = selected
    ? 'ring-2 ring-sky-400/60'
    : 'ring-1 ring-slate-700/80 hover:ring-slate-500/80'

  return (
    <button
      type="button"
      onClick={() => onSelect(metric.id)}
      className={`w-full rounded-xl bg-slate-900/70 p-2.5 text-left shadow-glow transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${cardClassName}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MetricIcon name={iconName} className="shrink-0" style={{ color: metric.accent }} />
            <p className="text-sm font-medium leading-snug text-slate-200">
              {metric.label}
            </p>
          </div>
        </div>
        <p className="shrink-0 truncate text-right text-lg font-semibold text-slate-50">
          {formatValue(metric.latestValue, metric.unit)}
        </p>
      </div>
    </button>
  )
}
