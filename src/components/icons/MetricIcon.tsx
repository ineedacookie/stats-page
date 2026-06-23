import type { CSSProperties } from 'react'

import type { MetricIconName } from '../../lib/metricIcon'

interface MetricIconProps {
  name: MetricIconName
  className?: string
  style?: CSSProperties
}

const baseClassName = 'h-5 w-5'

export const MetricIcon = ({ name, className, style }: MetricIconProps) => {
  const mergedClassName = className ? `${baseClassName} ${className}` : baseClassName

  switch (name) {
    case 'globe':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
          <path d="M3 12h18M12 3a16 16 0 0 1 0 18M12 3a16 16 0 0 0 0 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'sprout':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M12 20v-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M12 13c-3 0-5.5-2.5-5.5-5.5C9.8 7.5 12 9.7 12 13Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M12 13c3 0 5.5-2.5 5.5-5.5C14.2 7.5 12 9.7 12 13Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      )
    case 'trend':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M4 16l5-5 4 4 7-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 8h5v5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'wallet':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M3 7.5a2.5 2.5 0 0 1 2.5-2.5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M14 12h7v3h-7a1.5 1.5 0 1 1 0-3Z" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
    case 'car':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M5 14.5h14l-1.5-5h-11z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M4 14.5h16v3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="7.5" cy="18" r="1.4" fill="currentColor" />
          <circle cx="16.5" cy="18" r="1.4" fill="currentColor" />
        </svg>
      )
    case 'bike':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <circle cx="6" cy="17" r="3" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M6 17l4-8h3l3 8M10 9l5 0M12 9l-2 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'computer':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <rect x="4" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M9 19h6M12 16v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'book':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M5 5.5v15" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
    case 'newspaper':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M5 5h14v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'tv':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <rect x="3.5" y="6.5" width="17" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M9 21h6M10 17.5l-1 3.5M14 17.5l1 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'phone':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <rect x="8" y="3.5" width="8" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="12" cy="17.5" r="1" fill="currentColor" />
        </svg>
      )
    case 'game':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <rect x="4" y="9" width="16" height="8" rx="4" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 13h3M9.5 11.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="15.5" cy="12.5" r="1" fill="currentColor" />
          <circle cx="17.5" cy="14.5" r="1" fill="currentColor" />
        </svg>
      )
    case 'wifi':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M4 10a12 12 0 0 1 16 0M7 13a8 8 0 0 1 10 0M10 16a4 4 0 0 1 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="12" cy="19" r="1.2" fill="currentColor" />
        </svg>
      )
    case 'mail':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <rect x="3.5" y="6" width="17" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'chat':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      )
    case 'search':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" />
          <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'tree':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M12 5 7 11h3l-2 3h3l-2 3h6l-2-3h3l-2-3h3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M12 17v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'mountain':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="m3 18 6-9 4 6 2-3 6 6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      )
    case 'cloud':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M7.5 18a4.5 4.5 0 1 1 .7-9A5.8 5.8 0 0 1 19 10.6a3.7 3.7 0 0 1-1 7.4z" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
    case 'food':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M7 4v8M9 4v8M5 4v8M7 12v8M14 4v6a2 2 0 0 0 4 0V4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'water':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M12 4c3.5 4.3 5 6.4 5 9a5 5 0 0 1-10 0c0-2.6 1.5-4.7 5-9Z" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
    case 'bolt':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="m13 3-7 10h5l-1 8 8-11h-5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      )
    case 'sun':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6 16.7 7.3M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'fuel':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M6 4h8v16H6z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M9 8h2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M14 7h3l1.5 2.5V16a1.5 1.5 0 0 1-3 0v-2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'hourglass':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M7 4h10M7 20h10M8 4c0 4 3 4.5 4 6 1-1.5 4-2 4-6M8 20c0-4 3-4.5 4-6 1 1.5 4 2 4 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'chart':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={mergedClassName} style={style}>
          <path d="M4 19h16M7 16V9M12 16V6M17 16v-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      )
  }
}
