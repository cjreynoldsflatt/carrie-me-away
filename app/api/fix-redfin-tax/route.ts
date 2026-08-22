// POST /api/fix-redfin-tax — one-time migration: multiply property_tax_annual by 12
// for Redfin listings where the stored value is < 1200 (indicating it was stored as monthly).
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  // Fetch all Redfin listings with suspiciously low annual tax (stored as monthly)
  const { data, error } = await supabase
    .from('sale_listings')
    .select('id, property_tax_annual')
    .like('id', 'redfin-%')
    .lt('property_tax_annual', 1200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ updated: 0, message: 'No listings needed fixing' })

  const updates = await Promise.all(
    data.map((row) =>
      supabase
        .from('sale_listings')
        .update({ property_tax_annual: row.property_tax_annual * 12 })
        .eq('id', row.id)
    )
  )

  const failed = updates.filter((u) => u.error).map((u) => u.error?.message)
  return NextResponse.json({
    updated: data.length - failed.length,
    failed: failed.length,
    ids: data.map((r) => r.id),
    errors: failed,
  })
}
