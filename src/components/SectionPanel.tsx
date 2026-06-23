import { SECTION_THEME } from '../config/sections'
import type { DashboardSection } from '../types/stats'
import { StatCard } from './StatCard'

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
  const maxVisibleMetrics = section.id === 'worldometers-population' ? 4 : 6
  const visibleMetrics = section.metrics.slice(0, maxVisibleMetrics)
  const selectedMetric =
    visibleMetrics.find((metric) => metric.id === selectedMetricId) ??
    visibleMetrics[0] ??
    null
  const theme = SECTION_THEME[section.id] ?? {
    ringClassName: 'ring-slate-500/40',
    badgeClassName: 'bg-slate-500/20 text-slate-200',
  }

  if (!selectedMetric) {
    return (
      <section className="h-full rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-slate-300">
        No metrics found for this section.
      </section>
    )
  }

  return (
    <section
      className={`flex h-full min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-3 ring-1 ${theme.ringClassName}`}
    >
      <div className="mb-2 shrink-0">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${theme.badgeClassName}`}
        >
          {section.title}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-fr gap-2 md:grid-cols-3 xl:grid-cols-6">
        {visibleMetrics.map((metric) => (
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
