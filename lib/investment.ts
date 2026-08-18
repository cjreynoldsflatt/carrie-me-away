import type { RentalDemand, RentalEvidence, RentConfidence } from './types'

interface RawListing {
  price: number
  hoaMonthly: number
  estimatedRent: number
  propertyTaxAnnual: number
  insuranceRate: number
  closingCostRate: number
  repairs: number
  vacancyRate: number
  maintenanceRate: number
  propertyManagementRate: number
  rentalDemand: RentalDemand
  rentConfidence: RentConfidence
  rentalEvidence: RentalEvidence
}

export function computeMetrics(listing: RawListing) {
  const totalCashInvested = listing.price * (1 + (listing.closingCostRate ?? 0.02)) + (listing.repairs ?? 10000)
  const grossAnnualRent = listing.estimatedRent * 12
  const vacancyReserve = grossAnnualRent * (listing.vacancyRate ?? 0.05)
  const maintenanceReserve = grossAnnualRent * (listing.maintenanceRate ?? 0.10)
  const annualHOA = listing.hoaMonthly * 12
  const managementCost = grossAnnualRent * (listing.propertyManagementRate ?? 0.10)
  const insuranceAnnual = Math.round(listing.price * (listing.insuranceRate ?? 0.005))
  const netAnnualIncome =
    grossAnnualRent -
    vacancyReserve -
    maintenanceReserve -
    managementCost -
    listing.propertyTaxAnnual -
    annualHOA -
    insuranceAnnual
  const netCashYield = totalCashInvested > 0 ? netAnnualIncome / totalCashInvested : 0
  const paybackYears = netAnnualIncome > 0 ? totalCashInvested / netAnnualIncome : Infinity

  const investmentScore = computeScore({
    netCashYield,
    rentalDemand: listing.rentalDemand,
    rentConfidence: listing.rentConfidence,
    rentalEvidence: listing.rentalEvidence,
    hoaMonthly: listing.hoaMonthly,
    estimatedRent: listing.estimatedRent,
  })

  return {
    totalCashInvested: Math.round(totalCashInvested),
    grossAnnualRent: Math.round(grossAnnualRent),
    vacancyReserve: Math.round(vacancyReserve),
    maintenanceReserve: Math.round(maintenanceReserve),
    netAnnualIncome: Math.round(netAnnualIncome),
    netCashYield,
    paybackYears,
    investmentScore,
    insuranceAnnual,
  }
}

function computeScore({
  netCashYield,
  rentalDemand,
  rentConfidence,
  rentalEvidence,
  hoaMonthly,
  estimatedRent,
}: {
  netCashYield: number
  rentalDemand: RentalDemand
  rentConfidence: RentConfidence
  rentalEvidence: RentalEvidence
  hoaMonthly: number
  estimatedRent: number
}) {
  // Yield score: 0% = 0, 10% = 100 (capped)
  const yieldScore = Math.min(100, Math.max(0, (netCashYield / 0.1) * 100))

  const demandScore: Record<RentalDemand, number> = {
    Strong: 100,
    Moderate: 67,
    Weak: 33,
    'Insufficient Data': 0,
  }

  const confidenceScore: Record<RentConfidence, number> = {
    High: 100,
    Medium: 60,
    Low: 25,
  }

  const evidenceScore: Record<RentalEvidence, number> = {
    High: 100,
    Likely: 67,
    Unknown: 33,
    'Confirmed Restrictions': 0,
  }

  // HOA burden: HOA as % of monthly rent
  const hoaBurdenPct = estimatedRent > 0 ? hoaMonthly / estimatedRent : 0
  // 0% HOA burden = 100, 30%+ = 0
  const hoaScore = Math.max(0, 100 - (hoaBurdenPct / 0.3) * 100)

  return Math.round(
    yieldScore * 0.5 +
      demandScore[rentalDemand] * 0.15 +
      confidenceScore[rentConfidence] * 0.15 +
      evidenceScore[rentalEvidence] * 0.1 +
      hoaScore * 0.1,
  )
}

// ── Equity / appreciation helpers ─────────────────────────────────────────────

export interface EquityScenarios {
  conservative: number  // price gain at 1% annualized
  expected: number      // price gain at the property's appreciationRate
  strong: number        // price gain at 4% annualized
  projectedValue: number // purchase price × (1 + appreciationRate)^years
}

export function equityScenarios(price: number, appreciationRate: number, years = 10): EquityScenarios {
  const gain = (rate: number) => Math.round(price * (Math.pow(1 + rate, years) - 1))
  return {
    conservative: gain(0.01),
    expected: gain(appreciationRate),
    strong: gain(0.04),
    projectedValue: Math.round(price * Math.pow(1 + appreciationRate, years)),
  }
}

export function tenYearRentalIncome(netAnnualIncome: number, years = 10): number {
  return Math.round(netAnnualIncome * years)
}

// Haversine distance in miles
export function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}
