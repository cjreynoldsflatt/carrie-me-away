'use client'

import { fmtDom, fmtRent } from '@/lib/format'
import type { RentalListing } from '@/lib/types'
import { Popup } from 'react-map-gl/mapbox'

interface Props {
  listing: RentalListing
  onClose: () => void
}

export default function RentalPopup({ listing, onClose }: Props) {
  return (
    <Popup
      longitude={listing.lng}
      latitude={listing.lat}
      anchor="bottom"
      onClose={onClose}
      closeOnClick={false}
      maxWidth="220px"
      className="rental-popup"
    >
      <div className="text-xs space-y-1 p-1">
        <div className="font-semibold text-sm text-amber-700">{fmtRent(listing.monthlyRent)}</div>
        <div className="text-slate-700 font-medium">{listing.address}</div>
        <div className="text-slate-500">{listing.city}</div>
        <div className="flex gap-3 text-slate-600">
          <span>{listing.beds}bd</span>
          <span>{listing.baths}ba</span>
          <span>{listing.sqft.toLocaleString()} sqft</span>
        </div>
        <div className="text-slate-500">{listing.propertyType}</div>
        {listing.community && (
          <div className="text-slate-500">Community: {listing.community}</div>
        )}
        <div className="text-slate-400">Listed {fmtDom(listing.daysOnMarket)} ago</div>
      </div>
    </Popup>
  )
}
