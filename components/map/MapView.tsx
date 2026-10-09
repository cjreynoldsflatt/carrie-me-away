'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, CircleMarker, GeoJSON, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAppStore } from '@/lib/store'
import { fmtPrice, fmtRent, fmtYield } from '@/lib/format'
import { HOME } from '@/lib/config'
import type { SaleListing } from '@/lib/types'
import { MIN_COMPS, MAX_COMP_AGE_DAYS, isFreshComp, rentalRedfinUrl } from '@/lib/rent-comps'
import { REGULATED_AREAS } from '@/lib/regulated-areas'
import { gradePairKey } from '@/lib/grades'
import { dataGaps } from '@/lib/data-gaps'

// ── Home marker ───────────────────────────────────────────────────────────────
const homeIcon = L.divIcon({
  html: `<div style="
    background:#1e3a5f;border:3px solid #fff;
    color:#fff;border-radius:50%;width:34px;height:34px;
    display:flex;align-items:center;justify-content:center;
    font-size:16px;box-shadow:0 3px 10px rgba(0,0,0,.4);
  ">🏠</div>`,
  className: '',
  iconAnchor: [17, 17],
  iconSize: [34, 34],
})

// ── Auto-fit map to listings ──────────────────────────────────────────────────
// Only re-fits when the set of listing IDs changes (new listing, filter change),
// NOT when assumption edits change computed values on the same listings.
// includeHome: frame the owner's home too (off in the Realtor Version so it isn't revealed)
function FitBounds({ listings, includeHome = true }: { listings: SaleListing[]; includeHome?: boolean }) {
  const map = useMap()
  const fittedKeyRef = useRef('')
  useEffect(() => {
    if (listings.length === 0) return
    const key = listings.map((l) => l.id).join(',')
    if (key === fittedKeyRef.current) return
    fittedKeyRef.current = key
    const points: [number, number][] = [...listings.map((l): [number, number] => [l.lat, l.lng]), ...(includeHome ? [[HOME.lat, HOME.lng] as [number, number]] : [])]
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 })
  }, [listings, map, includeHome])
  return null
}

// ── Center map on selected listing, or fit-all when deselected ───────────────
// listings kept in a ref so the effect only re-runs on selectedId changes,
// not on assumption edits that recompute the same listings.
function CenterOnSelected({ listings, selectedId, includeHome = true }: { listings: SaleListing[]; selectedId: string | null; includeHome?: boolean }) {
  const map = useMap()
  const prevId = useRef<string | null>(null)
  const listingsRef = useRef(listings)
  listingsRef.current = listings
  useEffect(() => {
    const wasSelected = prevId.current !== null
    prevId.current = selectedId
    if (!selectedId) {
      if (wasSelected && listingsRef.current.length > 0) {
        const ls = listingsRef.current
        if (ls.length === 1) {
          map.setView([ls[0].lat, ls[0].lng], 13, { animate: true })
        } else {
          const points: [number, number][] = [...ls.map((l): [number, number] => [l.lat, l.lng]), ...(includeHome ? [[HOME.lat, HOME.lng] as [number, number]] : [])]
          map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 14 })
        }
      }
      return
    }
    const listing = listingsRef.current.find((l) => l.id === selectedId)
    if (listing) map.setView([listing.lat, listing.lng], Math.max(map.getZoom(), 14), { animate: true })
  }, [selectedId, map, includeHome])
  return null
}

// ── Colored pin marker ────────────────────────────────────────────────────────
const gradeHex = (s: number) =>
  s >= 97 ? '#047857' : s >= 88 ? '#16a34a' : s >= 76 ? '#1d4ed8' : s >= 60 ? '#3b82f6' : s >= 40 ? '#f97316' : '#dc2626'

// Compact yearly amount for pins, e.g. "$15.9K/yr"
function fmtAnnualK(n: number) {
  const k = Math.abs(n) / 1000
  return `${n < 0 ? '−' : ''}$${k >= 100 ? Math.round(k) : k.toFixed(1)}K/yr`
}

function makeIcon(listing: SaleListing, selected: boolean, deleteSelected = false, showFavorite = true) {
  // White bubble (price, conservative net income, yield range); header strip fades from the conservative to the realistic grade color
  // and reads "B+ → A" (single letter when both grades match)
  const consScore = listing.investmentScore
  const realScore = listing.realisticScore ?? consScore
  const cons = gradeHex(consScore)
  const real = gradeHex(realScore)
  const grades = scoreToGrade(consScore) === scoreToGrade(realScore)
    ? scoreToGrade(consScore)
    : `${scoreToGrade(consScore)} → ${scoreToGrade(realScore)}`
  const yieldText = listing.realisticNetCashYield != null && Math.abs(listing.realisticNetCashYield - listing.netCashYield) >= 0.0005
    ? `${fmtYield(listing.netCashYield)}–${fmtYield(listing.realisticNetCashYield)}`
    : fmtYield(listing.netCashYield)

  // Yellow ring = open in detail panel; red ring = picked for multi-delete
  const shadow = deleteSelected
    ? '0 0 0 3px #dc2626, 0 4px 16px rgba(0,0,0,.45)'
    : selected
      ? '0 0 0 3px #facc15, 0 4px 16px rgba(0,0,0,.45)'
      : '0 3px 10px rgba(0,0,0,.35)'

  // Fixed-size box with content bottom-centered, so the pointer tip always sits on the
  // anchor no matter how wide the bubble's text is
  const W = 160, H = 100
  const html = `
    <div style="width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;pointer-events:none">
      <div style="position:relative;pointer-events:auto">
      ${showFavorite && listing.isFavorite ? `<div title="Favorite" style="position:absolute;top:-8px;right:-8px;z-index:2;width:20px;height:20px;border-radius:50%;background:#fbbf24;border:2px solid #fff;color:#fff;font-size:11px;line-height:16px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.3)">★</div>` : ''}
      <div style="
        pointer-events:auto;
        background:#fff;color:#0f172a;border-radius:10px;overflow:hidden;text-align:center;
        font-family:system-ui,sans-serif;white-space:nowrap;box-shadow:${shadow};
        transform:${selected ? 'scale(1.15)' : 'scale(1)'};
        transform-origin:bottom center;letter-spacing:-0.3px;
      ">
        <div style="background:linear-gradient(90deg, ${cons}, ${real});color:#fff;font-size:11px;font-weight:800;padding:2px 10px;text-shadow:0 1px 1px rgba(0,0,0,.25)">${deleteSelected ? '✓ ' : ''}${grades}</div>
        <div style="padding:6px 12px 9px">
          <div style="font-size:13px;font-weight:800">${fmtPrice(listing.price)}</div>
          <div style="font-weight:600;font-size:11px;margin-top:2px;color:${listing.netAnnualIncome >= 0 ? '#047857' : '#dc2626'}">${fmtAnnualK(listing.netAnnualIncome)}</div>
          <div style="font-weight:600;font-size:11px;margin-top:1px;color:#475569">${yieldText}</div>
        </div>
      </div>
      </div>
      <div style="
        width:0;height:0;
        border-left:7px solid transparent;border-right:7px solid transparent;
        border-top:8px solid #fff;
        filter:drop-shadow(0 2px 1px rgba(0,0,0,.2));
      "></div>
    </div>`

  return L.divIcon({ html, className: '', iconAnchor: [W / 2, H], iconSize: [W, H] })
}

// ── Shift-drag box select (multi-delete mode) ───────────────────────────────
// Replaces Leaflet's shift-drag box zoom while select mode is on; adds every pin inside the box.
function BoxSelect({ listings, enabled, onSelect }: {
  listings: SaleListing[]; enabled: boolean; onSelect: (ids: string[]) => void
}) {
  const map = useMap()
  useEffect(() => {
    if (!enabled) return
    map.boxZoom.disable()
    let start: L.LatLng | null = null
    let rect: L.Rectangle | null = null
    const onDown = (e: L.LeafletMouseEvent) => {
      if (!e.originalEvent.shiftKey) return
      start = e.latlng
      map.dragging.disable()
      rect = L.rectangle(L.latLngBounds(start, start), { color: '#dc2626', weight: 1.5, fillOpacity: 0.08, dashArray: '4 3' }).addTo(map)
    }
    const onMove = (e: L.LeafletMouseEvent) => {
      if (start && rect) rect.setBounds(L.latLngBounds(start, e.latlng))
    }
    const onUp = () => {
      if (!start || !rect) return
      const bounds = rect.getBounds()
      onSelect(listings.filter((l) => bounds.contains([l.lat, l.lng])).map((l) => l.id))
      rect.remove()
      rect = null
      start = null
      map.dragging.enable()
    }
    map.on('mousedown', onDown)
    map.on('mousemove', onMove)
    map.on('mouseup', onUp)
    return () => {
      map.off('mousedown', onDown)
      map.off('mousemove', onMove)
      map.off('mouseup', onUp)
      rect?.remove()
      map.dragging.enable()
      map.boxZoom.enable()
    }
  }, [map, enabled, listings, onSelect])
  return null
}

// ── Rental regulation areas overlay ──────────────────────────────────────────
function RentalRulesOverlay() {
  return (
    <>
      {REGULATED_AREAS.map((area) => (
        <GeoJSON
          key={area.id}
          data={area.geometry}
          style={{ color: '#9333ea', weight: 2, dashArray: '6 4', fillColor: '#9333ea', fillOpacity: 0.06 }}
        >
          <Popup>
            <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, lineHeight: 1.45, maxWidth: 260 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{area.name}</div>
              <ul style={{ margin: '0 0 6px', paddingLeft: 16 }}>
                {area.summary.map((s) => <li key={s}>{s}</li>)}
              </ul>
              <a href={area.url} target="_blank" rel="noopener noreferrer">Read the ordinance →</a>
            </div>
          </Popup>
        </GeoJSON>
      ))}
    </>
  )
}

// ── Rent comp coverage overlay ───────────────────────────────────────────────
const COMP_RADIUS_M = 2414  // 1.5 mi — first search radius in lib/rent-comps
const REDFIN_TYPE: Record<string, string> = { Townhouse: 'townhouse', 'Single Family': 'house', Condo: 'condo' }

function coverageColor(count: number) {
  if (count >= 5) return '#059669'          // solid
  if (count >= MIN_COMPS) return '#f59e0b'  // thin — enough to use, worth adding more
  return '#dc2626'                          // not enough — falling back to HUD
}

function CompCoverage({ listings }: { listings: SaleListing[] }) {
  const rentals = useAppStore((s) => s.rentalListings)
  return (
    <>
      {listings.filter((l) => l.propertyType !== 'Multi Family').map((l) => {
        const count = l.rentCompCount ?? 0
        const color = coverageColor(count)
        const zip = l.city.match(/\b\d{5}\b/g)?.pop()
        const type = REDFIN_TYPE[l.propertyType]
        const redfinUrl = zip && type ? `https://www.redfin.com/zipcode/${zip}/rentals/filter/property-type=${type}` : null
        return (
          <Circle
            key={`cov-${l.id}`}
            center={[l.lat, l.lng]}
            radius={COMP_RADIUS_M}
            pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity: 0.12 }}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, lineHeight: 1.4 }}>
                <div style={{ fontWeight: 700 }}>{l.address}</div>
                <div>
                  {count} matching comp{count === 1 ? '' : 's'} ({l.beds}bd {l.propertyType.toLowerCase()}) ·{' '}
                  {count >= MIN_COMPS ? 'using comps' : `needs ${MIN_COMPS} — using HUD`}
                </div>
                {redfinUrl && (
                  <a href={redfinUrl} target="_blank" rel="noopener noreferrer">
                    Find {type} rentals in {zip} on Redfin →
                  </a>
                )}
              </div>
            </Popup>
          </Circle>
        )
      })}
      {rentals.map((r) => {
        // Expired comps (not seen on Redfin recently) stay visible in gray but don't count
        const fresh = isFreshComp(r.fetchedAt)
        return (
          <CircleMarker
            key={`comp-${r.id}`}
            center={[r.lat, r.lng]}
            radius={4}
            pathOptions={{ color: '#fff', weight: 1, fillColor: fresh ? '#7c3aed' : '#94a3b8', fillOpacity: fresh ? 0.9 : 0.6 }}
          >
            <Tooltip direction="top">
              {fmtRent(r.monthlyRent)} · {r.beds}bd {r.propertyType.toLowerCase()} · {r.address}
              {!fresh && ` · expired (not seen in ${MAX_COMP_AGE_DAYS}+ days)`}
            </Tooltip>
            {rentalRedfinUrl(r) && (
              <Popup>
                <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, lineHeight: 1.4 }}>
                  <div style={{ fontWeight: 700 }}>{fmtRent(r.monthlyRent)} · {r.beds}bd {r.baths}ba</div>
                  <div>{r.address}</div>
                  <a href={rentalRedfinUrl(r)!} target="_blank" rel="noopener noreferrer">View rental on Redfin →</a>
                </div>
              </Popup>
            )}
          </CircleMarker>
        )
      })}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
function scoreToGrade(score: number) {
  if (score >= 97) return 'A+'
  if (score >= 88) return 'A'
  if (score >= 76) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}

// readOnly = Realtor Version: no home marker / home-inclusive framing
export default function MapView({ readOnly = false }: { readOnly?: boolean }) {
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const sortedSaleListings = useAppStore((s) => s.sortedSaleListings)
  const rawSale = useAppStore((s) => s.saleListings)
  const search = useAppStore((s) => s.search)
  const gradeFilter = useAppStore((s) => s.gradeFilter)
  const favoritesOnly = useAppStore((s) => s.favoritesOnly)
  const whatIfRent = useAppStore((s) => s.whatIfRent)
  const needsDataOnly = useAppStore((s) => s.needsDataOnly && !readOnly)

  const assumptions = useAppStore((s) => s.assumptions)
  const showComps = useAppStore((s) => s.layers.rentComps ?? false)
  const showRules = useAppStore((s) => s.layers.rentalRules ?? false)
  const deleteSelectMode = useAppStore((s) => s.deleteSelectMode)
  const deleteSelectedIds = useAppStore((s) => s.deleteSelectedIds)
  const toggleDeleteSelect = useAppStore((s) => s.toggleDeleteSelect)
  const addDeleteSelected = useAppStore((s) => s.addDeleteSelected)
  const setLayer = useAppStore((s) => s.setLayer)

  const listings = useMemo(
    () => {
      const all = sortedSaleListings()
      return all
        .filter((l) => !favoritesOnly || l.isFavorite)
        .filter((l) => !needsDataOnly || dataGaps(l).length > 0)
        .filter((l) => gradeFilter.length === 0 || gradeFilter.includes(gradePairKey(l)))
    },
    [rawSale, search, sortedSaleListings, assumptions, gradeFilter, favoritesOnly, needsDataOnly, whatIfRent], // eslint-disable-line
  )

  return (
    <div className="relative w-full h-full">
    <MapContainer
      center={[39.30, -76.72]}
      zoom={10}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <FitBounds listings={listings} includeHome={!readOnly} />
      <BoxSelect listings={listings} enabled={deleteSelectMode} onSelect={addDeleteSelected} />
      <CenterOnSelected listings={listings} selectedId={selectedId} includeHome={!readOnly} />
      {showRules && <RentalRulesOverlay />}
      {showComps && <CompCoverage listings={listings} />}
      {!readOnly && <Marker position={[HOME.lat, HOME.lng]} icon={homeIcon} zIndexOffset={1000} />}
      {listings.map((listing) => (
        <Marker
          key={listing.id}
          position={[listing.lat, listing.lng]}
          icon={makeIcon(listing, listing.id === selectedId, deleteSelectMode && deleteSelectedIds.includes(listing.id))}
          eventHandlers={{
            click: () => deleteSelectMode
              ? toggleDeleteSelect(listing.id)
              : setSelectedId(listing.id === selectedId ? null : listing.id),
          }}
        />
      ))}
    </MapContainer>
    {/* Map overlay toggles + legends */}
    <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2 text-xs">
    <div className="bg-white/95 rounded-lg shadow-md border border-slate-200">
      <button
        onClick={() => setLayer('rentalRules', !showRules)}
        className={`px-3 py-1.5 rounded-lg font-medium w-full text-left ${showRules ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
      >
        Rental rules
      </button>
      {showRules && (
        <div className="px-3 py-2 space-y-1 text-slate-600 max-w-[200px]">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm border-2 border-dashed border-[#9333ea] bg-[#9333ea]/10" /> Extra rental licensing</div>
          <div className="text-[10px] text-slate-400 pt-0.5">Click an area for its rules.</div>
        </div>
      )}
    </div>
    <div className="bg-white/95 rounded-lg shadow-md border border-slate-200">
      <button
        onClick={() => setLayer('rentComps', !showComps)}
        className={`px-3 py-1.5 rounded-lg font-medium w-full text-left ${showComps ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
      >
        Comp coverage
      </button>
      {showComps && (
        <div className="px-3 py-2 space-y-1 text-slate-600">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#059669]" /> 5+ comps</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#f59e0b]" /> {MIN_COMPS}–4 comps (thin)</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#dc2626]" /> Under {MIN_COMPS} — using HUD</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed] ml-0.5" /> Saved rental</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8] ml-0.5" /> Expired ({MAX_COMP_AGE_DAYS}+ days, not counted)</div>
          <div className="text-[10px] text-slate-400 pt-0.5">Circles = 1.5 mi. Click one for a Redfin link.</div>
        </div>
      )}
    </div>
    </div>
    </div>
  )
}
