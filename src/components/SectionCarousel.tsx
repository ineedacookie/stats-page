import { useEffect, useMemo, useRef, useState } from 'react'

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
  }, [sections])

  useEffect(() => {
    setActiveIndex((previousIndex) => {
      if (sections.length === 0) {
        return 0
      }

      return Math.min(previousIndex, sections.length - 1)
    })
    setProgressRatio(0)
    lastSwitchAtRef.current = Date.now()
  }, [sections.length])

  useEffect(() => {
    if (sections.length <= 1) {
      setProgressRatio(0)
      return
    }

    let animationFrameId: number | null = null

    const tick = () => {
      const elapsed = Date.now() - lastSwitchAtRef.current

      if (elapsed >= rotationMs) {
        lastSwitchAtRef.current = Date.now()
        setActiveIndex((previousIndex) => (previousIndex + 1) % sections.length)
        setProgressRatio(0)
      } else {
        setProgressRatio(Math.min(1, elapsed / rotationMs))
      }

      animationFrameId = window.requestAnimationFrame(tick)
    }

    animationFrameId = window.requestAnimationFrame(tick)

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [rotationMs, sections.length])

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
      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
        <div
          className="h-full w-full origin-left rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-400 will-change-transform"
          style={{ transform: `scaleX(${Math.max(0, progressRatio)})` }}
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
