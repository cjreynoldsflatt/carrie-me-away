// External links for a listing.

/** SpotCrime map centered on the property, with recent incidents around it. */
export function crimeMapUrl(lat: number, lng: number): string {
  return `https://spotcrime.com/map?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}`
}

/** CrimeGrade's green-to-red crime heat map for the property's ZIP (area overview; ZIP-level only). */
export function crimeGradeUrl(city: string): string | null {
  const zip = city.match(/\b(\d{5})\b/g)?.pop()
  return zip ? `https://crimegrade.org/safest-places-in-${zip}/` : null
}

/** Web search for the property's HOA website (by community name when known, else by address). */
export function hoaSearchUrl(l: { community?: string; address: string; city: string }): string {
  const town = l.city.replace(/\s*\d{5}(-\d{4})?$/, '')   // "Frederick, MD 21703" → "Frederick, MD"
  const q = l.community ? `"${l.community}" HOA ${town}` : `${l.address} ${l.city} HOA`
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}
