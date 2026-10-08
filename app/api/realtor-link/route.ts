// GET /api/realtor-link — the public Realtor Version URL path (behind the app login).
import { NextResponse } from 'next/server'
import { realtorKey } from '@/lib/share'

export async function GET() {
  return NextResponse.json({ path: `/realtor/${realtorKey()}` })
}
