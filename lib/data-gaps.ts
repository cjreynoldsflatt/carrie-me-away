// Which listings need more data before their numbers can be trusted, and where to get it.
// Every gap links to the Redfin page where running the bookmarklet fills it in.
import type { SaleListing } from './types'

export interface DataGap {
  key: 'no-comps' | 'details'
  label: string          // short chip text
  detail: string         // one-line explanation
  href: string           // Redfin page to open
  action: string         // what to do there
  button: string         // short button label naming the page it opens
}

// 3–4 comps is usable (shown as a quiet 'thin' note on the card); only the HUD fallback (<3) needs action
const REDFIN_TYPE: Record<string, string> = { Townhouse: 'townhouse', 'Single Family': 'house', Condo: 'condo' }

/** Redfin rentals search for the listing's ZIP and property type (where comps come from). */
export function redfinRentalsUrl(l: Pick<SaleListing, 'city' | 'propertyType'>): string | null {
  const zip = l.city.match(/\b\d{5}\b/g)?.pop()
  if (!zip) return null
  const type = REDFIN_TYPE[l.propertyType]
  return `https://www.redfin.com/zipcode/${zip}/rentals${type ? `/filter/property-type=${type}` : ''}`
}

export function dataGaps(l: SaleListing): DataGap[] {
  const gaps: DataGap[] = []
  const rentals = redfinRentalsUrl(l)
  const zip = l.city.match(/\b\d{5}\b/g)?.pop() ?? ''

  // Rent: comps beat HUD, which runs high in these markets; manual rent is the owner's call
  if (rentals && l.propertyType !== 'Multi Family' && l.rentSource !== 'manual') {
    if (l.rentSource !== 'comps') {
      gaps.push({
        key: 'no-comps',
        label: 'No rent comps',
        detail: `Rent is a HUD estimate — save ${l.beds}-bed ${l.propertyType.toLowerCase()} rentals in ${zip} to replace it.`,
        href: rentals,
        action: `Open ${zip} rentals on Redfin, then click the bookmarklet`,
        button: `${zip} rentals search`,
      })
    }
  }

  // Listing details the search card doesn't carry (filled from the Redfin detail page)
  // New construction has no tax history on Redfin yet, so a placeholder tax can't be filled there
  const newBuild = l.yearBuilt >= new Date().getFullYear() - 1
  const placeholderTax = !newBuild && l.propertyTaxAnnual === Math.round(l.price * 0.01)
  if (l.listingUrl?.includes('redfin.com') && (!l.yearBuilt || !l.sqft || placeholderTax)) {
    const missing = [!l.yearBuilt && 'year built', !l.sqft && 'size', placeholderTax && 'actual tax bill'].filter(Boolean).join(', ')
    gaps.push({
      key: 'details',
      label: 'Missing details',
      detail: `Missing ${missing}${l.hoaMonthly > 0 ? '' : ' (HOA may be missing too)'}.`,
      href: l.listingUrl,
      action: 'Open the listing on Redfin, then click the bookmarklet',
      button: 'Listing page',
    })
  }
  return gaps
}
