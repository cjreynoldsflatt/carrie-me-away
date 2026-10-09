// Rent estimates from saved rental comps (rental_listings), with HUD as the fallback.
// Applied to raw DB rows when listings are read, so every new comp updates estimates
// immediately without rewriting sale_listings.
import { distanceMiles } from './investment'

export const MIN_COMPS = 3
const RADII_MILES = [1.5, 3]        // try close comps first, widen if too few
export const MAX_COMP_AGE_DAYS = 90  // last seen on Redfin longer ago than this = stale

/** True when a rental was seen on Redfin recently enough to count as a comp. */
export function isFreshComp(fetchedAt: string | null | undefined): boolean {
  return !fetchedAt || Date.now() - new Date(fetchedAt).getTime() <= MAX_COMP_AGE_DAYS * 86_400_000
}

/**
 * Redfin page for a saved rental comp. Only the home ID matters — Redfin redirects any
 * /STATE/City/slug/home/<id> path to the right listing — so the slug is best-effort.
 */
export function rentalRedfinUrl(r: { id: string; address: string; city: string }): string | null {
  const homeId = r.id.match(/^redfin-rental-(\d+)$/)?.[1]
  if (!homeId) return null
  const m = r.city.match(/^(.*?),\s*([A-Z]{2})\s+(\d{5})/)   // "Frederick, MD 21704"
  const slug = (s: string) => s.trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return m
    ? `https://www.redfin.com/${m[2]}/${slug(m[1])}/${slug(r.address)}-${m[3]}/home/${homeId}`
    : `https://www.redfin.com/home/${homeId}`
}

// Size adjustment: rent doesn't scale linearly with size, so each comp's rent moves by a modest
// amount per square foot of difference from the subject, capped so one huge/tiny comp can't swing it.
export const SIZE_ADJ_PER_SQFT = 0.5
const MAX_SIZE_ADJ = 0.30

/** A comp's rent adjusted to the subject property's size (unchanged if either size is unknown). */
export function sizeAdjustedRent(compRent: number, compSqft: number | null | undefined, subjectSqft: number | null | undefined): number {
  if (!compSqft || !subjectSqft) return compRent
  const adj = (subjectSqft - compSqft) * SIZE_ADJ_PER_SQFT
  const cap = compRent * MAX_SIZE_ADJ
  return Math.round(compRent + Math.max(-cap, Math.min(cap, adj)))
}

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

// Bedrooms: comps may differ by one bedroom. Size is adjusted separately (above), so this only
// covers what's left — a typical 3→4-bed gap here is ~$500, most of it explained by size.
export const BED_ADJ = 200
export const MAX_BED_DIFF = 1

/** A comp's rent adjusted to the subject's size and bedroom count. */
export function compAdjustedRent(
  comp: { monthly_rent?: number; monthlyRent?: number; sqft?: number | null; beds: number },
  subject: { sqft?: number | null; beds: number },
): number {
  const rent = comp.monthly_rent ?? comp.monthlyRent ?? 0
  return sizeAdjustedRent(rent, comp.sqft, subject.sqft) + (subject.beds - comp.beds) * BED_ADJ
}

/** Drop rents far from the group's median (room rentals, typos) before taking percentiles. */
function trimOutliers(sorted: number[]): number[] {
  if (sorted.length < 5) return sorted
  const med = percentile(sorted, 0.5)
  return sorted.filter((r) => r >= med * 0.6 && r <= med * 1.6)
}

export function estimateFromComps(sale: Row, rentals: Row[]): CompEstimate | null {
  // Multi-family is priced per unit — single-home comps don't apply
  if (sale.property_type === 'Multi Family' || !sale.beds) return null
  const excluded = new Set<string>(sale.excluded_comp_ids ?? [])   // comps the user ruled out for this property
  const candidates = rentals.filter((r) =>
    Math.abs(r.beds - sale.beds) <= MAX_BED_DIFF &&
    r.property_type === sale.property_type &&
    r.monthly_rent > 0 &&
    isFreshComp(r.fetched_at) &&
    !excluded.has(r.id),
  )
  for (const radius of RADII_MILES) {
    const rents = trimOutliers(candidates
      .filter((r) => distanceMiles(sale.lat, sale.lng, r.lat, r.lng) <= radius)
      .map((r) => compAdjustedRent(r as { monthly_rent: number; sqft: number | null; beds: number }, sale as { sqft: number | null; beds: number }))
      .sort((a, b) => a - b))
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
