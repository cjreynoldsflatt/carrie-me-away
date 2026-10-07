// POST /api/add-rentals — saves rental comps scraped by the bookmarklet from a Redfin rentals search page.
// These feed lib/rent-comps.ts, which replaces HUD rent estimates when enough comps are nearby.
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validCoords } from '@/lib/geocode'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

interface IncomingRental {
  url?: string
  address?: string    // "3614 Sprigg St S, Frederick, MD 21704"
  rent?: number
  beds?: number
  baths?: number
  sqft?: number | null
  lat?: number
  lng?: number
}

const VALID_TYPES = ['Townhouse', 'Condo', 'Single Family', 'Multi Family']

export async function POST(req: NextRequest) {
  try {
    const { rentals, propertyType } = await req.json() as { rentals?: IncomingRental[]; propertyType?: string }
    if (!Array.isArray(rentals) || rentals.length === 0) {
      return NextResponse.json({ error: 'No rentals provided' }, { status: 400, headers: CORS })
    }
    // Comps only count toward estimates for the same property type, so it must be known
    if (!propertyType || !VALID_TYPES.includes(propertyType)) {
      return NextResponse.json(
        { error: 'Filter the Redfin search to a single property type (e.g. Townhouse) first' },
        { status: 422, headers: CORS },
      )
    }

    const now = new Date().toISOString()
    const rows = rentals.flatMap((r) => {
      const homeId = r.url?.match(/\/home\/(\d+)/)?.[1]
      const coords = validCoords(r.lat, r.lng)
      const rent = Number(r.rent), beds = Number(r.beds)
      if (!homeId || !coords || !(rent > 0) || !(beds > 0) || !r.address) return []
      // "3614 Sprigg St S, Frederick, MD 21704" → street + "Frederick, MD 21704"
      const [street, ...rest] = r.address.split(',').map((s) => s.trim())
      return [{
        id: `redfin-rental-${homeId}`,
        address: street,
        city: rest.join(', '),
        lat: coords.lat,
        lng: coords.lng,
        monthly_rent: rent,
        beds,
        baths: Number(r.baths) || 0,
        sqft: r.sqft ? Math.round(Number(r.sqft)) : null,
        days_on_market: 0,
        property_type: propertyType,
        fetched_at: now,
      }]
    })
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No usable rentals on this page' }, { status: 422, headers: CORS })
    }

    const { error } = await supabase.from('rental_listings').upsert(rows, { onConflict: 'id' })
    if (error) throw new Error(`Supabase: ${error.message}`)
    return NextResponse.json({ saved: rows.length, skipped: rentals.length - rows.length }, { headers: CORS })
  } catch (err) {
    console.error('[add-rentals]', err)
    return NextResponse.json({ error: String(err) }, { status: 500, headers: CORS })
  }
}
