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
  const labelClampStyle = {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical' as const,
    WebkitLineClamp: 2,
    overflow: 'hidden',
  }
  const cardClassName = selected
    ? 'ring-2 ring-sky-400/60'
    : 'ring-1 ring-slate-700/80 hover:ring-slate-500/80'

  return (
    <button
      type="button"
      onClick={() => onSelect(metric.id)}
      className={`w-full overflow-hidden rounded-xl bg-slate-900/70 p-2 text-left shadow-glow transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${cardClassName}`}
    >
      <div className="flex h-full min-h-0 flex-col gap-1.5">
        <div className="flex min-w-0 items-start gap-2">
          <MetricIcon name={iconName} className="shrink-0" style={{ color: metric.accent }} />
          <p className="min-w-0 text-sm font-medium leading-tight text-slate-200" style={labelClampStyle}>
            {metric.label}
          </p>
        </div>
        <p className="mt-auto text-right text-base font-semibold leading-tight text-slate-50">
          {formatValue(metric.latestValue, metric.unit)}
        </p>
      </div>
    </button>
  )
}
