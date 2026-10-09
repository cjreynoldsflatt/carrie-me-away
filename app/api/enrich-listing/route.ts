// POST /api/enrich-listing — fills in details for an already-saved listing from the text of its
// Redfin detail page (sent by the bookmarklet). Only updates facts from the page (HOA, tax bill,
// year built, days on market, type, missing beds/baths/sqft) — never price, rent, or user edits.
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parseRedfinDetail, cleanSubdivision } from '@/lib/redfin-detail'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  try {
    const { url, text, setType, subdivision } = await req.json() as {
      url?: string; text?: string
      subdivision?: string  // MLS subdivision name from Redfin's property details (→ community)
      setType?: boolean  // listing was just added — trust Redfin's type over the default/JSON-LD guess
    }
    const homeId = url?.match(/\/home\/(\d+)/)?.[1]
    if (!homeId || (!text && !subdivision)) return NextResponse.json({ error: 'url and text or subdivision are required' }, { status: 400, headers: CORS })

    const { data: row } = await supabase
      .from('sale_listings')
      .select('id, address, property_type, beds, baths, sqft, year_built')
      .eq('id', `redfin-${homeId}`)
      .maybeSingle()
    if (!row) return NextResponse.json({ notSaved: true }, { headers: CORS })

    const d = text ? parseRedfinDetail(text) : {}
    const updates: Record<string, unknown> = {}
    if (d.hoaMonthly != null) updates.hoa_monthly = d.hoaMonthly
    if (d.propertyTaxAnnual != null) updates.property_tax_annual = d.propertyTaxAnnual
    if (d.yearBuilt != null) updates.year_built = d.yearBuilt
    if (d.daysOnMarket != null) updates.days_on_market = d.daysOnMarket
    // Existing listings: only correct the Townhouse default so a manual type choice sticks
    if (d.propertyType && d.propertyType !== row.property_type && (setType || row.property_type === 'Townhouse')) updates.property_type = d.propertyType
    if (d.beds && !row.beds) updates.beds = d.beds
    if (d.baths && !row.baths) updates.baths = d.baths
    if (d.sqft && !row.sqft) updates.sqft = d.sqft
    // Plan listings have no street address — label them by plan name instead of just the town
    if (d.planName && !/\d/.test(row.address ?? '')) updates.address = d.planName
    const community = cleanSubdivision(subdivision) ?? (d.planCommunity ? cleanSubdivision(d.planCommunity.replace(/\s+(Townhomes|Townhouses|Homes|Condominiums|Condos)$/i, '')) : null)
    if (community) updates.community = community

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('sale_listings').update(updates).eq('id', row.id)
      if (error) throw new Error(`Supabase: ${error.message}`)
    }
    return NextResponse.json({ address: row.address, updated: updates }, { headers: CORS })
  } catch (err) {
    console.error('[enrich-listing]', err)
    return NextResponse.json({ error: String(err) }, { status: 500, headers: CORS })
  }
}
