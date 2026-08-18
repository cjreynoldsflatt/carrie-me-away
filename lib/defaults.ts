import type { GlobalAssumptions } from './types'

export const DEFAULT_ASSUMPTIONS: GlobalAssumptions = {
  vacancyRate: 0.05,
  maintenanceRate: 0.05,
  capExRate: 0.03,
  insuranceRate: 0.005,
  closingCostRate: 0.02,
  propertyManagementRate: 0.10,
  tenancyYears: 3,
  turnoverCost: 1500,
}

// Primary search center (Ellicott City / Columbia, MD)
export const SEARCH_CENTER = {
  lat: 39.30,
  lng: -76.88,
  radiusMiles: 12,
}
