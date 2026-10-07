// Rent estimates from saved rental comps (rental_listings), with HUD as the fallback.
// Applied to raw DB rows when listings are read, so every new comp updates estimates
// immediately without rewriting sale_listings.
import { distanceMiles } from './investment'

export const MIN_COMPS = 3
const RADII_MILES = [1.5, 3]        // try close comps first, widen if too few
const MAX_COMP_AGE_DAYS = 180       // older asking rents are stale

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export interface CompEstimate {
  low: number   // 25th percentile
  mid: number   // median
  high: number  // 75th percentile
  count: number
}

function percentile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i), hi = Math.ceil(i)
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo))
}

export function estimateFromComps(sale: Row, rentals: Row[]): CompEstimate | null {
  // Multi-family is priced per unit — single-home comps don't apply
  if (sale.property_type === 'Multi Family' || !sale.beds) return null
  const cutoff = Date.now() - MAX_COMP_AGE_DAYS * 86_400_000
  const candidates = rentals.filter((r) =>
    r.beds === sale.beds &&
    r.property_type === sale.property_type &&
    r.monthly_rent > 0 &&
    (!r.fetched_at || new Date(r.fetched_at).getTime() >= cutoff),
  )
  for (const radius of RADII_MILES) {
    const rents = candidates
      .filter((r) => distanceMiles(sale.lat, sale.lng, r.lat, r.lng) <= radius)
      .map((r) => r.monthly_rent as number)
      .sort((a, b) => a - b)
    if (rents.length >= MIN_COMPS) {
      return { low: percentile(rents, 0.25), mid: percentile(rents, 0.5), high: percentile(rents, 0.75), count: rents.length }
    }
  }
  return null
}

/**
 * Rewrites rent fields on sale rows from comps when available and adds:
 *   rent_source: 'comps' | 'hud' | 'manual'
 *   rent_comp_count: number of comps used
 *   auto_rent: the automated estimate a user override would reset to
 * HUD values in the DB are kept as-is (rent_low/rent_high always hold the HUD range,
 * whose midpoint is the HUD FMR), so they remain the fallback.
 */
export function applyRentComps(sales: Row[], rentals: Row[]): Row[] {
  return sales.map((row) => {
    const comps = estimateFromComps(row, rentals)
    const hudMid = row.rent_low > 0 && row.rent_high > 0 ? Math.round((row.rent_low + row.rent_high) / 2) : null
    const autoRent = comps?.mid ?? hudMid
    if (row.rent_confidence === 'High') {
      return { ...row, rent_source: 'manual', rent_comp_count: comps?.count ?? 0, auto_rent: autoRent }
    }
    if (!comps) return { ...row, rent_source: 'hud', rent_comp_count: 0, auto_rent: autoRent }
    return {
      ...row,
      estimated_rent: comps.mid,
      rent_low: comps.low,
      rent_high: comps.high,
      rent_confidence: 'Medium',
      rent_source: 'comps',
      rent_comp_count: comps.count,
      auto_rent: comps.mid,
    }
  })
}
