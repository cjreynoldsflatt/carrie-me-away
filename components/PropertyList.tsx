'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { GitCompare, MapPin } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import PropertyCard from './PropertyCard'
import AssumptionsPopover from './AssumptionsPopover'
import FilterPopover from './FilterPopover'
import AddListingModal from './AddListingModal'
import { cn } from '@/lib/utils'
import type { SaleListing } from '@/lib/types'

const MiniMapView = dynamic(() => import('@/components/map/MiniMapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100" />,
})

function MiniMapStrip({ listings, onOpenMap }: { listings: SaleListing[]; onOpenMap: () => void }) {
  if (listings.length === 0) return null

  return (
    <div
      className="md:hidden w-full relative border-b border-slate-200 overflow-hidden cursor-pointer isolate"
      style={{ height: 140 }}
      onClick={onOpenMap}
    >
      <MiniMapView listings={listings} onClick={onOpenMap} />

      {/* "View on map" label — z-[800] to paint above Leaflet's panes */}
      <div className="absolute inset-0 z-[800] flex items-center justify-center pointer-events-none">
        <div className="bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm border border-slate-200/80">
          <MapPin size={12} className="text-slate-600" />
          <span className="text-xs font-semibold text-slate-700">View on map</span>
        </div>
      </div>

    </div>
  )
}

export default function PropertyList({ onOpenMap }: { onOpenMap?: () => void }) {
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const sortedSaleListings = useAppStore((s) => s.sortedSaleListings)
  const compareMode = useAppStore((s) => s.compareMode)
  const setCompareMode = useAppStore((s) => s.setCompareMode)
  const compareIds = useAppStore((s) => s.compareIds)
  const toggleCompare = useAppStore((s) => s.toggleCompare)
  const rawSale = useAppStore((s) => s.saleListings)
  const assumptions = useAppStore((s) => s.assumptions)
  const sortBy = useAppStore((s) => s.sortBy)
  const setSortBy = useAppStore((s) => s.setSortBy)

  const listings = useMemo(() => sortedSaleListings(), [rawSale, sortedSaleListings, assumptions, sortBy]) // eslint-disable-line

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-200 bg-white">
        {/* Row 1: count (left) + sort (right) */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-700">
            {listings.length} {listings.length === 1 ? 'Property' : 'Properties'}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as import('@/lib/types').SortOption)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="best">Best</option>
            <option value="worst">Worst</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
          </select>
        </div>

        {/* Row 2 (mobile): compare + filter + add + assumptions */}
        <div className="flex md:hidden items-center gap-1.5 mt-2">
          <button
            onClick={() => setCompareMode(!compareMode)}
            title={compareMode ? 'Exit compare mode' : 'Compare properties'}
            className={cn(
              'w-8 h-8 rounded-md flex items-center justify-center border transition-colors shrink-0',
              compareMode
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700',
            )}
          >
            <GitCompare size={14} />
          </button>
          {compareMode && compareIds.length > 0 && (
            <span className="text-xs text-blue-600 font-medium shrink-0">{compareIds.length}/3</span>
          )}
          <FilterPopover />
          <AddListingModal />
          <AssumptionsPopover />
        </div>

        {/* Desktop action buttons (hidden on mobile, shown inline) */}
        <div className="hidden md:flex items-center gap-1.5 mt-2">
          <AssumptionsPopover />
          <button
            onClick={() => setCompareMode(!compareMode)}
            title={compareMode ? 'Exit compare mode' : 'Compare properties'}
            className={cn(
              'w-8 h-8 rounded-md flex items-center justify-center border transition-colors shrink-0',
              compareMode
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700',
            )}
          >
            <GitCompare size={14} />
          </button>
          {compareMode && compareIds.length > 0 && (
            <span className="text-xs text-blue-600 font-medium shrink-0">{compareIds.length}/3</span>
          )}
        </div>
      </div>

      {compareMode && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
          Select 2–3 properties to compare.{' '}
          {compareIds.length >= 2 && (
            <span className="font-medium">Switch to Compare panel to view side-by-side.</span>
          )}
        </div>
      )}

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Mini map strip — inside scroll so it scrolls away */}
        {onOpenMap && <MiniMapStrip listings={listings} onOpenMap={onOpenMap} />}

        <div className="p-3 space-y-3">
          {listings.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-sm">No properties found</p>
              <p className="text-xs mt-1">Try expanding the radius or adjusting filters</p>
            </div>
          ) : (
            listings.map((listing) => (
              <PropertyCard
                key={listing.id}
                listing={listing}
                selected={listing.id === selectedId}
                compareMode={compareMode}
                compareSelected={compareIds.includes(listing.id)}
                onClick={() => {
                  if (compareMode) {
                    toggleCompare(listing.id)
                  } else {
                    setSelectedId(listing.id === selectedId ? null : listing.id)
                  }
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
