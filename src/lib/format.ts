const integerFormatter = new Intl.NumberFormat('en-US')
const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
})
const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  signDisplay: 'always',
})
const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

export const formatValue = (value: number | null, unit?: string): string => {
  if (value === null || !Number.isFinite(value)) {
    return '--'
  }

  const formatted =
    Math.abs(value) >= 1_000_000
      ? compactFormatter.format(value)
      : integerFormatter.format(Math.round(value))

  return unit ? `${formatted} ${unit}` : formatted
}

export const formatDelta = (value: number | null, unit?: string): string => {
  if (value === null || !Number.isFinite(value)) {
    return '--'
  }

  const absoluteValue = Math.abs(value)
  const formattedValue =
    absoluteValue >= 1_000_000
      ? compactFormatter.format(absoluteValue)
      : integerFormatter.format(Math.round(absoluteValue))

  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  const withUnit = unit ? `${formattedValue} ${unit}` : formattedValue
  return `${sign}${withUnit}`
}

export const formatPercent = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) {
    return '--'
  }

  return `${percentFormatter.format(value)}%`
}

export const formatTimestamp = (value: number | null): string => {
  if (value === null) {
    return '--'
  }

  return timeFormatter.format(value)
}

export const formatElapsed = (timestamp: number | null): string => {
  if (timestamp === null) {
    return 'No successful sample yet'
  }

  const elapsedMs = Date.now() - timestamp
  if (elapsedMs < 1000) {
    return 'just now'
  }

  const elapsedSeconds = Math.floor(elapsedMs / 1000)
  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s ago`
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  return `${elapsedHours}h ago`
}
