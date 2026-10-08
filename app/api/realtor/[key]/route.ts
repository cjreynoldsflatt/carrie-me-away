// GET /api/realtor/[key] — read-only data for the Realtor Version (no login, signed key).
// Same listings the app shows (rent comps applied) plus rentals and assumptions; never writes.
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rowToSaleListing, rowToRentalListing } from '@/lib/db-mappers'
import { applyRentComps } from '@/lib/rent-comps'
import { rowToAssumptions } from '@/lib/settings'
import { DEFAULT_ASSUMPTIONS } from '@/lib/defaults'
import { isValidRealtorKey } from '@/lib/share'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  if (!isValidRealtorKey(key)) return NextResponse.json({ error: 'Link is invalid' }, { status: 404 })

  const [saleRes, rentalRes, settingsRes] = await Promise.all([
    supabase.from('sale_listings').select('*').eq('is_manual', true).order('fetched_at', { ascending: false }),
    supabase.from('rental_listings').select('*').order('fetched_at', { ascending: false }),
    supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
  ])
  // Same de-duplication as /api/listings (newest row per listing URL), without deleting anything
  const seen = new Set<string>()
  const sales = (saleRes.data ?? []).filter((r) => {
    const k = r.listing_url ?? r.address
    if (!k || seen.has(k)) return !k
    seen.add(k)
    return true
  })
  const rentals = rentalRes.data ?? []
  return NextResponse.json({
    saleListings: applyRentComps(sales, rentals).map(rowToSaleListing),
    rentalListings: rentals.map(rowToRentalListing),
    assumptions: settingsRes.data ? rowToAssumptions(settingsRes.data) : DEFAULT_ASSUMPTIONS,
  })
}
