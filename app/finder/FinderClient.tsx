'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { Bookmark, ChevronLeft, Map, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import FilterPopover from '@/components/FilterPopover'
import AddListingModal from '@/components/AddListingModal'
import PropertyList from '@/components/PropertyList'
import PropertyDetail from '@/components/PropertyDetail'
import AppMenu from '@/components/AppMenu'
import { useAppStore } from '@/lib/store'

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="text-slate-400 text-sm">Loading map…</div>
    </div>
  ),
})

// realtorKey set = read-only Realtor Version: public data, no CMA-I details, no editing tools
function FinderContent({ realtorKey }: { realtorKey?: string }) {
  const readOnly = !!realtorKey
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const initialize = useAppStore((s) => s.initialize)
  const initializeReadOnly = useAppStore((s) => s.initializeReadOnly)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileShowMap, setMobileShowMap] = useState(false)
  const [mobileReturnToMap, setMobileReturnToMap] = useState(false)
  // A shared/bookmarked ?id= whose listing has since been deleted
  const [missingLink, setMissingLink] = useState(false)

  // #section from a copied card link — held until the first listing opens, which then scrolls to it
  const initialSection = useRef('')

  // On mount: load data, then restore selected listing from URL
  useEffect(() => {
    initialSection.current = decodeURIComponent(window.location.hash.slice(1))
    const id = searchParams.get('id')
    const load = realtorKey ? initializeReadOnly(realtorKey) : initialize()
    load.then(() => {
      if (!id) return
      if (useAppStore.getState().saleListings.some((l) => l.id === id)) setSelectedId(id)
      else { setMissingLink(true); router.replace(pathname, { scroll: false }) }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep URL in sync with selected listing
  useEffect(() => {
    if (selectedId) {
      router.replace(`?id=${encodeURIComponent(selectedId)}`, { scroll: false })
    } else {
      router.replace(pathname, { scroll: false })
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

  // Only open the detail panel for a listing that exists (it may be deleted while open)
  const selectedExists = useAppStore((s) => s.saleListings.some((l) => l.id === s.selectedId))
  const showDetail = !!selectedId && selectedExists
  useEffect(() => { if (selectedId) setMissingLink(false) }, [selectedId])
  useEffect(() => {
    if (!missingLink) return
    const t = setTimeout(() => setMissingLink(false), 5000)
    return () => clearTimeout(t)
  }, [missingLink])

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      {/* Top bar */}
      <header className="min-h-14 shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 relative z-30">
        {readOnly ? (
          // Realtor Version: logo + label, click to return to the list
          <button
            onClick={() => { setSelectedId(null); setMobileShowMap(false) }}
            className="flex items-center gap-2.5 focus:outline-none shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static logo */}
            <img src="/cma-logo.png" alt="CMA Investments" className="h-6 w-auto" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 whitespace-nowrap">Realtor Version</span>
          </button>
        ) : (
          <>
            <AppMenu />

            {/* Title — click to reset to list view */}
            <button
              onClick={() => { setSelectedId(null); setMobileShowMap(false) }}
              className="flex items-center gap-2 focus:outline-none shrink-0 group/title"
            >
              <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
                <Map size={15} className="text-sky-500" />
              </div>
              <span className="text-lg font-bold text-slate-900 group-hover/title:text-slate-700 transition-colors">Property Finder</span>
            </button>
          </>
        )}

        {/* Desktop tools */}
        <div className="ml-auto hidden md:flex items-center gap-3 shrink-0">
          {!readOnly && <FilterPopover />}
          {!readOnly && <AddListingModal />}
          {!readOnly && <a
            href="/bookmarklet"
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 px-2.5 text-xs font-medium rounded-md border border-slate-200 text-slate-800 hover:text-slate-900 hover:border-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Bookmark size={13} />
            Bookmarklet
          </a>}
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* Desktop map — always rendered */}
        <div className="hidden md:block flex-1 relative isolate">
          <MapView readOnly={readOnly} />
        </div>

        {/* Mobile full-screen map — only mounted when active, so Leaflet sizes correctly */}
        {mobileShowMap && (
          <div className="md:hidden absolute inset-0 z-20 isolate">
            <MapView readOnly={readOnly} />
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
            <PropertyDetail shareMode={readOnly} takeScrollTarget={() => { const t = initialSection.current; initialSection.current = ''; return t }} onBack={() => {
              setSelectedId(null)
              if (mobileReturnToMap) setMobileShowMap(true)
            }} />
          ) : (
            <PropertyList readOnly={readOnly} onOpenMap={() => setMobileShowMap(true)} />
          )}
        </aside>
      </main>

      {/* Toast: a shared/bookmarked link pointed at a listing that has since been removed */}
      {missingLink && (
        <div role="status" className="fixed bottom-5 inset-x-0 z-[2000] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-red-600 text-white text-sm rounded-xl shadow-lg pl-4 pr-2 py-2.5 flex items-center gap-3 max-w-md">
            <span>That listing is no longer available.</span>
            <button onClick={() => setMissingLink(false)} className="text-red-200 hover:text-white p-1" aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FinderClient({ realtorKey }: { realtorKey?: string }) {
  return (
    <Suspense>
      <FinderContent realtorKey={realtorKey} />
    </Suspense>
  )
}
