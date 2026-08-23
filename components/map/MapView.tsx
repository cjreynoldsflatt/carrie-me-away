'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAppStore } from '@/lib/store'
import { fmtPrice, fmtRent, fmtYield } from '@/lib/format'
import { HOME } from '@/lib/config'
import type { SaleListing } from '@/lib/types'

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
function FitBounds({ listings }: { listings: SaleListing[] }) {
  const map = useMap()
  useEffect(() => {
    if (listings.length === 0) return
    if (listings.length === 1) {
      map.setView([listings[0].lat, listings[0].lng], 13)
    } else {
      const bounds = L.latLngBounds(listings.map((l) => [l.lat, l.lng]))
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 })
    }
  }, [listings, map])
  return null
}

// ── Center map on selected listing, or fit-all when deselected ───────────────
function CenterOnSelected({ listings, selectedId }: { listings: SaleListing[]; selectedId: string | null }) {
  const map = useMap()
  const prevId = useRef<string | null>(null)
  useEffect(() => {
    const wasSelected = prevId.current !== null
    prevId.current = selectedId
    if (!selectedId) {
      // Only reset view if we were previously zoomed to a specific listing
      if (wasSelected && listings.length > 0) {
        if (listings.length === 1) {
          map.setView([listings[0].lat, listings[0].lng], 13, { animate: true })
        } else {
          const bounds = L.latLngBounds(listings.map((l) => [l.lat, l.lng]))
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 })
        }
      }
      return
    }
    const listing = listings.find((l) => l.id === selectedId)
    if (listing) map.setView([listing.lat, listing.lng], Math.max(map.getZoom(), 14), { animate: true })
  }, [selectedId, listings, map])
  return null
}

// ── Colored pin marker ────────────────────────────────────────────────────────
function makeIcon(listing: SaleListing, selected: boolean) {
  const s = listing.investmentScore
  const bg = s >= 70 ? '#059669' : s >= 57 ? '#0891b2' : s >= 44 ? '#2563eb' : s >= 32 ? '#fb923c' : s >= 20 ? '#ea580c' : '#dc2626'
  const border = selected ? '#facc15' : bg
  const ring = selected ? 'box-shadow:0 0 0 3px #facc1580;' : ''

  const shadow = selected
    ? '0 0 0 3px #facc15, 0 4px 16px rgba(0,0,0,.45)'
    : '0 3px 10px rgba(0,0,0,.4)'

  const html = `
    <div style="
      background:${bg};border:3px solid ${selected ? '#facc15' : 'rgba(255,255,255,0.35)'};
      color:#fff;border-radius:10px;padding:5px 10px;
      font-family:system-ui,sans-serif;font-size:13px;font-weight:800;
      white-space:nowrap;box-shadow:${shadow};
      transform:${selected ? 'scale(1.15)' : 'scale(1)'};
      transform-origin:bottom center;letter-spacing:-0.3px;
    ">
      <div>${fmtPrice(listing.price)}</div>
      <div style="font-weight:500;opacity:.95;font-size:11px;margin-top:1px">${listing.estimatedRent > 0 ? fmtRent(listing.estimatedRent) + ' · ' : ''}${fmtYield(listing.netCashYield)}</div>
    </div>
    <div style="
      width:0;height:0;margin:0 auto;
      border-left:7px solid transparent;border-right:7px solid transparent;
      border-top:8px solid ${bg};
    "></div>`

  return L.divIcon({ html, className: '', iconAnchor: [60, 58], iconSize: [120, 58] })
}

// ── Main component ────────────────────────────────────────────────────────────
function scoreToGrade(score: number) {
  if (score >= 70) return 'A+'
  if (score >= 57) return 'A'
  if (score >= 44) return 'B+'
  if (score >= 32) return 'B'
  if (score >= 20) return 'C'
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

  const listings = useMemo(
    () => {
      const all = sortedSaleListings()
      return gradeFilter.length === 0 ? all : all.filter((l) => gradeFilter.includes(scoreToGrade(l.investmentScore)))
    },
    [rawSale, search, sortedSaleListings, assumptions, gradeFilter], // eslint-disable-line
  )

  return (
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
      <Marker position={[HOME.lat, HOME.lng]} icon={homeIcon} />
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
  )
}
