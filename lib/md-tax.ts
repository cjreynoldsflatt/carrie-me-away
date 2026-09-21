// Maryland property tax rate lookup and CMA estimation.
//
// Seller's current tax bill may include a Homestead Tax Credit that
// caps annual assessment increases for owner-occupants. CMA, as a
// rental investor, does NOT qualify for the Homestead credit and will
// be taxed on the full SDAT phased-in assessment.
//
// Maryland reassesses on a 3-year cycle with increases phased in over
// 3 years. Purchase price does NOT trigger immediate reassessment.

// FY2025 combined rates (state $0.112 + county) per $100 of assessed value.
// Municipal surcharges noted where applicable.
const MD_RATES: Record<string, { totalPer100: number; name: string }> = {
  Howard:              { totalPer100: 1.126, name: 'Howard County' },        // 0.112 + 1.014
  Carroll:             { totalPer100: 1.130, name: 'Carroll County' },        // 0.112 + 1.018
  BaltimoreCounty:     { totalPer100: 0.957, name: 'Baltimore County' },      // 0.112 + 0.845
  Montgomery:          { totalPer100: 0.810, name: 'Montgomery County' },     // 0.112 + 0.698
  AnneArundel:         { totalPer100: 1.045, name: 'Anne Arundel County' },   // 0.112 + 0.933
  PrinceGeorges:       { totalPer100: 1.072, name: "Prince George's County" },// 0.112 + 0.960
  Harford:             { totalPer100: 1.072, name: 'Harford County' },        // 0.112 + 0.960 (approx)
  SykesvilleMuni:      { totalPer100: 1.370, name: 'Carroll County (Sykesville)' }, // + $0.240 municipal
}

// City keyword → rate key. More-specific strings first.
const CITY_TO_KEY: [string, string][] = [
  ['sykesville',      'SykesvilleMuni'],
  ['ellicott city',   'Howard'],
  ['columbia',        'Howard'],
  ['clarksville',     'Howard'],
  ['elkridge',        'Howard'],
  ['jessup',          'Howard'],
  ['savage',          'Howard'],
  ['eldersburg',      'Carroll'],
  ['westminster',     'Carroll'],
  ['mount airy',      'Carroll'],
  ['catonsville',     'BaltimoreCounty'],
  ['owings mills',    'BaltimoreCounty'],
  ['towson',          'BaltimoreCounty'],
  ['timonium',        'BaltimoreCounty'],
  ['pikesville',      'BaltimoreCounty'],
  ['rockville',       'Montgomery'],
  ['bethesda',        'Montgomery'],
  ['silver spring',   'Montgomery'],
  ['gaithersburg',    'Montgomery'],
  ['germantown',      'Montgomery'],
  ['annapolis',       'AnneArundel'],
  ['glen burnie',     'AnneArundel'],
  ['pasadena',        'AnneArundel'],
  ['bowie',           'PrinceGeorges'],
  ['greenbelt',       'PrinceGeorges'],
  ['college park',    'PrinceGeorges'],
  ['bel air',         'Harford'],
  ['aberdeen',        'Harford'],
]

export function detectMdRateKey(city: string): string | null {
  const lower = city.toLowerCase()
  for (const [kw, key] of CITY_TO_KEY) {
    if (lower.includes(kw)) return key
  }
  return null
}

export interface MdPropertyTaxEstimate {
  /** What the seller currently pays (from listing data — may include Homestead credit) */
  sellerTaxAnnual: number
  /** Conservative CMA estimated tax — full assessed value, no Homestead credit */
  cmaEstimated: number
  /** Conservative estimate after next SDAT reassessment cycle */
  projectedAfterReassessment: number
  /** true = heuristic estimate used (no SDAT phased-in assessment available) */
  isEstimated: boolean
  /** true = CMA estimated tax is ≥15% above what the seller currently pays */
  warning: boolean
  /** Human-readable county name, null if city not recognized */
  countyName: string | null
  /** Combined rate per $100 applied, null if county unknown */
  ratePer100: number | null
}

/**
 * Estimate CMA property tax for a Maryland property.
 *
 * When `sdatAssessedValue` is provided it's used directly (no Homestead
 * adjustment needed — the full assessment applies to rental owners).
 * Without it, the function derives a conservative estimate from the
 * seller's implied taxable assessment vs. the purchase price.
 */
export function estimateMdPropertyTax(
  price: number,
  sellerTaxAnnual: number,
  city: string,
  sdatAssessedValue?: number,
): MdPropertyTaxEstimate {
  const rateKey = detectMdRateKey(city)
  const rateInfo = rateKey ? MD_RATES[rateKey] : null

  if (!rateInfo) {
    // County unrecognized — apply a conservative 0.95% effective-rate floor
    const rate = 0.0095
    const cmaEstimated = Math.max(
      Math.round(sellerTaxAnnual * 1.20),
      Math.round(price * rate),
    )
    const projectedAfterReassessment = Math.max(cmaEstimated, Math.round(price * (rate + 0.0010)))
    return {
      sellerTaxAnnual,
      cmaEstimated,
      projectedAfterReassessment,
      isEstimated: true,
      warning: cmaEstimated > sellerTaxAnnual * 1.15,
      countyName: null,
      ratePer100: null,
    }
  }

  const rateDecimal = rateInfo.totalPer100 / 100

  let cmaAssessment: number
  let isEstimated: boolean

  if (sdatAssessedValue && sdatAssessedValue > 0) {
    // SDAT phased-in assessment available — rental owner pays on full value
    cmaAssessment = sdatAssessedValue
    isEstimated = false
  } else {
    // Derive seller's implied taxable assessment from their current bill.
    // This may be below the full SDAT assessment if Homestead credits have
    // capped their taxable base below market. Use the larger of:
    //   • the seller's implied assessment (minimum floor), and
    //   • 80% of purchase price (MD aims for 100% of market value;
    //     80% is conservative for lapsed or phase-in gap)
    const sellerImplied = rateDecimal > 0 ? sellerTaxAnnual / rateDecimal : 0
    cmaAssessment = Math.max(sellerImplied, price * 0.80)
    isEstimated = true
  }

  const cmaEstimated = Math.round(cmaAssessment * rateDecimal)

  // Projected after next 3-year reassessment: SDAT typically moves toward
  // market value. Conservative: max of current CMA assessment and 90% of price.
  const projectedAssessment = Math.max(cmaAssessment, price * 0.90)
  const projectedAfterReassessment = Math.round(projectedAssessment * rateDecimal)

  return {
    sellerTaxAnnual,
    cmaEstimated,
    projectedAfterReassessment,
    isEstimated,
    warning: cmaEstimated > sellerTaxAnnual * 1.15,
    countyName: rateInfo.name,
    ratePer100: rateInfo.totalPer100,
  }
}
