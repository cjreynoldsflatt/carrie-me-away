'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { SaleListing } from '@/lib/types'

function dotColor(score: number): string {
  if (score >= 97) return '#047857'  // emerald-700
  if (score >= 88) return '#22c55e'  // green-500
  if (score >= 76) return '#1d4ed8'  // blue-700
  if (score >= 60) return '#60a5fa'  // blue-400
  if (score >= 40) return '#f97316'  // orange-500
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
