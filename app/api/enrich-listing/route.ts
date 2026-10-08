// POST /api/enrich-listing — fills in details for an already-saved listing from the text of its
// Redfin detail page (sent by the bookmarklet). Only updates facts from the page (HOA, tax bill,
// year built, days on market, type, missing beds/baths/sqft) — never price, rent, or user edits.
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parseRedfinDetail } from '@/lib/redfin-detail'

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
    const { url, text, setType } = await req.json() as {
      url?: string; text?: string
      setType?: boolean  // listing was just added — trust Redfin's type over the default/JSON-LD guess
    }
    const homeId = url?.match(/\/home\/(\d+)/)?.[1]
    if (!homeId || !text) return NextResponse.json({ error: 'url and text are required' }, { status: 400, headers: CORS })

    const { data: row } = await supabase
      .from('sale_listings')
      .select('id, address, property_type, beds, baths, sqft')
      .eq('id', `redfin-${homeId}`)
      .maybeSingle()
    if (!row) return NextResponse.json({ notSaved: true }, { headers: CORS })

    const d = parseRedfinDetail(text)
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
