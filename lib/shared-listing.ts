// Server-side loader for a single listing as seen through a share link: the listing with rent
// comps applied, nearby rentals, the global assumptions, and both scenarios' headline numbers.
// Used by the public share API, link-preview metadata, and the OG image.
import { supabase } from './supabase'
import { rowToSaleListing, rowToRentalListing } from './db-mappers'
import { applyRentComps } from './rent-comps'
import { computeMetrics, computeConservativeRent, distanceMiles, realisticAssumptions, realisticRent } from './investment'
import { rowToAssumptions } from './settings'
import { DEFAULT_ASSUMPTIONS } from './defaults'
import type { GlobalAssumptions, SaleListing } from './types'

const COMP_RADIUS_MILES = 3  // matches the widest radius used for estimates

function scenario(l: SaleListing, a: GlobalAssumptions, rent: number) {
  return computeMetrics({
    price: l.price, hoaMonthly: l.hoaMonthly, estimatedRent: l.estimatedRent, conservativeRent: rent,
    propertyTaxAnnual: l.cmaPropertyTaxAnnual, insuranceRate: a.insuranceRate, closingCostRate: a.closingCostRate,
    repairs: l.repairs, superAnnualCost: l.superAnnualCost, vacancyRate: a.vacancyRate,
    maintenanceRate: a.maintenanceRate, capExRate: a.capExRate, propertyManagementRate: a.propertyManagementRate,
    tenancyYears: a.tenancyYears, turnoverCost: a.turnoverCost, pestControlMonthly: a.pestControlMonthly,
    lawnCareMonthly: a.lawnCareMonthly, appreciationRate: l.appreciationRate ?? 0.03,
    targetYieldOnCost: a.targetYieldOnCost, rentGrowthRate: a.rentGrowthRate, expenseInflationRate: a.expenseInflationRate,
    rentalDemand: l.rentalDemand, rentConfidence: l.rentConfidence, rentalEvidence: l.rentalEvidence,
  })
}

export async function loadSharedListing(id: string) {
  const [saleRes, rentalRes, settingsRes] = await Promise.all([
    supabase.from('sale_listings').select('*').eq('id', id).maybeSingle(),
    supabase.from('rental_listings').select('*'),
    supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
  ])
  if (!saleRes.data) return null

  const sale = saleRes.data
  const nearbyRentals = (rentalRes.data ?? []).filter(
    (r) => distanceMiles(sale.lat, sale.lng, r.lat, r.lng) <= COMP_RADIUS_MILES,
  )
  const [withComps] = applyRentComps([sale], nearbyRentals)
  const listing = rowToSaleListing(withComps)
  const assumptions = settingsRes.data ? rowToAssumptions(settingsRes.data) : DEFAULT_ASSUMPTIONS

  const consRent = computeConservativeRent(listing.estimatedRent, listing.rentLow, listing.rentHigh, listing.rentConfidence)
  const conservative = scenario(listing, assumptions, consRent)
  const realistic = scenario(listing, realisticAssumptions(assumptions, listing.propertyType), realisticRent(listing))

  return {
    listing,
    rentalListings: nearbyRentals.map(rowToRentalListing),
    assumptions,
    summary: { consRent, conservative, realistic },
  }
}
