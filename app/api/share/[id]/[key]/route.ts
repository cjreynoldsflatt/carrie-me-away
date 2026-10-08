// GET /api/share/[id]/[key] — public data for one shared listing (no login).
// Returns only that listing, rental comps near it, and the global assumptions.
import { NextRequest, NextResponse } from 'next/server'
import { isValidShareKey } from '@/lib/share'
import { loadSharedListing } from '@/lib/shared-listing'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; key: string }> }) {
  const { id, key } = await params
  if (!isValidShareKey(id, key)) {
    return NextResponse.json({ error: 'Link is invalid' }, { status: 404 })
  }
  const data = await loadSharedListing(id)
  if (!data) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  return NextResponse.json({ listing: data.listing, rentalListings: data.rentalListings, assumptions: data.assumptions })
}
