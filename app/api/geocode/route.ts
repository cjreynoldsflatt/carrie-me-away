// GET /api/geocode?address=... — server-side geocode (Census → Nominatim → ZIP centroid).
// Runs on the server because the Census geocoder doesn't allow browser (CORS) requests.
import { NextRequest, NextResponse } from 'next/server'
import { geocode } from '@/lib/geocode'

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')?.trim()
  if (!address) return NextResponse.json({ error: 'address is required' }, { status: 400 })
  const result = await geocode(address)
  return NextResponse.json({ result })
}
