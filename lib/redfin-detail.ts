// Targeted parser for the text of a Redfin listing detail page.
// Search-result cards only show price/beds/baths/sqft; the detail page adds HOA, year built,
// property type, days on market, and the actual tax bill. Patterns are anchored to Redfin's
// labels so prices from "nearby homes" further down the page can't be picked up.

export interface RedfinDetail {
  hoaMonthly?: number
  yearBuilt?: number
  propertyType?: 'Townhouse' | 'Condo' | 'Single Family' | 'Multi Family'
  daysOnMarket?: number
  // Status badge in the page header: 'Active', 'Coming soon · Oct 15', 'Pending', 'Sold · Oct 2, 2026', 'Off market'
  marketStatus?: string
  propertyTaxAnnual?: number   // most recent year in the tax history table (actual bill)
  beds?: number
  baths?: number
  sqft?: number
  // Builder floor-plan listing ("Van Dorn Plan, … Lake Linganore Creekside Townhomes built by NVHomes")
  isPlan?: boolean
  planName?: string
  planCommunity?: string
}

const num = (s: string) => Number(s.replace(/,/g, ''))

export function parseRedfinDetail(raw: string): RedfinDetail {
  const t = raw.replace(/\s+/g, ' ')
  const out: RedfinDetail = {}

  // Key facts row: "Townhome Property Type 1979 Year Built $174 Price/Sq.Ft. $85/mo HOA Dues"
  const hoa = t.match(/\$([\d,]+)\s*\/\s*mo\s+HOA Dues/i) ?? t.match(/HOA dues \$([\d,]+)/i)
  if (hoa) out.hoaMonthly = num(hoa[1])

  const year = t.match(/\b(1[89]\d\d|20\d\d) Year Built\b/)
  if (year) out.yearBuilt = num(year[1])

  const type = t.match(/(Townhome|Townhouse|Condo(?:\/Co-op)?|Single Family Residential|Multi-Family[^A-Z]*?) Property Type/i)
  if (type) {
    const v = type[1].toLowerCase()
    out.propertyType = v.startsWith('town') ? 'Townhouse'
      : v.startsWith('condo') ? 'Condo'
      : v.startsWith('single') ? 'Single Family'
      : 'Multi Family'
  }

  const dom = t.match(/(\d+) days? on Redfin/i)
  if (dom) out.daysOnMarket = num(dom[1])

  // Tax history: "Year Property tax Land + Additions Assessment* 2026 $3,833 (+5.3%) ..."
  const tax = t.match(/Year Property tax Land \+ Additions Assessment\*?\s+(?:20\d\d) \$([\d,]+)/i)
  if (tax) {
    const v = num(tax[1])
    if (v >= 200 && v <= 60_000) out.propertyTaxAnnual = v
  } else {
    // No tax history yet (new public record): fall back to Redfin's payment-calculator estimate
    // ("Property taxes $247" per month) — home-specific, and better than the 1%-of-price placeholder
    const calc = t.match(/Payment calculator[^]{0,300}?Property taxes \$([\d,]+)/i)
    if (calc) {
      const v = num(calc[1]) * 12
      if (v >= 200 && v <= 60_000) out.propertyTaxAnnual = v
    }
  }

  // Header summary: "4 bd • 2 ba • 1,720 sq ft"
  const summary = t.match(/(\d+(?:\.\d+)?) bd • (\d+(?:\.\d+)?) ba • ([\d,]+) sq ft/)
  if (summary) {
    out.beds = num(summary[1])
    out.baths = num(summary[2])
    out.sqft = num(summary[3])
    // The status badge sits just above the price/summary ("Coming soon on oct 15 $300,000 … 4 bd • 2 ba")
    const head = t.slice(Math.max(0, (summary.index ?? 0) - 300), summary.index)
    const cap = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase())
    const soon = head.match(/Coming soon(?: on ([A-Za-z]{3,9} \d{1,2}))?/i)
    const sold = head.match(/\bSold(?: on ([A-Za-z]{3,9} \d{1,2}, \d{4}))?/i)
    out.marketStatus = soon ? `Coming soon${soon[1] ? ` · ${cap(soon[1])}` : ''}`
      : /\b(Pending|Contingent|Under contract)\b/i.test(head) ? 'Pending'
      : sold ? `Sold${sold[1] ? ` · ${cap(sold[1])}` : ''}`
      : /\bOff market\b/i.test(head) ? 'Off market'
      : 'Active'
  }

  // New-construction plan listings have no year built or tax history — mark them as new builds
  const plan = t.match(/\bPlan, [^|]{0,60}?\b\d{5} (.{3,80}?) built by ([A-Z][\w&.' ]{1,40}?)(?= Ready| Under| Coming| To be| Quick| Move| \$|\s*$)/)
  if (plan) {
    out.isPlan = true
    out.planCommunity = plan[1].trim()
    const name = t.match(/sq ft ([A-Z][\w' -]{1,40}?) Plan, /)
    if (name) out.planName = `${name[1].trim()} Plan`
    if (!out.yearBuilt) out.yearBuilt = new Date().getFullYear()
  }

  return out
}

/**
 * Tidy an MLS subdivision name into a community name people search for:
 * "HAMPTONS WEST PH 1B3" → "Hamptons West", "RENN QUARTER PH 2 8" → "Renn Quarter".
 */
export function cleanSubdivision(raw: string | null | undefined): string | null {
  if (!raw) return null
  const base = raw
    .replace(/\b(PH|PHASE|SEC|SECT|SECTION|LOT|BLK|BLOCK|UNIT|PLAT|PT)\b.*$/i, '')  // drop phase/section suffixes
    .replace(/[\d\s-]+$/, '')                                                        // and trailing numbers
    .trim()
  if (base.length < 3 || /^(NONE|N\/A|NA|OTHER|UNKNOWN)$/i.test(base)) return null
  return base.toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/(?!^)\b(Of|The|At|And|On|In)\b/g, (w) => w.toLowerCase())   // "Villages of Urbana"
}
