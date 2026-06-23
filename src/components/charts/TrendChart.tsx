import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatTimestamp, formatValue } from '../../lib/format'
import type { DashboardMetric } from '../../types/stats'

interface TrendChartProps {
  metric: DashboardMetric
  compact?: boolean
}

interface TooltipPayloadValue {
  value?: number
}

interface TooltipProps {
  active?: boolean
  payload?: TooltipPayloadValue[]
  label?: number
}

const tooltipClassName =
  'rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-base shadow-lg'

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  return (
    <div className={tooltipClassName}>
      <p className="mb-1 text-slate-300">{formatTimestamp(label ?? null)}</p>
      <p className="font-medium text-slate-50">
        {formatValue(payload[0].value ?? null, undefined)}
      </p>
    </div>
  )
}

export const TrendChart = ({ metric, compact = false }: TrendChartProps) => {
  const chartHeight = compact ? 96 : 180
  const data = metric.history.map((point) => ({
    timestamp: point.timestamp,
    value: point.value,
  }))
  const gradientId = `trend-${metric.id}`

  if (data.length < 2) {
    return (
      <div className="flex h-full min-h-24 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 text-base text-slate-300">
        Waiting for more samples...
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: chartHeight }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metric.accent} stopOpacity={0.9} />
              <stop offset="100%" stopColor={metric.accent} stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <XAxis dataKey="timestamp" hide />
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={`url(#${gradientId})`}
            strokeWidth={compact ? 2 : 2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: metric.accent }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
