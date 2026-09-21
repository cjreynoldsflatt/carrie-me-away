export type PropertyType = 'Townhouse' | 'Condo' | 'Single Family' | 'Multi Family'
export type RentConfidence = 'High' | 'Medium' | 'Low'
export type RentalEvidence = 'High' | 'Likely' | 'Unknown' | 'Confirmed Restrictions'
export type RentalDemand = 'Strong' | 'Moderate' | 'Weak' | 'Insufficient Data'

export type SortOption =
  | 'best'
  | 'worst'
  | 'price-asc'
  | 'price-desc'
  | 'date-added'
  | 'yield'
  | 'payback'
  | 'rent'
  | 'demand'
  | 'confidence'
  | 'newest'
  | 'hoa'

export interface SaleListing {
  id: string
  address: string
  city: string
  lat: number
  lng: number
  price: number
  propertyType: PropertyType
  beds: number
  baths: number
  sqft: number
  yearBuilt: number
  daysOnMarket: number
  hoaMonthly: number
  units?: number        // multi-family only; undefined = single unit
  photoUrl?: string
  community?: string
  listingUrl?: string
  // Rent estimate
  estimatedRent: number
  rentLow: number
  rentHigh: number
  rentConfidence: RentConfidence
  conservativeRent: number        // used for grading; lower-middle of range, or estimatedRent when manually set
  // Assumptions — property tax
  propertyTaxAnnual: number          // seller's current tax (display only; may include Homestead credit)
  sdatAssessedValue?: number         // SDAT phased-in assessed value, if available from DB
  cmaPropertyTaxAnnual: number       // CMA estimated tax — full assessment, no Homestead credit
  projectedPropertyTaxAnnual: number // conservative post-reassessment estimate
  propertyTaxIsEstimated: boolean    // true = derived from heuristic (no SDAT data)
  propertyTaxWarning: boolean        // true = CMA tax is materially above seller's current bill
  insuranceAnnual: number
  closingCostRate: number
  repairs: number
  superAnnualCost: number         // Super maintenance protection; 0 = disabled
  vacancyRate: number
  maintenanceRate: number
  capExRate: number
  propertyManagementRate: number
  tenancyYears: number
  turnoverCost: number
  // Computed investment metrics
  totalCashInvested: number
  grossAnnualRent: number
  vacancyReserve: number
  maintenanceReserve: number
  capExReserve: number
  turnoverReserve: number
  netAnnualIncome: number
  netCashYield: number
  paybackYears: number
  investmentScore: number
  // 5-year year-by-year cash flow model
  fiveYearCashFlows: number[]          // [yr1, yr2, yr3, yr4, yr5] net cash flow each year
  cumulativeFiveYearCashFlow: number   // sum of the five years
  // Community signals
  rentalEvidence: RentalEvidence
  rentalDemand: RentalDemand
  // Appreciation
  appreciationRate: number   // annualized historical rate, e.g. 0.03 = 3%
  fetchedAt?: string         // ISO timestamp when added to DB
}

export interface RentalListing {
  id: string
  address: string
  city: string
  lat: number
  lng: number
  monthlyRent: number
  beds: number
  baths: number
  sqft: number
  daysOnMarket: number
  community?: string
  propertyType: PropertyType
}

export interface GlobalAssumptions {
  vacancyRate: number             // default 0.05
  maintenanceRate: number         // default 0.05 (routine repairs, appliances, wear)
  capExRate: number               // default 0.03 (HVAC, roof, water heater, windows, flooring)
  insuranceRate: number           // default 0.005 (0.5% of price/yr)
  closingCostRate: number         // default 0.03
  propertyManagementRate: number  // default 0.10; 0 = self-manage
  tenancyYears: number            // default 3 (expected tenancy in years)
  turnoverCost: number            // default 1500 (one-time cost per tenant turnover)
  pestControlMonthly: number      // default 50 ($/month)
  lawnCareMonthly: number         // default 50 ($/month)
  targetYieldOnCost: number       // default 0.05 (5%) — Maximum Purchase Price target
  rentGrowthRate: number          // default 0.03 (3%/yr) — annual rent growth used in 5-yr model
  expenseInflationRate: number    // default 0.025 (2.5%/yr) — annual fixed-expense inflation
}

export interface SearchSettings {
  centerLat: number
  centerLng: number
  radiusMiles: number
  minPrice: number
  maxPrice: number
  propertyTypes: PropertyType[]
  minBeds: number
  minBaths: number
  maxHoaMonthly: number
  minNetYield: number
}

export interface LayerSettings {
  forSale: boolean
  forRent: boolean
  communities: boolean
  investmentScore: boolean
}
