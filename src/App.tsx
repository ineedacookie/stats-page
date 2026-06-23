import { SECTION_ROTATION_MS } from './config/sections'
import { SectionCarousel } from './components/SectionCarousel'
import { SpuriousCorrelationWidget } from './components/SpuriousCorrelationWidget'
import { useLiveStats } from './hooks/useLiveStats'

function App() {
  const { data, error, isLoading } = useLiveStats()

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="flex h-full w-full flex-col">
        {isLoading && !data ? (
          <section className="flex h-full items-center justify-center border border-slate-800 bg-slate-900/60 text-slate-300">
            Loading live statistics...
          </section>
        ) : (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {error ? (
              <p className="shrink-0 border-b border-rose-400/40 bg-rose-500/10 px-4 py-2 text-base text-rose-200">
                API error: {error}
              </p>
            ) : null}
            <div className="h-[22vh] min-h-[150px] max-h-[210px] shrink-0 border-b border-slate-800">
              <div className="h-full p-2">
                <SectionCarousel
                  sections={data?.sections ?? []}
                  rotationMs={SECTION_ROTATION_MS}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <SpuriousCorrelationWidget
                data={data?.spurious ?? null}
                className="h-full rounded-none border-0 p-2 ring-0"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default App
