// POST /api/refresh — DISABLED. Rentcast API disconnected to prevent accidental usage.
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Rentcast API disabled' }, { status: 503 })
}
