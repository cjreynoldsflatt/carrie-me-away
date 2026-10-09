// GET /bm.js — the latest bookmarklet program. The saved bookmark loads this on every click,
// so bookmarklet fixes ship without users re-copying it. Public (runs on redfin.com / realtor.com).
import { NextRequest } from 'next/server'
import { buildBookmarkletCode } from '@/lib/bookmarklet'

export async function GET(req: NextRequest) {
  return new Response(buildBookmarkletCode(req.nextUrl.origin), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
