// GET /api/share-link?id=... — returns the public realtor share path for a listing.
// Behind the app login (middleware); the share page itself is public.
import { NextRequest, NextResponse } from 'next/server'
import { shareKey } from '@/lib/share'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  const key = shareKey(id)
  return NextResponse.json({
    path: `/share/${encodeURIComponent(id)}/${key}`,              // public realtor page
    appPath: `/finder?id=${encodeURIComponent(id)}&k=${key}`,      // in-app link (login), key enables link preview
  })
}
