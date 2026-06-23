const LOADING_MARKERS = ['retrieving', 'loading', 'please wait']

const normalizeSeparators = (value: string): string => {
  const hasComma = value.includes(',')
  const hasDot = value.includes('.')

  if (hasComma && hasDot) {
    if (value.lastIndexOf(',') > value.lastIndexOf('.')) {
      return value.replace(/\./g, '').replace(',', '.')
    }

    return value.replace(/,/g, '')
  }

  if (hasComma) {
    const groups = value.split(',')
    const looksLikeThousands = groups.slice(1).every((group) => group.length === 3)
    if (looksLikeThousands) {
      return groups.join('')
    }

    return value.replace(',', '.')
  }

  return value
}

export const sanitizeCounterText = (rawText: string): string =>
  rawText.replace(/\s+/g, ' ').trim()

export const isLoadingCounterText = (rawText: string): boolean => {
  const normalized = sanitizeCounterText(rawText).toLowerCase()
  if (normalized === '' || normalized === '...') {
    return true
  }

  return LOADING_MARKERS.some((marker) => normalized.includes(marker))
}

export const parseCounterValue = (rawText: string): number | null => {
  const normalizedText = sanitizeCounterText(rawText)
  if (isLoadingCounterText(normalizedText)) {
    return null
  }

  const numericToken = normalizedText.replace(/[^0-9,.-]/g, '')
  if (!/[0-9]/.test(numericToken)) {
    return null
  }

  const normalizedNumber = normalizeSeparators(numericToken)
  const parsed = Number(normalizedNumber)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed
}
