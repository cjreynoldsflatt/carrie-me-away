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
  if (typeof body.estimated_rent === 'number' && body.estimated_rent >= 0) {
    updates.estimated_rent = body.estimated_rent
    updates.rent_confidence = 'High'
  }
  if (typeof body.repairs === 'number' && body.repairs >= 0) {
    updates.repairs = body.repairs
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }
  const { error } = await supabase.from('sale_listings').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
