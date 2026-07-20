import { useEffect, useMemo, useState } from 'react'

import type { DashboardSection } from '../types/stats'
import { SectionPanel } from './SectionPanel'

interface SectionCarouselProps {
  sections: DashboardSection[]
  rotationMs: number
  rotationStep: number
}

export const SectionCarousel = ({
  sections,
  rotationMs,
  rotationStep,
}: SectionCarouselProps) => {
  const [selectedMetricBySectionId, setSelectedMetricBySectionId] = useState<
    Record<string, string>
  >({})

  useEffect(() => {
    setSelectedMetricBySectionId((previous) => {
      const next: Record<string, string> = {}
      for (const section of sections) {
        if (section.metrics.length === 0) {
          continue
        }

        const previousMetricId = previous[section.id]
        const previousMetricStillExists = section.metrics.some(
          (metric) => metric.id === previousMetricId,
        )
        next[section.id] = previousMetricStillExists && previousMetricId
          ? previousMetricId
          : section.metrics[0].id
      }

      const previousKeys = Object.keys(previous)
      const nextKeys = Object.keys(next)
      if (
        previousKeys.length === nextKeys.length &&
        nextKeys.every((sectionId) => previous[sectionId] === next[sectionId])
      ) {
        return previous
      }

      return next
    })
  }, [sections])

  const activeIndex = useMemo(() => {
    if (sections.length === 0) {
      return 0
    }

    return rotationStep % sections.length
  }, [rotationStep, sections.length])

  const activeSection = useMemo(
    () => sections[activeIndex] ?? null,
    [activeIndex, sections],
  )

  const handleMetricSelect = (metricId: string): void => {
    if (!activeSection) {
      return
    }

    setSelectedMetricBySectionId((previous) => ({
      ...previous,
      [activeSection.id]: metricId,
    }))
  }

  if (!activeSection) {
    return (
      <section className="h-full rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-slate-300">
        Waiting for section data...
      </section>
    )
  }

  const selectedMetricId = selectedMetricBySectionId[activeSection.id] ?? null
  const shouldAnimateProgress = sections.length > 1

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl">
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
        <div
          key={`${activeSection.id}-${rotationStep}`}
          className={`h-full w-full rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-400 ${
            shouldAnimateProgress ? 'carousel-progress-fill' : ''
          }`}
          style={
            shouldAnimateProgress
              ? { animationDuration: `${rotationMs}ms` }
              : { transform: 'scaleX(1)' }
          }
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div key={activeSection.id} className="h-full rotate-slide-in-right">
          <SectionPanel
            section={activeSection}
            selectedMetricId={selectedMetricId}
            onMetricSelect={handleMetricSelect}
          />
        </div>
      </div>
    </div>
  )
}
