'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAppStore } from '@/lib/store'
import { fmtPrice, fmtRent, fmtYield } from '@/lib/format'
import { HOME } from '@/lib/config'
import type { SaleListing } from '@/lib/types'
import { MIN_COMPS } from '@/lib/rent-comps'

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
function FitBounds({ listings }: { listings: SaleListing[] }) {
  const map = useMap()
  const fittedKeyRef = useRef('')
  useEffect(() => {
    if (listings.length === 0) return
    const key = listings.map((l) => l.id).join(',')
    if (key === fittedKeyRef.current) return
    fittedKeyRef.current = key
    const points: [number, number][] = [...listings.map((l): [number, number] => [l.lat, l.lng]), [HOME.lat, HOME.lng]]
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 })
  }, [listings, map])
  return null
}

// ── Center map on selected listing, or fit-all when deselected ───────────────
// listings kept in a ref so the effect only re-runs on selectedId changes,
// not on assumption edits that recompute the same listings.
function CenterOnSelected({ listings, selectedId }: { listings: SaleListing[]; selectedId: string | null }) {
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
          const points: [number, number][] = [...ls.map((l): [number, number] => [l.lat, l.lng]), [HOME.lat, HOME.lng]]
          map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 14 })
        }
      }
      return
    }
    const listing = listingsRef.current.find((l) => l.id === selectedId)
    if (listing) map.setView([listing.lat, listing.lng], Math.max(map.getZoom(), 14), { animate: true })
  }, [selectedId, map])
  return null
}

// ── Colored pin marker ────────────────────────────────────────────────────────
const gradeHex = (s: number) =>
  s >= 97 ? '#059669' : s >= 88 ? '#0891b2' : s >= 76 ? '#2563eb' : s >= 60 ? '#fb923c' : s >= 40 ? '#ea580c' : '#dc2626'

function makeIcon(listing: SaleListing, selected: boolean) {
  // White bubble (price + yield range); header strip fades from the conservative to the realistic grade color
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

  const shadow = selected
    ? '0 0 0 3px #facc15, 0 4px 16px rgba(0,0,0,.45)'
    : '0 3px 10px rgba(0,0,0,.35)'

  // Fixed-size box with content bottom-centered, so the pointer tip always sits on the
  // anchor no matter how wide the bubble's text is
  const W = 160, H = 84
  const html = `
    <div style="width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;pointer-events:none">
      <div style="
        pointer-events:auto;
        background:#fff;color:#0f172a;border-radius:10px;overflow:hidden;text-align:center;
        font-family:system-ui,sans-serif;white-space:nowrap;box-shadow:${shadow};
        transform:${selected ? 'scale(1.15)' : 'scale(1)'};
        transform-origin:bottom center;letter-spacing:-0.3px;
      ">
        <div style="background:linear-gradient(90deg, ${cons}, ${real});color:#fff;font-size:11px;font-weight:800;padding:2px 10px;text-shadow:0 1px 1px rgba(0,0,0,.25)">${grades}</div>
        <div style="padding:6px 12px 9px">
          <div style="font-size:13px;font-weight:800">${fmtPrice(listing.price)}</div>
          <div style="font-weight:600;font-size:11px;margin-top:2px;color:#475569">${yieldText}</div>
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
      {rentals.map((r) => (
        <CircleMarker
          key={`comp-${r.id}`}
          center={[r.lat, r.lng]}
          radius={4}
          pathOptions={{ color: '#fff', weight: 1, fillColor: '#7c3aed', fillOpacity: 0.9 }}
        >
          <Tooltip direction="top">{fmtRent(r.monthlyRent)} · {r.beds}bd {r.propertyType.toLowerCase()} · {r.address}</Tooltip>
        </CircleMarker>
      ))}
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

export default function MapView() {
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const sortedSaleListings = useAppStore((s) => s.sortedSaleListings)
  const rawSale = useAppStore((s) => s.saleListings)
  const search = useAppStore((s) => s.search)
  const gradeFilter = useAppStore((s) => s.gradeFilter)

  const assumptions = useAppStore((s) => s.assumptions)
  const showComps = useAppStore((s) => s.layers.rentComps ?? false)
  const setLayer = useAppStore((s) => s.setLayer)

  const listings = useMemo(
    () => {
      const all = sortedSaleListings()
      return gradeFilter.length === 0 ? all : all.filter((l) => gradeFilter.includes(scoreToGrade(l.investmentScore)))
    },
    [rawSale, search, sortedSaleListings, assumptions, gradeFilter], // eslint-disable-line
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
      <FitBounds listings={listings} />
      <CenterOnSelected listings={listings} selectedId={selectedId} />
      {showComps && <CompCoverage listings={listings} />}
      <Marker position={[HOME.lat, HOME.lng]} icon={homeIcon} zIndexOffset={1000} />
      {listings.map((listing) => (
        <Marker
          key={listing.id}
          position={[listing.lat, listing.lng]}
          icon={makeIcon(listing, listing.id === selectedId)}
          eventHandlers={{
            click: () => setSelectedId(listing.id === selectedId ? null : listing.id),
          }}
        />
      ))}
    </MapContainer>
    {/* Comp coverage toggle + legend */}
    <div className="absolute top-3 right-3 z-[1000] bg-white/95 rounded-lg shadow-md border border-slate-200 text-xs">
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
          <div className="text-[10px] text-slate-400 pt-0.5">Circles = 1.5 mi. Click one for a Redfin link.</div>
        </div>
      )}
    </div>
    </div>
  )
}
