import { useEffect, useMemo, useState } from 'react'

import type { DashboardSection } from '../types/stats'
import { SectionPanel } from './SectionPanel'

interface SectionCarouselProps {
  sections: DashboardSection[]
  rotationMs: number
  rotationAnchorMs: number
  clockMs: number
}

export const SectionCarousel = ({
  sections,
  rotationMs,
  rotationAnchorMs,
  clockMs,
}: SectionCarouselProps) => {
  const [selectedMetricBySectionId, setSelectedMetricBySectionId] = useState<
    Record<string, string>
  >({})

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
  }, [sections])

  const rotationElapsedMs = Math.max(0, clockMs - rotationAnchorMs)

  const activeIndex = useMemo(() => {
    if (sections.length === 0) {
      return 0
    }

    return Math.floor(rotationElapsedMs / rotationMs) % sections.length
  }, [rotationElapsedMs, rotationMs, sections.length])

  const progressRatio = useMemo(() => {
    if (sections.length <= 1) {
      return 0
    }

    return (rotationElapsedMs % rotationMs) / rotationMs
  }, [rotationElapsedMs, rotationMs, sections.length])

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

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl">
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
        <div
          className="h-full w-full origin-left rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-400 will-change-transform"
          style={{ transform: `scaleX(${progressRatio})` }}
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
