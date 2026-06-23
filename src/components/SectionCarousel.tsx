import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import type { DashboardSection } from '../types/stats'
import { SectionPanel } from './SectionPanel'

interface SectionCarouselProps {
  sections: DashboardSection[]
  rotationMs: number
}

export const SectionCarousel = ({
  sections,
  rotationMs,
}: SectionCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [progressRatio, setProgressRatio] = useState(0)
  const [selectedMetricBySectionId, setSelectedMetricBySectionId] = useState<
    Record<string, string>
  >({})
  const lastSwitchAtRef = useRef(Date.now())

  useEffect(() => {
    setSelectedMetricBySectionId((previous) => {
      const next = { ...previous }
      for (const section of sections) {
        if (section.metrics.length === 0) {
          continue
        }

        if (!next[section.id]) {
          next[section.id] = section.metrics[0].id
        }
      }

      return next
    })

    setActiveIndex((previousIndex) => {
      if (sections.length === 0) {
        return 0
      }

      return Math.min(previousIndex, sections.length - 1)
    })
  }, [sections])

  useEffect(() => {
    if (sections.length <= 1) {
      setProgressRatio(0)
      return
    }

    const timer = setInterval(() => {
      if (isPaused) {
        return
      }

      const elapsed = Date.now() - lastSwitchAtRef.current
      const ratio = Math.min(1, elapsed / rotationMs)
      setProgressRatio(ratio)

      if (elapsed < rotationMs) {
        return
      }

      setActiveIndex((previousIndex) => (previousIndex + 1) % sections.length)
      setProgressRatio(0)
      lastSwitchAtRef.current = Date.now()
    }, 250)

    return () => {
      clearInterval(timer)
    }
  }, [isPaused, rotationMs, sections.length])

  const activeSection = useMemo(
    () => sections[activeIndex] ?? null,
    [activeIndex, sections],
  )

  const handleSectionSelect = (sectionIndex: number): void => {
    setActiveIndex(sectionIndex)
    setProgressRatio(0)
    lastSwitchAtRef.current = Date.now()
  }

  const handleMetricSelect = (metricId: string): void => {
    if (!activeSection) {
      return
    }

    setSelectedMetricBySectionId((previous) => ({
      ...previous,
      [activeSection.id]: metricId,
    }))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (sections.length === 0) {
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      handleSectionSelect((activeIndex + 1) % sections.length)
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const nextIndex = activeIndex === 0 ? sections.length - 1 : activeIndex - 1
      handleSectionSelect(nextIndex)
      return
    }

    if (event.key === ' ') {
      event.preventDefault()
      setIsPaused((previous) => !previous)
    }
  }

  if (!activeSection) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-slate-300">
        Waiting for section data...
      </section>
    )
  }

  const selectedMetricId = selectedMetricBySectionId[activeSection.id] ?? null

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="outline-none"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {sections.map((section, index) => {
          const isActive = index === activeIndex
          const buttonClassName = isActive
            ? 'bg-slate-100 text-slate-900'
            : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700/80'

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => handleSectionSelect(index)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${buttonClassName}`}
            >
              {section.title}
            </button>
          )
        })}
      </div>

      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-400 transition-[width] duration-200"
          style={{ width: `${Math.max(2, progressRatio * 100)}%` }}
        />
      </div>

      <SectionPanel
        section={activeSection}
        selectedMetricId={selectedMetricId}
        onMetricSelect={handleMetricSelect}
      />

      <p className="mt-3 text-xs text-slate-500">
        Auto-cycle every {Math.round(rotationMs / 1000)}s. Hover or press space to
        pause. Arrow keys switch sections.
      </p>
    </div>
  )
}
