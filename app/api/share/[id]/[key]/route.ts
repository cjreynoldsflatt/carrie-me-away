// GET /api/share/[id]/[key] — public data for one shared listing (no login).
// Returns only that listing, rental comps near it, and the global assumptions.
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rowToSaleListing, rowToRentalListing } from '@/lib/db-mappers'
import { applyRentComps } from '@/lib/rent-comps'
import { distanceMiles } from '@/lib/investment'
import { isValidShareKey } from '@/lib/share'
import { DEFAULT_ASSUMPTIONS } from '@/lib/defaults'
import { rowToAssumptions } from '@/lib/settings'

const COMP_RADIUS_MILES = 3  // matches the widest radius used for estimates

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; key: string }> }) {
  const { id, key } = await params
  if (!isValidShareKey(id, key)) {
    return NextResponse.json({ error: 'Link is invalid' }, { status: 404 })
  }

  const [saleRes, rentalRes, settingsRes] = await Promise.all([
    supabase.from('sale_listings').select('*').eq('id', id).maybeSingle(),
    supabase.from('rental_listings').select('*'),
    supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
  ])
  if (!saleRes.data) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  const sale = saleRes.data
  const nearbyRentals = (rentalRes.data ?? []).filter(
    (r) => distanceMiles(sale.lat, sale.lng, r.lat, r.lng) <= COMP_RADIUS_MILES,
  )
  const [withComps] = applyRentComps([sale], nearbyRentals)

  return NextResponse.json({
    listing: rowToSaleListing(withComps),
    rentalListings: nearbyRentals.map(rowToRentalListing),
    assumptions: settingsRes.data ? rowToAssumptions(settingsRes.data) : DEFAULT_ASSUMPTIONS,
  })
}
