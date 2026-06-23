import type { DashboardMetric } from '../types/stats'

export type MetricIconName =
  | 'globe'
  | 'sprout'
  | 'trend'
  | 'wallet'
  | 'car'
  | 'bike'
  | 'computer'
  | 'book'
  | 'newspaper'
  | 'tv'
  | 'phone'
  | 'game'
  | 'wifi'
  | 'mail'
  | 'chat'
  | 'search'
  | 'tree'
  | 'mountain'
  | 'cloud'
  | 'food'
  | 'water'
  | 'bolt'
  | 'sun'
  | 'fuel'
  | 'hourglass'
  | 'chart'

export const resolveMetricIconName = (metric: DashboardMetric): MetricIconName => {
  const key = `${metric.id} ${metric.rel} ${metric.category}`.toLowerCase()

  if (key.includes('population')) return 'globe'
  if (key.includes('birth')) return 'sprout'
  if (key.includes('growth')) return 'trend'
  if (key.includes('expend') || key.includes('spend')) return 'wallet'
  if (key.includes('automobile') || key.includes('car')) return 'car'
  if (key.includes('bicycle') || key.includes('bike')) return 'bike'
  if (key.includes('computer')) return 'computer'
  if (key.includes('book')) return 'book'
  if (key.includes('newspaper')) return 'newspaper'
  if (key.includes('tv')) return 'tv'
  if (key.includes('cell') || key.includes('phone')) return 'phone'
  if (key.includes('videogame') || key.includes('game')) return 'game'
  if (key.includes('internet_users') || key.includes('internet users')) return 'wifi'
  if (key.includes('email') || key.includes('em/today')) return 'mail'
  if (key.includes('tweet') || key.includes('blog') || key.includes('social'))
    return 'chat'
  if (key.includes('search')) return 'search'
  if (key.includes('forest')) return 'tree'
  if (key.includes('soil') || key.includes('desert')) return 'mountain'
  if (key.includes('co2') || key.includes('tox') || key.includes('chem'))
    return 'cloud'
  if (
    key.includes('undernourished') ||
    key.includes('overweight') ||
    key.includes('obese')
  ) {
    return 'food'
  }
  if (key.includes('water')) return 'water'
  if (key.includes('solar')) return 'sun'
  if (key.includes('energy')) return 'bolt'
  if (key.includes('oil') || key.includes('gas') || key.includes('coal'))
    return 'fuel'
  if (key.includes('days')) return 'hourglass'

  return 'chart'
}
