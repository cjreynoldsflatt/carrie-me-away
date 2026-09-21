import { NextRequest, NextResponse } from 'next/server'

export type ListingStatus = 'Active' | 'Pending' | 'Sold' | 'Off Market' | 'Unknown'

export interface StatusResult {
  id: string
  status: ListingStatus
}

async function detectStatus(url: string): Promise<ListingStatus> {
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 7000)
    const res = await fetch(url, {
      signal: ac.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    clearTimeout(timer)

    if (res.status === 404) return 'Off Market'
    if (!res.ok) return 'Unknown'

    const html = await res.text()

    // Pull the strings most likely to contain status info — title, meta tags, and
    // the first 6 KB of body text (status badges render early in the DOM).
    const title = (html.match(/<title[^>]*>([^<]{0,300})<\/title>/i)?.[1] ?? '').toLowerCase()
    const metaContents = Array.from(html.matchAll(/<meta[^>]+content=["']([^"']{3,400})["']/gi))
      .map((m) => m[1])
      .join(' ')
      .toLowerCase()
    const bodyHead = html.slice(0, 8000).toLowerCase()

    const combined = `${title} ${metaContents} ${bodyHead}`

    // "Sold" — explicit keyword check. Avoid false positives from "homes sold nearby".
    if (/\bsold\b/.test(title) || /\bsold\b/.test(metaContents)) return 'Sold'
    // Redfin sold page title: "Sold: 3 beds …"
    if (/^sold[:\s]/.test(title.trim())) return 'Sold'

    // Pending / Sale Pending / Contingent
    if (/sale.?pending|pending.?sale|\bpending\b|\bcontingent\b/.test(title)) return 'Pending'
    if (/sale.?pending|pending.?sale|\bcontingent\b/.test(metaContents)) return 'Pending'

    // Off-market / no longer listed
    if (/off.?market|no longer.*list|not.*available|removed from.*market/.test(combined)) return 'Off Market'

    // Redfin embeds status in a JSON blob early in the HTML
    const statusJsonMatch = combined.match(/"displayStatus"\s*:\s*"([^"]{1,60})"/)
      ?? combined.match(/"homeStatus"\s*:\s*"([^"]{1,60})"/)
      ?? combined.match(/"listing_status"\s*:\s*"([^"]{1,60})"/)
    if (statusJsonMatch) {
      const s = statusJsonMatch[1]
      if (/sold/i.test(s)) return 'Sold'
      if (/pending|contingent/i.test(s)) return 'Pending'
      if (/off.?market|inactive|expired/i.test(s)) return 'Off Market'
      if (/active|for.?sale/i.test(s)) return 'Active'
    }

    return 'Active'
  } catch (err) {
    console.error('[check-listing-status] fetch error:', err)
    return 'Unknown'
  }
}

export async function POST(req: NextRequest) {
  try {
    const { listings } = await req.json() as { listings: Array<{ id: string; url: string }> }
    if (!Array.isArray(listings) || listings.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // Process in batches of 4 to avoid hammering the sites
    const results: StatusResult[] = []
    const batchSize = 4

    for (let i = 0; i < listings.length; i += batchSize) {
      const batch = listings.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(async ({ id, url }) => ({ id, status: await detectStatus(url) }))
      )
      results.push(...batchResults)
      // Small delay between batches to avoid rate-limiting
      if (i + batchSize < listings.length) {
        await new Promise((r) => setTimeout(r, 600))
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[check-listing-status]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
