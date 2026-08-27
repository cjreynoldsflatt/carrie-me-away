'use client'

import { useEffect, useState, Suspense } from 'react'
import { Bookmark, ChevronLeft, Map } from 'lucide-react'
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

function FinderContent() {
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const compareMode = useAppStore((s) => s.compareMode)
  const compareIds = useAppStore((s) => s.compareIds)
  const initialize = useAppStore((s) => s.initialize)
  const setCompareMode = useAppStore((s) => s.setCompareMode)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mobileShowMap, setMobileShowMap] = useState(false)
  const [mobileReturnToMap, setMobileReturnToMap] = useState(false)

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
      router.replace('/finder', { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // Close mobile map when a listing is selected; remember to return to map on back
  useEffect(() => {
    if (selectedId) {
      setMobileReturnToMap(mobileShowMap)
      setMobileShowMap(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const showDetail = !!selectedId && !compareMode
  const showCompare = compareMode && compareIds.length >= 2

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header className="min-h-14 shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 z-10">
        {/* Back to home */}
        <Link href="/" className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors">
          <ChevronLeft size={20} />
        </Link>

        {/* Title — click to reset to list view */}
        <button
          onClick={() => { setSelectedId(null); setCompareMode(false); setMobileShowMap(false) }}
          className="flex items-center gap-2 focus:outline-none shrink-0 group/title"
        >
          <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
            <Map size={15} className="text-sky-500" />
          </div>
          <span className="text-lg font-bold text-slate-900 group-hover/title:text-slate-700 transition-colors">Property Finder</span>
        </button>

        {/* Desktop tools */}
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
      </header>

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* Desktop map — always rendered */}
        <div className="hidden md:block flex-1 relative isolate">
          <MapView />
        </div>

        {/* Mobile full-screen map — only mounted when active, so Leaflet sizes correctly */}
        {mobileShowMap && (
          <div className="md:hidden absolute inset-0 z-20 isolate">
            <MapView />
            <button
              onClick={() => setMobileShowMap(false)}
              className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm shadow-md rounded-full pl-2.5 pr-3.5 py-2 text-sm font-semibold text-slate-700 flex items-center gap-1.5 border border-slate-200"
            >
              <ChevronLeft size={14} />
              List
            </button>
          </div>
        )}

        {/* Right panel — full width on mobile, fixed 420px on desktop */}
        <aside className="w-full md:w-[420px] shrink-0 md:border-l border-slate-200 bg-slate-50 flex flex-col overflow-hidden isolate z-0">
          {showDetail ? (
            <PropertyDetail onBack={() => {
              setSelectedId(null)
              if (mobileReturnToMap) setMobileShowMap(true)
            }} />
          ) : showCompare ? (
            <ComparePanel />
          ) : (
            <PropertyList onOpenMap={() => setMobileShowMap(true)} />
          )}
        </aside>
      </main>
    </div>
  )
}

export default function FinderPage() {
  return (
    <Suspense>
      <FinderContent />
    </Suspense>
  )
}
