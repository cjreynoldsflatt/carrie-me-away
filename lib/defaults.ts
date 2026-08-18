import type { GlobalAssumptions } from './types'

export const DEFAULT_ASSUMPTIONS: GlobalAssumptions = {
  vacancyRate: 0.05,
  maintenanceRate: 0.10,
  insuranceRate: 0.005,
  closingCostRate: 0.02,
  propertyManagementRate: 0.10,
}

// Primary search center used for Rentcast API calls (Ellicott City / Columbia, MD)
export const SEARCH_CENTER = {
  lat: 39.30,
  lng: -76.88,
  radiusMiles: 12,
}
