import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabase.from('sale_listings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.reset_rent === true) {
    // Drop a manual override — the automated estimate (comps or HUD) takes over again.
    // rent_low/rent_high still hold the HUD range; its midpoint is the HUD FMR.
    const { data: row } = await supabase.from('sale_listings').select('rent_low, rent_high').eq('id', id).single()
    const low = row?.rent_low ?? 0, high = row?.rent_high ?? 0
    const mid = low > 0 && high > 0 ? (low + high) / 2 : 0
    if (mid > 0) {
      updates.estimated_rent = Math.round(mid)
      // ±15% range = zip-level SAFMR (Medium); ±20% = metro FMR (Low) — see add-listing
      updates.rent_confidence = (high - low) / mid < 0.35 ? 'Medium' : 'Low'
    }
  } else if (typeof body.estimated_rent === 'number' && body.estimated_rent >= 0) {
    updates.estimated_rent = body.estimated_rent
    updates.rent_confidence = 'High'
  }
  if (typeof body.repairs === 'number' && body.repairs >= 0) {
    updates.repairs = body.repairs
  }
  if (typeof body.super_annual_cost === 'number' && body.super_annual_cost >= 0) {
    updates.super_annual_cost = body.super_annual_cost
  }
  const validTypes = ['Townhouse', 'Condo', 'Single Family', 'Multi Family']
  if (typeof body.property_type === 'string' && validTypes.includes(body.property_type)) {
    updates.property_type = body.property_type
  }
  if (typeof body.units === 'number' && body.units >= 2 && body.units <= 100) {
    updates.units = body.units
  }
  if (typeof body.lat === 'number' && body.lat >= 24 && body.lat <= 50) {
    updates.lat = body.lat
  }
  if (typeof body.lng === 'number' && body.lng >= -125 && body.lng <= -65) {
    updates.lng = body.lng
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }
  const { error } = await supabase.from('sale_listings').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
