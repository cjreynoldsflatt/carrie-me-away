'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { SaleListing } from '@/lib/types'

function dotColor(score: number): string {
  if (score >= 70) return '#059669'  // emerald-600
  if (score >= 57) return '#0891b2'  // cyan-600
  if (score >= 44) return '#2563eb'  // blue-600
  if (score >= 32) return '#fb923c'  // orange-400
  if (score >= 20) return '#ea580c'  // orange-600
  return '#dc2626'                   // red-600
}

function FitBounds({ listings }: { listings: SaleListing[] }) {
  const map = useMap()
  useEffect(() => {
    if (listings.length === 0) return
    if (listings.length === 1) {
      map.setView([listings[0].lat, listings[0].lng], 13)
    } else {
      const bounds = L.latLngBounds(listings.map((l) => [l.lat, l.lng]))
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 })
    }
  }, [listings, map])
  return null
}

export default function MiniMapView({
  listings,
  onClick,
}: {
  listings: SaleListing[]
  onClick: () => void
}) {
  return (
    <MapContainer
      center={[39.30, -76.72]}
      zoom={10}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds listings={listings} />
      {listings.map((l) => (
        <CircleMarker
          key={l.id}
          center={[l.lat, l.lng]}
          radius={6}
          pathOptions={{
            fillColor: dotColor(l.investmentScore),
            fillOpacity: 1,
            color: '#fff',
            weight: 1.5,
          }}
          eventHandlers={{ click: onClick }}
        />
      ))}
      {/* Invisible full-area click catcher */}
      <ClickOverlay onClick={onClick} />
    </MapContainer>
  )
}

function ClickOverlay({ onClick }: { onClick: () => void }) {
  const map = useMap()
  useEffect(() => {
    map.on('click', onClick)
    return () => { map.off('click', onClick) }
  }, [map, onClick])
  return null
}
