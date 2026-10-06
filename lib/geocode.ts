// Server-side geocoding — free services only, no API keys.
// Order: US Census (best for US street addresses) → OpenStreetMap Nominatim → ZIP centroid.

export interface GeocodeResult {
  lat: number
  lng: number
  precision: 'address' | 'zip'
}

const UA = { 'User-Agent': 'carrie-me-away-app/1.0' }

async function census(address: string): Promise<GeocodeResult | null> {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`
    const data = await fetch(url, { headers: UA }).then((r) => r.json())
    const c = data?.result?.addressMatches?.[0]?.coordinates
    return c ? { lat: c.y, lng: c.x, precision: 'address' } : null
  } catch {
    return null
  }
}

async function nominatim(query: string, precision: GeocodeResult['precision']): Promise<GeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?${query}&format=json&limit=1&countrycodes=us`
    const data = await fetch(url, { headers: UA }).then((r) => r.json())
    return data?.[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), precision } : null
  } catch {
    return null
  }
}

export async function geocode(address: string): Promise<GeocodeResult | null> {
  const hit = await census(address) ?? await nominatim(`q=${encodeURIComponent(address)}`, 'address')
  if (hit) return hit

  // ZIP-centroid fallback — at least pins to the right region when the specific
  // street is too new for either geocoder (common in new subdivisions).
  // Last 5-digit group — the first may be a 5-digit house number (e.g. "10618 Brewerton Ln")
  const zip = address.match(/\b\d{5}\b/g)?.pop()
  if (!zip) return null
  await new Promise((r) => setTimeout(r, 1100))  // Nominatim usage policy: max 1 request/second
  return nominatim(`postalcode=${zip}`, 'zip')
}

/** Accept client-supplied coordinates only if they look like a real point in the continental US. */
export function validCoords(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const la = Number(lat), ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null
  if (la < 24 || la > 50 || ln < -125 || ln > -66) return null
  return { lat: la, lng: ln }
}
