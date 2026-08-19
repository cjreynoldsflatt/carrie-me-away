'use client'

import { useEffect, Suspense } from 'react'
import { Bookmark } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import FilterPopover from '@/components/FilterPopover'
import AddListingModal from '@/components/AddListingModal'
import PropertyList from '@/components/PropertyList'
import PropertyDetail from '@/components/PropertyDetail'
import ComparePanel from '@/components/ComparePanel'
import { useAppStore } from '@/lib/store'

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="text-slate-400 text-sm">Loading map…</div>
    </div>
  ),
})

function HomeContent() {
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const compareMode = useAppStore((s) => s.compareMode)
  const compareIds = useAppStore((s) => s.compareIds)
  const initialize = useAppStore((s) => s.initialize)
  const setCompareMode = useAppStore((s) => s.setCompareMode)
  const router = useRouter()
  const searchParams = useSearchParams()

  // On mount: load data, then restore selected listing from URL
  useEffect(() => {
    const id = searchParams.get('id')
    initialize().then(() => { if (id) setSelectedId(id) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep URL in sync with selected listing
  useEffect(() => {
    if (selectedId) {
      router.replace(`?id=${encodeURIComponent(selectedId)}`, { scroll: false })
    } else {
      router.replace('/', { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const showDetail = !!selectedId && !compareMode
  const showCompare = compareMode && compareIds.length >= 2

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header className="min-h-14 shrink-0 bg-white border-b border-slate-200 px-5 py-2 flex items-center gap-4 z-10">
        {/* Logo — click to reset to list view */}
        <button
          onClick={() => { setSelectedId(null); setCompareMode(false) }}
          className="shrink-0 focus:outline-none"
        >
          <img src="/cma-logo.png" alt="Carrie Me Away" className="h-7 w-auto" />
        </button>

        {/* Desktop-only tools */}
        <div className="ml-auto hidden md:flex items-center gap-3 shrink-0">
          <FilterPopover />
          <AddListingModal />
          <a
            href="/bookmarklet"
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 px-2.5 text-xs font-medium rounded-md border border-slate-200 text-slate-800 hover:text-slate-900 hover:border-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Bookmark size={13} />
            Bookmarklet
          </a>
        </div>

        {/* About button — always visible, far right */}
        <Link
          href="/about"
          className="ml-auto md:ml-3 shrink-0 h-7 px-2.5 text-xs font-medium rounded-md border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 flex items-center transition-colors"
        >
          About
        </Link>
      </header>

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Map — hidden on mobile. isolate keeps Leaflet's z-indices contained. */}
        <div className="hidden md:block flex-1 relative isolate">
          <MapView />
        </div>

        {/* Right panel — full width on mobile, fixed 420px on desktop */}
        <aside className="w-full md:w-[420px] shrink-0 md:border-l border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
          {showDetail ? (
            <PropertyDetail />
          ) : showCompare ? (
            <ComparePanel />
          ) : (
            <PropertyList />
          )}
        </aside>
      </main>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}
