// Rentcast API adapter (server-side only — keeps API key out of the browser)
// Free tier: 50 requests/month. Every exported function here costs 1 call.
// Budget is enforced via the 24h refresh throttle in /api/refresh.

const BASE = 'https://api.rentcast.io/v1'

function rcHeaders() {
  return {
    'X-Api-Key': process.env.RENTCAST_API_KEY!,
    Accept: 'application/json',
  }
}

// ── Response shapes ───────────────────────────────────────────────────────────

export interface RCListing {
  id: string
  formattedAddress: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zipCode: string
  latitude: number
  longitude: number
  propertyType: string  // "Townhouse" | "Condo" | "Single Family" | ...
  bedrooms: number
  bathrooms: number
  squareFootage?: number
  yearBuilt?: number
  price: number
  status: string
  daysOnMarket?: number
  hoa?: { fee?: number }
  photos?: { href: string }[]
  subdivision?: string
}

export interface RCAVM {
  rent: number
  rentRangeLow: number
  rentRangeHigh: number
  comparables?: {
    id?: string
    correlation: number
    price: number
    bedrooms: number
    bathrooms: number
    squareFootage?: number
    distance: number
    daysOnMarket?: number
    formattedAddress?: string
  }[]
}

// ── Fetch functions (each = 1 API call) ──────────────────────────────────────

/** Fetch active for-sale listings within a radius. Cost: 1 call. */
export async function fetchSaleListings(
  lat: number,
  lng: number,
  radiusMiles: number,
): Promise<RCListing[]> {
  const url = new URL(`${BASE}/listings/sale`)
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lng))
  url.searchParams.set('radius', String(radiusMiles))
  url.searchParams.set('status', 'Active')
  url.searchParams.set('limit', '500')

  const res = await fetch(url.toString(), { headers: rcHeaders() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Rentcast sale listings ${res.status}: ${text}`)
  }
  const data = await res.json()
  // API may return array directly or { listings: [...] }
  return Array.isArray(data) ? data : (data.listings ?? data.data ?? [])
}

/** Fetch active for-rent listings within a radius. Cost: 1 call. */
export async function fetchRentalListings(
  lat: number,
  lng: number,
  radiusMiles: number,
): Promise<RCListing[]> {
  const url = new URL(`${BASE}/listings/rental/long-term`)
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lng))
  url.searchParams.set('radius', String(radiusMiles))
  url.searchParams.set('status', 'Active')
  url.searchParams.set('limit', '500')

  const res = await fetch(url.toString(), { headers: rcHeaders() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Rentcast rental listings ${res.status}: ${text}`)
  }
  const data = await res.json()
  return Array.isArray(data) ? data : (data.listings ?? data.data ?? [])
}

/** Fetch rent AVM + comps for a single property. Cost: 1 call. */
export async function fetchRentAVM(
  address: string,
  propertyType: string,
  bedrooms: number,
  bathrooms: number,
  squareFootage?: number,
): Promise<RCAVM> {
  const url = new URL(`${BASE}/avm/rent/long-term`)
  url.searchParams.set('address', address)
  url.searchParams.set('propertyType', propertyType)
  url.searchParams.set('bedrooms', String(bedrooms))
  url.searchParams.set('bathrooms', String(bathrooms))
  if (squareFootage) url.searchParams.set('squareFootage', String(squareFootage))
  url.searchParams.set('compCount', '10')

  const res = await fetch(url.toString(), { headers: rcHeaders() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Rentcast AVM ${res.status}: ${text}`)
  }
  return res.json() as Promise<RCAVM>
}
