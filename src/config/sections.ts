export const SECTION_ROTATION_MS = 15_000
export const DEFAULT_HISTORY_MINUTES = 24 * 7
export const METRIC_POLL_INTERVAL_MS = 30_000
export const SPURIOUS_WIDGET_FALLBACK_CYCLE_MS = 9_000

export const SECTION_THEME: Record<
  string,
  { ringClassName: string; badgeClassName: string }
> = {
  'internet-scale': {
    ringClassName: 'ring-sky-400/40',
    badgeClassName: 'bg-sky-500/20 text-sky-100',
  },
  activity: {
    ringClassName: 'ring-fuchsia-400/40',
    badgeClassName: 'bg-fuchsia-500/20 text-fuchsia-100',
  },
  social: {
    ringClassName: 'ring-indigo-400/40',
    badgeClassName: 'bg-indigo-500/20 text-indigo-100',
  },
  infrastructure: {
    ringClassName: 'ring-emerald-400/40',
    badgeClassName: 'bg-emerald-500/20 text-emerald-100',
  },
  worldometers: {
    ringClassName: 'ring-cyan-400/40',
    badgeClassName: 'bg-cyan-500/20 text-cyan-100',
  },
}
