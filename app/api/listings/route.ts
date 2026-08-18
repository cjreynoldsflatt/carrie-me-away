// GET /api/listings — returns cached listings from Supabase (no Rentcast calls)
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rowToSaleListing, rowToRentalListing } from '@/lib/db-mappers'

export async function GET() {
  const [saleRes, rentalRes, stateRes] = await Promise.all([
    supabase.from('sale_listings').select('*').eq('is_manual', true).order('fetched_at', { ascending: false }),
    supabase.from('rental_listings').select('*').order('fetched_at', { ascending: false }),
    supabase.from('refresh_state').select('last_refreshed_at').eq('id', 1).single(),
  ])

  const rows = saleRes.data ?? []

  // Deduplicate by listing_url — keep the most recent row, delete the rest.
  const seen = new Map<string, string>() // url → id of the keeper
  const staleIds: string[] = []
  for (const row of rows) {
    const key = row.listing_url ?? row.address
    if (!key) continue
    if (seen.has(key)) {
      staleIds.push(row.id) // this one is older (results are ordered newest-first)
    } else {
      seen.set(key, row.id)
    }
  }
  if (staleIds.length > 0) {
    await supabase.from('sale_listings').delete().in('id', staleIds)
    console.log(`[listings] removed ${staleIds.length} duplicate(s):`, staleIds)
  }

  const deduped = rows.filter((r) => !staleIds.includes(r.id))

  return NextResponse.json({
    saleListings: deduped.map(rowToSaleListing),
    rentalListings: (rentalRes.data ?? []).map(rowToRentalListing),
    lastRefreshed: stateRes.data?.last_refreshed_at ?? null,
  })
}
