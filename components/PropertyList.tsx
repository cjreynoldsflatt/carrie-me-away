'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Trash2, Activity, X, ChevronDown, Star, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import PropertyCard from './PropertyCard'
import AssumptionsPopover from './AssumptionsPopover'
import FilterPopover from './FilterPopover'
import AddListingModal from './AddListingModal'
import { cn } from '@/lib/utils'
import { GRADE_HEX, gradePairKey, compareGradePairs, type Grade } from '@/lib/grades'
import { dataGaps } from '@/lib/data-gaps'
import type { SaleListing } from '@/lib/types'
import type { StatusResult, ListingStatus } from '@/app/api/check-listing-status/route'


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

// readOnly = Realtor Version: no delete, status check, add listing, assumptions or rent editing
export default function PropertyList({ onOpenMap, readOnly = false }: { onOpenMap?: () => void; readOnly?: boolean }) {
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const sortedSaleListings = useAppStore((s) => s.sortedSaleListings)
  const rawSale = useAppStore((s) => s.saleListings)
  const assumptions = useAppStore((s) => s.assumptions)
  const sortBy = useAppStore((s) => s.sortBy)
  const setSortBy = useAppStore((s) => s.setSortBy)

  const gradeFilter = useAppStore((s) => s.gradeFilter)
  const setGradeFilter = useAppStore((s) => s.setGradeFilter)
  const toggleGradeFilter = useAppStore((s) => s.toggleGradeFilter)
  const deleteListings = useAppStore((s) => s.deleteListings)

  const selectMode = useAppStore((s) => s.deleteSelectMode)
  const selectedIds = useAppStore((s) => s.deleteSelectedIds)
  const setDeleteSelectMode = useAppStore((s) => s.setDeleteSelectMode)
  const setSelectedIds = useAppStore((s) => s.setDeleteSelectedIds)
  const toggleSelectId = useAppStore((s) => s.toggleDeleteSelect)

  const [statusChecking, setStatusChecking] = useState(false)
  const [statusResults, setStatusResults] = useState<StatusResult[] | null>(null)

  const statusMap = useMemo<Record<string, string>>(() => {
    if (!statusResults) return {}
    return Object.fromEntries(statusResults.map((r) => [r.id, r.status]))
  }, [statusResults])

  function toggleSelectMode() {
    setDeleteSelectMode(!selectMode)
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return
    if (!confirm(`Delete ${selectedIds.length} propert${selectedIds.length === 1 ? 'y' : 'ies'}? This cannot be undone.`)) return
    await deleteListings(selectedIds)
    setDeleteSelectMode(false)
  }

  async function handleCheckStatus() {
    const withUrls = allListings.filter((l) => l.listingUrl)
    if (withUrls.length === 0) {
      alert('No listings have URLs to check.')
      return
    }
    setStatusChecking(true)
    setStatusResults(null)
    try {
      const res = await fetch('/api/check-listing-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listings: withUrls.map((l) => ({ id: l.id, url: l.listingUrl! })) }),
      })
      const data = await res.json()
      setStatusResults(data.results ?? [])
    } catch {
      alert('Status check failed — try again.')
    } finally {
      setStatusChecking(false)
    }
  }

  async function handleDeleteNonActive() {
    if (!statusResults) return
    const toDelete = statusResults
      .filter((r) => r.status === 'Sold' || r.status === 'Pending' || r.status === 'Off Market')
      .map((r) => r.id)
    if (toDelete.length === 0) return
    if (!confirm(`Delete ${toDelete.length} non-active propert${toDelete.length === 1 ? 'y' : 'ies'}? This cannot be undone.`)) return
    await deleteListings(toDelete)
    setStatusResults(null)
  }

  const whatIfRent = useAppStore((s) => s.whatIfRent)
  const allListings = useMemo(() => sortedSaleListings(), [rawSale, sortedSaleListings, assumptions, sortBy, whatIfRent]) // eslint-disable-line

  const favoritesOnly = useAppStore((s) => s.favoritesOnly)
  const needsDataOnly = useAppStore((s) => s.needsDataOnly && !readOnly)
  const setNeedsDataOnly = useAppStore((s) => s.setNeedsDataOnly)
  const needsDataCount = useMemo(() => readOnly ? 0 : allListings.filter((l) => dataGaps(l).length > 0).length, [allListings, readOnly])
  const setFavoritesOnly = useAppStore((s) => s.setFavoritesOnly)
  const favoriteCount = useMemo(() => allListings.filter((l) => l.isFavorite).length, [allListings])
  const listings = useMemo(
    () => allListings
      .filter((l) => !favoritesOnly || l.isFavorite)
      .filter((l) => !needsDataOnly || dataGaps(l).length > 0)
      .filter((l) => gradeFilter.length === 0 || gradeFilter.includes(gradePairKey(l))),
    [allListings, gradeFilter, favoritesOnly, needsDataOnly],
  )

  // One pill per conservative → realistic grade pair present, counted across ALL listings
  const gradePills = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of allListings) {
      const k = gradePairKey(l)
      counts[k] = (counts[k] ?? 0) + 1
    }
    return Object.keys(counts).sort(compareGradePairs).map((key) => ({ key, count: counts[key] }))
  }, [allListings])

  // Drop filters that no longer match anything (e.g. after deleting every listing in a grade
  // or unstarring the last favorite) so the list doesn't get stuck at "0 Properties"
  const allLoaded = allListings.length > 0
  const staleGrades = gradeFilter.filter((k) => !gradePills.some((p) => p.key === k))
  useEffect(() => {
    if (!allLoaded) return
    if (staleGrades.length > 0) setGradeFilter(gradeFilter.filter((k) => !staleGrades.includes(k)))
    if (favoritesOnly && favoriteCount === 0) setFavoritesOnly(false)
    if (needsDataOnly && needsDataCount === 0) setNeedsDataOnly(false)
  }, [allLoaded, staleGrades.join('|'), favoritesOnly, favoriteCount, needsDataOnly, needsDataCount]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full flex-1 min-h-0">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-200 bg-white">
        {/* Row 1: count (left) + sort (right) */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-700">
            {listings.length} {listings.length === 1 ? 'Property' : 'Properties'}
          </div>
          {/* Native select with a custom chevron (the browser arrow sat flush against the edge) */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as import('@/lib/types').SortOption)}
              className="appearance-none h-8 text-xs font-medium border border-slate-200 rounded-md pl-3 pr-8 text-slate-700 bg-white outline-none hover:border-slate-300 focus:ring-1 focus:ring-blue-400 cursor-pointer"
              aria-label="Sort properties"
            >
              <option value="best">Best</option>
              <option value="worst">Worst</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Row 2 (mobile): filter + add + assumptions */}
        <div className="flex md:hidden items-center gap-1.5 mt-2">
          {!readOnly && (
          <button
            onClick={toggleSelectMode}
            title={selectMode ? 'Exit select mode' : 'Select to delete'}
            className={cn(
              'w-8 h-8 rounded-md flex items-center justify-center border transition-colors shrink-0',
              selectMode
                ? 'bg-red-50 border-red-300 text-red-600'
                : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700',
            )}
          >
            <Trash2 size={14} />
          </button>
          )}
          {!readOnly && (
          <button
            onClick={handleCheckStatus}
            disabled={statusChecking}
            title="Check if any listings went pending or sold"
            className={cn(
              'w-8 h-8 rounded-md flex items-center justify-center border transition-colors shrink-0',
              statusChecking
                ? 'bg-violet-50 border-violet-300 text-violet-400 animate-pulse'
                : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700',
            )}
          >
            <Activity size={14} />
          </button>
          )}
          {!readOnly && <FilterPopover />}
          {!readOnly && <AddListingModal />}
          {!readOnly && <AssumptionsPopover />}
        </div>

        {/* Desktop action buttons (hidden on mobile, shown inline) */}
        <div className="hidden md:flex items-center gap-1.5 mt-2">
          {!readOnly && <AssumptionsPopover />}
          {!readOnly && (
          <button
            onClick={toggleSelectMode}
            title={selectMode ? 'Exit select mode' : 'Select to delete'}
            className={cn(
              'w-8 h-8 rounded-md flex items-center justify-center border transition-colors shrink-0',
              selectMode
                ? 'bg-red-50 border-red-300 text-red-600'
                : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700',
            )}
          >
            <Trash2 size={14} />
          </button>
          )}
          {!readOnly && (
          <button
            onClick={handleCheckStatus}
            disabled={statusChecking}
            title="Check if any listings went pending or sold"
            className={cn(
              'w-8 h-8 rounded-md flex items-center justify-center border transition-colors shrink-0',
              statusChecking
                ? 'bg-violet-50 border-violet-300 text-violet-400 animate-pulse'
                : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700',
            )}
          >
            <Activity size={14} />
          </button>
          )}
        </div>
      </div>

      {selectMode && (
        <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-red-800 whitespace-nowrap">
              {selectedIds.length === 0 ? 'Select to delete' : `${selectedIds.length} selected`}
            </div>
            <div className="text-[11px] text-red-600/80 leading-snug whitespace-nowrap" title="On the map, hold Shift and drag to select every pin in an area">Tap cards or map pins</div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setSelectedIds(selectedIds.length === listings.length ? [] : listings.map((l) => l.id))}
              className="text-xs font-medium px-2.5 py-1 rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-100 whitespace-nowrap"
            >
              {selectedIds.length === listings.length ? 'Deselect all' : 'Select all'}
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0}
              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600 whitespace-nowrap"
            >
              Delete{selectedIds.length > 0 ? ` ${selectedIds.length}` : ''}
            </button>
            <button onClick={toggleSelectMode} className="text-xs font-medium px-1.5 py-1 text-red-700 hover:text-red-900 whitespace-nowrap">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status check results */}
      {statusResults && (() => {
        const changed = statusResults.filter((r) => r.status !== 'Active' && r.status !== 'Unknown')
        const skipped = statusResults.filter((r) => r.status === 'Unknown').length
        const statusColor: Record<ListingStatus, string> = {
          Sold: 'text-red-600 font-semibold',
          Pending: 'text-orange-600 font-semibold',
          'Off Market': 'text-slate-500 font-semibold',
          Active: 'text-emerald-600',
          Unknown: 'text-slate-400',
        }
        return (
          <div className="px-4 py-3 bg-violet-50 border-b border-violet-100 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-violet-800">
                Status check — {allListings.filter((l) => l.listingUrl).length} listings checked
              </span>
              <button onClick={() => setStatusResults(null)} className="text-violet-400 hover:text-violet-600">
                <X size={14} />
              </button>
            </div>
            {changed.length === 0 ? (
              <p className="text-violet-700">
                All listings appear active.{skipped > 0 ? ` (${skipped} could not be checked)` : ''}
              </p>
            ) : (
              <div className="space-y-1">
                {changed.map((r) => {
                  const listing = allListings.find((l) => l.id === r.id)
                  return (
                    <div key={r.id} className="flex items-center gap-1.5">
                      <span className={statusColor[r.status]}>{r.status}</span>
                      <span className="text-slate-500">—</span>
                      <span className="text-slate-700">{listing?.address ?? r.id}</span>
                    </div>
                  )
                })}
                {skipped > 0 && (
                  <p className="text-slate-400 mt-1">{skipped} listing{skipped > 1 ? 's' : ''} could not be checked (site blocked or no URL).</p>
                )}
                <button
                  onClick={handleDeleteNonActive}
                  className="mt-2 text-red-600 font-semibold hover:text-red-800"
                >
                  Delete all non-active ({changed.length})
                </button>
              </div>
            )}
          </div>
        )
      })()}

      {/* Grade filter bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 bg-white overflow-x-auto">
        {favoriteCount > 0 && (
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={cn(
              'shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap',
              favoritesOnly ? 'bg-amber-400 text-white border-amber-400' : 'border-slate-200 text-slate-600 hover:border-slate-300',
            )}
            title="Show only starred properties"
          >
            <Star size={12} fill="currentColor" className={favoritesOnly ? '' : 'text-amber-400'} />
            Favorites
            <span className={cn('text-[10px]', favoritesOnly ? 'opacity-80' : 'text-slate-400')}>{favoriteCount}</span>
          </button>
        )}
        <button
          onClick={() => { setGradeFilter([]); setFavoritesOnly(false); setNeedsDataOnly(false); setSortBy('best') }}
          className={cn(
            'shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors',
            gradeFilter.length === 0 && !favoritesOnly && !needsDataOnly
              ? 'bg-slate-800 text-white border-slate-800'
              : 'border-slate-200 text-slate-500 hover:border-slate-300',
          )}
        >
          All
        </button>
        {gradePills.map(({ key, count }) => {
          const active = gradeFilter.includes(key)
          const [cons, real = cons] = key.split('→') as Grade[]
          return (
            <button
              key={key}
              onClick={() => { toggleGradeFilter(key); setSortBy('yield') }}
              title={cons === real ? `Grade ${cons} in both scenarios` : `Conservative ${cons} → realistic ${real}`}
              style={active ? { backgroundImage: `linear-gradient(90deg, ${GRADE_HEX[cons]}, ${GRADE_HEX[real]})` } : undefined}
              className={cn(
                'shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all whitespace-nowrap',
                active
                  ? 'text-white border-transparent ring-2 ring-slate-300'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300',
              )}
            >
              {cons === real ? cons : `${cons} → ${real}`}
              <span className={cn('text-[10px]', active ? 'opacity-80' : 'text-slate-400')}>{count}</span>
            </button>
          )
        })}
        {!readOnly && needsDataCount > 0 && (
          <button
            onClick={() => setNeedsDataOnly(!needsDataOnly)}
            className={cn(
              'shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap',
              needsDataOnly ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-200 text-amber-800 bg-amber-50 hover:border-amber-300',
            )}
            title="Properties that need rent comps or listing details — collect them with the bookmarklet"
          >
            <AlertTriangle size={12} />
            Needs data
            <span className={cn('text-[10px]', needsDataOnly ? 'opacity-80' : 'text-amber-600')}>{needsDataCount}</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
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
                readOnly={readOnly}
                key={listing.id}
                listing={listing}
                selected={listing.id === selectedId}
                selectMode={selectMode}
                selectSelected={selectedIds.includes(listing.id)}
                listingStatus={statusMap[listing.id]}
                onClick={() => {
                  if (selectMode) {
                    toggleSelectId(listing.id)
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
