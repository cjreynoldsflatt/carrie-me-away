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
    const hudResult = zip ? await fetchHudFmr(zip, beds) : null
    const fmrPerUnit = hudResult?.fmr ?? null
    const isSafmr = hudResult?.isSafmr ?? false
    const fmrBase = fmrPerUnit ? fmrPerUnit * units : null
    // Apply property-type, bath, sqft, and age adjustments on top of the HUD baseline
    const fmr = fmrBase ? applyPropertyAdjustments(fmrBase, {
      propertyType: resolvedType,
      beds,
      baths: parsed.baths ?? 0,
      sqft: parsed.sqft,
      yearBuilt: parsed.yearBuilt,
    }) : null

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
      // Range width: ±15% for zip-specific SAFMR, ±20% for metro-level FMR
      estimated_rent: fmr,
      rent_low: fmr ? Math.round(fmr * (isSafmr ? 0.85 : 0.80)) : null,
      rent_high: fmr ? Math.round(fmr * (isSafmr ? 1.15 : 1.20)) : null,
      rent_confidence: fmr ? (isSafmr ? 'Medium' : 'Low') : 'Low',
      property_tax_annual: parsed.propertyTaxAnnual ?? Math.round((parsed.price ?? 0) * 0.01),
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
  const priceRe = /\$\s*(\d{1,3}(?:,\d{3})+)/g
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

  // Property tax — Redfin shows all payment breakdown figures as monthly;
  // realtor.com and manual entries show annual. Detect source from URL.
  const isRedfin = url?.includes('redfin.com') ?? false

  // Prefer explicit monthly indicator (e.g. "$450/mo"), then explicit annual label, then generic
  const taxMonthlyMatch =
    t.match(/property\s+tax(?:es)?[^$]{0,80}?\$\s*([\d,]+)\s*\/\s*(?:mo(?:nth)?)/i) ??
    t.match(/\$\s*([\d,]+)\s*\/\s*(?:mo(?:nth)?)[^.]{0,40}?property\s+tax/i)
  const taxAnnualMatch =
    t.match(/annual\s+tax(?:es)?[:\s]+\$?\s*([\d,]+)/i) ??
    t.match(/tax(?:es)?\s*\/\s*assessments?[:\s]+\$?\s*([\d,]+)/i)
  const taxGeneralMatch =
    t.match(/property\s+tax(?:es)?[^$]{0,80}?\$\s*([\d,]+)/i) ??
    t.match(/\$\s*([\d,]+)[^.]{0,30}?property\s+tax/i)

  let taxRaw: number | null = null
  let taxIsMonthly = isRedfin  // Redfin always shows monthly in its payment breakdown
  if (taxMonthlyMatch) {
    taxRaw = parseInt(taxMonthlyMatch[1].replace(/,/g, ''))
    taxIsMonthly = true
  } else if (taxAnnualMatch) {
    taxRaw = parseInt(taxAnnualMatch[1].replace(/,/g, ''))
    taxIsMonthly = false  // explicit "annual" label overrides Redfin default
  } else if (taxGeneralMatch) {
    taxRaw = parseInt(taxGeneralMatch[1].replace(/,/g, ''))
    // taxIsMonthly stays as isRedfin
  }
  const taxValue = taxRaw != null ? (taxIsMonthly ? taxRaw * 12 : taxRaw) : null
  const propertyTaxAnnual = taxValue && taxValue >= 200 && taxValue <= 60000 ? taxValue : null

  return { price, beds, baths, sqft, yearBuilt, hoaMonthly, daysOnMarket, propertyType, units, city, propertyTaxAnnual }
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

// Adjusts a base HUD FMR estimate using property-specific factors.
// All multipliers are relative — a Townhouse at the baseline beds/baths/age is 1.0.
function applyPropertyAdjustments(baseRent: number, opts: {
  propertyType: string
  beds: number
  baths: number
  sqft?: number | null
  yearBuilt?: number | null
}): number {
  let mult = 1.0

  // Property type premium/discount vs. standard apartment/townhouse
  if (opts.propertyType === 'Condo') mult *= 0.93
  else if (opts.propertyType === 'Single Family') mult *= 1.07
  // Townhouse = 1.0, Multi Family = 1.0 per unit

  // Bath premium — extra half-baths above the typical count for the bed count
  const baseBaths = opts.beds <= 2 ? 1 : 2
  const extraHalfBaths = Math.max(0, (opts.baths - baseBaths) * 2)
  mult *= 1 + extraHalfBaths * 0.025  // +2.5% per extra half bath

  // Square footage adjustment (sqft per bedroom vs. ~650 sqft/bed baseline)
  if (opts.sqft && opts.sqft > 0 && opts.beds > 0) {
    const sqftPerBed = opts.sqft / opts.beds
    if (sqftPerBed > 900) mult *= 1.08
    else if (sqftPerBed > 750) mult *= 1.04
    else if (sqftPerBed < 450) mult *= 0.93
    else if (sqftPerBed < 550) mult *= 0.97
    // 550–750: no adjustment (near baseline)
  }

  // Age adjustment — newer builds command a premium
  if (opts.yearBuilt && opts.yearBuilt > 1900) {
    const age = new Date().getFullYear() - opts.yearBuilt
    if (age < 5) mult *= 1.06
    else if (age < 15) mult *= 1.03
    else if (age < 30) mult *= 1.00
    else if (age < 50) mult *= 0.98
    else mult *= 0.95
  }

  return Math.round(baseRent * mult)
}

async function fetchHudFmr(zip: string, beds: number): Promise<{ fmr: number; isSafmr: boolean } | null> {
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

    // Small-area FMR: basicdata is an array of zip-level rows — zip-specific = SAFMR
    if (Array.isArray(basicdata)) {
      const zipRow = basicdata.find((r: Record<string, unknown>) => r.zip_code === zip)
      const msaRow = basicdata.find((r: Record<string, unknown>) => r.zip_code === 'MSA level')
      if (zipRow?.[key]) return { fmr: zipRow[key] as number, isSafmr: true }
      if (msaRow?.[key]) return { fmr: msaRow[key] as number, isSafmr: false }
      return null
    }

    // Standard county/metro FMR: basicdata is a plain object
    const fmr = basicdata[key] as number | undefined
    return fmr ? { fmr, isSafmr: false } : null
  } catch {
    return null
  }
}
