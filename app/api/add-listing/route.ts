// POST /api/add-listing — parses pasted realtor.com/redfin text and saves to Supabase.
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rowToSaleListing } from '@/lib/db-mappers'

// CORS — needed so the bookmarklet (running on redfin.com / realtor.com) can POST here.
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
    const { url, text, photoUrl: clientPhotoUrl, propertyType: clientPropertyType, units: clientUnits } = await req.json()
    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400, headers: CORS })
    }

    const parsed = parseListingText(text, url)

    // Address comes from URL (reliable) then falls back to text
    const fromUrl = url ? addressFromUrl(url) : null
    const streetAddress = fromUrl?.streetAddress ?? null
    const city = fromUrl?.city ?? parsed.city ?? ''

    if (!streetAddress && !city) {
      return NextResponse.json({ error: 'Could not find an address — make sure the URL is included' }, { status: 422, headers: CORS })
    }

    const fullAddress = streetAddress ? `${streetAddress}, ${city}` : city

    // Geocode using OpenStreetMap Nominatim (free, no key)
    const geo = await geocode(fullAddress)
    console.log('[add-listing] geocode:', { fullAddress, result: geo })

    // Photo — use what the bookmarklet sent, otherwise try scraping og:image
    const photoUrl = clientPhotoUrl ?? (url ? await fetchOgImage(url) : null)

    // HUD Fair Market Rent estimate (free — requires HUD_TOKEN in .env.local)
    const zip = extractZip(city)
    const beds = parsed.beds ?? 0
    const resolvedType = clientPropertyType ?? parsed.propertyType ?? 'Townhouse'
    const isMultiFamily = resolvedType === 'Multi Family'
    const units = isMultiFamily ? (clientUnits ?? parsed.units ?? 2) : 1
    const fmrPerUnit = zip ? await fetchHudFmr(zip, beds) : null
    const fmr = fmrPerUnit ? fmrPerUnit * units : null

    const id = stableId(url, streetAddress, city)

    // Check if already in DB before upserting
    const { data: existingRow } = await supabase.from('sale_listings').select('id').eq('id', id).maybeSingle()
    const alreadyExists = !!existingRow

    // Remove any existing rows with the same URL (handles old timestamp-based IDs)
    if (url) {
      await supabase.from('sale_listings').delete().eq('listing_url', url).neq('id', id)
    }

    const row = {
      id,
      address: streetAddress ?? city,
      city,
      lat: geo?.lat ?? 39.30,
      lng: geo?.lng ?? -76.72,
      price: parsed.price ?? 0,
      property_type: resolvedType,
      beds,
      ...(isMultiFamily ? { units } : {}),
      baths: parsed.baths ?? 0,
      sqft: parsed.sqft ?? null,
      year_built: parsed.yearBuilt ?? null,
      days_on_market: parsed.daysOnMarket ?? 0,
      hoa_monthly: parsed.hoaMonthly ?? 0,
      photo_url: photoUrl ?? null,
      listing_url: url ?? null,
      estimated_rent: fmr,
      rent_low: fmr ? Math.round(fmr * 0.9) : null,
      rent_high: fmr ? Math.round(fmr * 1.1) : null,
      rent_confidence: fmr ? 'Medium' : 'Low',
      property_tax_annual: Math.round((parsed.price ?? 0) * 0.01),
      repairs: 10000,
      rental_evidence: 'Unknown',
      rental_demand: 'Insufficient Data',
      appreciation_rate: 0.03,
      fetched_at: new Date().toISOString(),
      avm_fetched_at: null,
      is_manual: true,
    }

    const { error } = await supabase.from('sale_listings').upsert(row, { onConflict: 'id' })
    if (error) throw new Error(`Supabase: ${error.message}`)

    const { data } = await supabase.from('sale_listings').select('*').eq('id', row.id).single()
    return NextResponse.json({ listing: rowToSaleListing(data), parsed: { ...parsed, address: streetAddress, city }, alreadyExists }, { headers: CORS })
  } catch (err) {
    console.error('[add-listing]', err)
    return NextResponse.json({ error: String(err) }, { status: 500, headers: CORS })
  }
}

// ── Text parser ───────────────────────────────────────────────────────────────

const toTitle = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())

// ── Stable ID — same listing always gets the same ID so upsert deduplicates ──
function stableId(url: string | null, streetAddress: string | null, city: string): string {
  if (url) {
    try {
      const { hostname, pathname } = new URL(url)
      if (hostname.includes('redfin.com')) {
        // /MD/City/address-zip/home/123456789
        const listingId = pathname.split('/')[5]
        if (listingId) return `redfin-${listingId}`
      }
      if (hostname.includes('realtor.com')) {
        const slug = pathname.split('/').pop() ?? ''
        const m = slug.match(/_M([\d-]+)$/)
        if (m) return `realtor-M${m[1]}`
      }
    } catch { /* fall through */ }
  }
  // Fallback: slugify the address
  const base = [streetAddress, city].filter(Boolean).join(' ')
  return `manual-${base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

// Dispatch to the right URL parser based on hostname
function addressFromUrl(url: string): { streetAddress: string; city: string } | null {
  try {
    const host = new URL(url).hostname
    if (host.includes('redfin.com')) return addressFromRedfin(url)
    return addressFromRealtor(url)
  } catch {
    return null
  }
}

// realtor.com URL format: /realestateandhomes-detail/11409-Starlight-Pl_Marriottsville_MD_21104_M...
function addressFromRealtor(url: string): { streetAddress: string; city: string } | null {
  try {
    const slug = new URL(url).pathname.split('/').pop() ?? ''
    // Remove trailing numeric listing ID (e.g. _M93480-39901)
    const clean = slug.replace(/_M\d[\d-]+$/, '')
    const parts = clean.split('_')
    if (parts.length < 4) return null
    // Last three: city, state, zip
    const zip = parts[parts.length - 1]
    const state = parts[parts.length - 2]
    const city = parts[parts.length - 3].replace(/-/g, ' ')
    // Everything before is street address
    const street = parts.slice(0, parts.length - 3).join(' ').replace(/-/g, ' ')
    return {
      streetAddress: toTitle(street),
      city: `${toTitle(city)}, ${state} ${zip}`,
    }
  } catch {
    return null
  }
}

// Redfin URL format: /MD/Ellicott-City/3000-Yarmouth-Dr-21043/home/189434573
function addressFromRedfin(url: string): { streetAddress: string; city: string } | null {
  try {
    const parts = new URL(url).pathname.split('/')
    // parts: ['', 'MD', 'Ellicott-City', '3000-Yarmouth-Dr-21043', 'home', '189434573']
    const state = parts[1]?.toUpperCase()
    const citySlug = parts[2]
    const addressSlug = parts[3]
    if (!state || !citySlug || !addressSlug) return null
    // ZIP is the trailing 5-digit segment of the address slug
    const zipMatch = addressSlug.match(/^(.+)-(\d{5})$/)
    if (!zipMatch) return null
    const street = toTitle(zipMatch[1].replace(/-/g, ' '))
    const city = toTitle(citySlug.replace(/-/g, ' '))
    return {
      streetAddress: street,
      city: `${city}, ${state} ${zipMatch[2]}`,
    }
  } catch {
    return null
  }
}

function parseListingText(text: string, url?: string) {
  const t = text.replace(/\s+/g, ' ').trim()

  // Price — must look like a home price (>= $50k, has comma or is big)
  // Try "List Price $490,000" or "$490,000" patterns first (prices with commas)
  const allPrices: number[] = []
  const priceRe = /\$\s*([\d]{2,3}(?:,\d{3})+)/g
  let m: RegExpExecArray | null
  while ((m = priceRe.exec(t)) !== null) {
    const val = parseInt(m[1].replace(/,/g, ''))
    if (val >= 50000) allPrices.push(val)
  }
  // Use the first price that looks like a listing price (or the largest if ambiguous)
  const price = allPrices.length > 0 ? allPrices[0] : null

  // Beds — find all matches, pick first reasonable one (< 20)
  const bedsRe = /(\d+(?:\.\d+)?)\s*(?:bed|bd|br|bedroom)/gi
  let bedsMatch: RegExpExecArray | null
  let beds = 0
  while ((bedsMatch = bedsRe.exec(t)) !== null) {
    const val = parseFloat(bedsMatch[1])
    if (val > 0 && val < 20) { beds = val; break }
  }

  // Baths — same sanity check
  const bathsRe = /(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/gi
  let bathsMatch: RegExpExecArray | null
  let baths = 0
  while ((bathsMatch = bathsRe.exec(t)) !== null) {
    const val = parseFloat(bathsMatch[1])
    if (val > 0 && val < 20) { baths = val; break }
  }

  // Sqft
  const sqftMatch = t.match(/([\d,]+)\s*(?:sq\.?\s*ft|sqft|square\s*feet)/i)
  const sqft = sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, '')) : null

  // Year built
  const yearMatch = t.match(/(?:built|year\s*built)[:\s]*(\d{4})/i) ?? t.match(/(\d{4})\s*(?:built|year\s*built)/i)
  const yearBuilt = yearMatch ? parseInt(yearMatch[1]) : null

  // HOA — must be in HOA context to avoid picking up mortgage estimates
  const hoaMatch = t.match(/HOA[^.]{0,60}?\$\s*([\d,]+)\s*\/\s*(?:mo|month)/i)
    ?? t.match(/\$\s*([\d,]+)\s*\/\s*(?:mo|month)\s*HOA/i)
    ?? t.match(/HOA\s*(?:fee[s]?)?[:\s]*\$?\s*([\d,]+)/i)
  const hoaRaw = hoaMatch ? parseInt(hoaMatch[1].replace(/,/g, '')) : 0
  // Sanity check — HOA over $2k/mo is almost certainly a mis-parse
  const hoaMonthly = hoaRaw > 2000 ? 0 : hoaRaw

  // Days on market
  const domMatch = t.match(/(\d+)\s*(?:days?\s*on\s*(?:market|realtor|zillow|trulia)|days?\s*ago)/i)
  const daysOnMarket = domMatch ? parseInt(domMatch[1]) : 0

  // Units — for multi-family properties
  const unitsMatch = t.match(/(\d+)\s*-?\s*unit(?:s)?\b/i) ?? t.match(/(\d+)\s*unit[s]?\s+(?:multi|building|apartment)/i)
  const units = unitsMatch ? parseInt(unitsMatch[1]) : undefined

  // Property type — prefer an explicit label (e.g. "Property Type: Townhouse") since
  // Redfin pages contain "Condo/HOA" in the fee section even for townhouses/SFH.
  let propertyType = 'Townhouse'
  const typeLabel = t.match(/(?:property\s*type|home\s*type)\s*[:\-]\s*([^\n,;]{1,40})/i)
    ?? t.match(/\btype\s*:\s*(townhouse|condominium|condo|single[\s-]family\s*residential|single\s*family|multi[\s-]family|multifamily)\b/i)
  if (typeLabel) {
    const raw = typeLabel[1].trim().toLowerCase()
    if (/multi.?family|multifamily/.test(raw)) propertyType = 'Multi Family'
    else if (/condo|condominium/.test(raw)) propertyType = 'Condo'
    else if (/single.family|single\s*family/.test(raw)) propertyType = 'Single Family'
    else propertyType = 'Townhouse' // townhome/townhouse/etc.
  } else {
    // Keyword fallback
    if (/\bmulti.?family\b|\bmultifamily\b/i.test(t)) propertyType = 'Multi Family'
    else if (/\bcondominium\b|\bcondo\b(?!\s*[\/\-]\s*hoa|\s*fee|\s*assoc|\s*doc)/i.test(t)) propertyType = 'Condo'
    else if (/single.family|single\s*family/i.test(t)) propertyType = 'Single Family'
    // default stays 'Townhouse'
  }

  // City/state zip — "City, ST 12345"
  const cityMatch = t.match(/([A-Za-z][A-Za-z\s]{1,30}),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/)
  const city = cityMatch ? `${cityMatch[1].trim()}, ${cityMatch[2]} ${cityMatch[3]}` : ''

  return { price, beds, baths, sqft, yearBuilt, hoaMonthly, daysOnMarket, propertyType, units, city }
}

// ── Geocoder (OpenStreetMap Nominatim — free, no key) ─────────────────────────

// ── og:image scraper — used as fallback when bookmarklet doesn't send the photo ─
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 5000)
    const res = await fetch(url, {
      signal: ac.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/)
           ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/)
    return m?.[1] ?? null
  } catch {
    return null
  }
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`
    const res = await fetch(url, { headers: { 'User-Agent': 'carrie-me-away-app/1.0' } })
    const data = await res.json()
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch { /* fall through to default coords */ }
  return null
}

// ── HUD Fair Market Rent (free — get token at huduser.gov/hudapi/public/token) ─

function extractZip(city: string): string | null {
  const m = city.match(/\b(\d{5})\b/)
  return m ? m[1] : null
}

async function fetchHudFmr(zip: string, beds: number): Promise<number | null> {
  const token = process.env.HUD_TOKEN
  if (!token) return null
  try {
    const headers = { Authorization: `Bearer ${token}` }

    // Step 1: ZIP → county GEOID (pick highest residential ratio)
    const xwalkRes = await fetch(
      `https://www.huduser.gov/hudapi/public/usps?type=2&query=${zip}`,
      { headers },
    )
    if (!xwalkRes.ok) return null
    const xwalk = await xwalkRes.json()
    const results: { geoid: string; res_ratio: number }[] = xwalk?.data?.results ?? []
    if (!results.length) return null
    const best = results.reduce((a, b) => (b.res_ratio > a.res_ratio ? b : a))
    const fips = `${best.geoid}99999`

    // Step 2: FIPS → FMR data
    const fmrRes = await fetch(
      `https://www.huduser.gov/hudapi/public/fmr/data/${fips}`,
      { headers },
    )
    if (!fmrRes.ok) return null
    const fmrJson = await fmrRes.json()
    const basicdata = fmrJson?.data?.basicdata
    if (!basicdata) return null

    const bedroomMap: Record<number, string> = {
      0: 'Efficiency',
      1: 'One-Bedroom',
      2: 'Two-Bedroom',
      3: 'Three-Bedroom',
      4: 'Four-Bedroom',
    }
    const key = bedroomMap[Math.min(Math.round(beds), 4)]

    // Small-area FMR: basicdata is an array of zip-level rows
    if (Array.isArray(basicdata)) {
      const row =
        basicdata.find((r: Record<string, unknown>) => r.zip_code === zip) ??
        basicdata.find((r: Record<string, unknown>) => r.zip_code === 'MSA level')
      return (row?.[key] as number) ?? null
    }

    // Standard FMR: basicdata is a plain object
    return basicdata[key] ?? null
  } catch {
    return null
  }
}
