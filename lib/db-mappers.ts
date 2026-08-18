// Maps raw Supabase rows to the domain types used by the app.
// Applies computeMetrics with DEFAULT_ASSUMPTIONS so the store's
// computedSaleListings() can later override with user assumption changes.

import { computeMetrics } from './investment'
import { DEFAULT_ASSUMPTIONS } from './defaults'
import type { SaleListing, RentalListing, PropertyType, RentConfidence, RentalEvidence, RentalDemand } from './types'

// Loose type matching Supabase select('*') response
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export function rowToSaleListing(row: Row): SaleListing {
  const estimatedRent = row.estimated_rent ?? 0
  const hoaMonthly = row.hoa_monthly ?? 0
  const propertyTaxAnnual = row.property_tax_annual ?? Math.round(row.price * 0.01)
  const repairs = row.repairs ?? 10000

  const metrics = computeMetrics({
    price: row.price,
    hoaMonthly,
    estimatedRent,
    propertyTaxAnnual,
    insuranceRate: DEFAULT_ASSUMPTIONS.insuranceRate,
    closingCostRate: DEFAULT_ASSUMPTIONS.closingCostRate,
    repairs,
    vacancyRate: DEFAULT_ASSUMPTIONS.vacancyRate,
    maintenanceRate: DEFAULT_ASSUMPTIONS.maintenanceRate,
    propertyManagementRate: DEFAULT_ASSUMPTIONS.propertyManagementRate,
    rentalDemand: (row.rental_demand ?? 'Insufficient Data') as RentalDemand,
    rentConfidence: (row.rent_confidence ?? 'Low') as RentConfidence,
    rentalEvidence: (row.rental_evidence ?? 'Unknown') as RentalEvidence,
  })

  return {
    id: row.id,
    address: row.address,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    price: row.price,
    propertyType: row.property_type as PropertyType,
    beds: row.beds,
    baths: row.baths,
    sqft: row.sqft ?? 0,
    yearBuilt: row.year_built ?? 0,
    daysOnMarket: row.days_on_market ?? 0,
    hoaMonthly,
    units: row.units ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    community: row.community ?? undefined,
    listingUrl: row.listing_url ?? undefined,
    estimatedRent,
    rentLow: row.rent_low ?? 0,
    rentHigh: row.rent_high ?? 0,
    rentConfidence: (row.rent_confidence ?? 'Low') as RentConfidence,
    propertyTaxAnnual,
    closingCostRate: DEFAULT_ASSUMPTIONS.closingCostRate,
    repairs,
    vacancyRate: DEFAULT_ASSUMPTIONS.vacancyRate,
    maintenanceRate: DEFAULT_ASSUMPTIONS.maintenanceRate,
    propertyManagementRate: DEFAULT_ASSUMPTIONS.propertyManagementRate,
    rentalEvidence: (row.rental_evidence ?? 'Unknown') as RentalEvidence,
    rentalDemand: (row.rental_demand ?? 'Insufficient Data') as RentalDemand,
    appreciationRate: row.appreciation_rate ?? 0.03,
    fetchedAt: row.fetched_at ?? undefined,
    ...metrics,
  }
}

export function rowToRentalListing(row: Row): RentalListing {
  return {
    id: row.id,
    address: row.address,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    monthlyRent: row.monthly_rent,
    beds: row.beds,
    baths: row.baths,
    sqft: row.sqft ?? 0,
    daysOnMarket: row.days_on_market ?? 0,
    community: row.community ?? undefined,
    propertyType: row.property_type as PropertyType,
  }
}
