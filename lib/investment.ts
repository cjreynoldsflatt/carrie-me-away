import type { RentalDemand, RentalEvidence, RentConfidence } from './types'

export const LLC_ANNUAL_COST = 300  // CMA Investments LLC fixed annual fee

// Returns the rent used for conservative grading (lower-middle of range).
// When the user has manually set rent (High confidence) we trust their value directly.
export function computeConservativeRent(
  estimatedRent: number,
  rentLow: number,
  rentHigh: number,
  rentConfidence: string,
): number {
  if (rentConfidence === 'High') return estimatedRent
  if (rentLow > 0 && rentHigh > 0) {
    // 20th percentile — just above the lower bound, keeping grading conservative
    return Math.round(rentLow + (rentHigh - rentLow) * 0.20)
  }
  // No range: apply a 10% haircut as a safety margin
  return estimatedRent > 0 ? Math.round(estimatedRent * 0.90) : 0
}

interface RawListing {
  price: number
  hoaMonthly: number
  estimatedRent: number          // display rent (midpoint of range)
  conservativeRent?: number      // rent used for calculations; defaults to estimatedRent
  propertyTaxAnnual: number
  insuranceRate: number
  closingCostRate: number
  realtorRate: number
  repairs: number
  vacancyRate: number
  maintenanceRate: number
  capExRate: number
  propertyManagementRate: number
  tenancyYears: number
  turnoverCost: number
  pestControlMonthly?: number
  lawnCareMonthly?: number
  rentalDemand: RentalDemand
  rentConfidence: RentConfidence
  rentalEvidence: RentalEvidence
}

export function computeMetrics(listing: RawListing) {
  // Use conservativeRent for all financial calculations; estimatedRent is display-only
  const calcRent = listing.conservativeRent ?? listing.estimatedRent
  const totalCashInvested = listing.price * (1 + (listing.closingCostRate ?? 0.02) + (listing.realtorRate ?? 0.03)) + (listing.repairs ?? 15000)
  const grossAnnualRent = calcRent * 12
  const vacancyReserve = grossAnnualRent * (listing.vacancyRate ?? 0.05)
  const maintenanceReserve = grossAnnualRent * (listing.maintenanceRate ?? 0.05)
  const capExReserve = grossAnnualRent * (listing.capExRate ?? 0.03)
  const turnoverReserve = listing.tenancyYears > 0
    ? Math.round(listing.turnoverCost / listing.tenancyYears)
    : 0
  const annualHOA = listing.hoaMonthly * 12
  const managementCost = grossAnnualRent * (listing.propertyManagementRate ?? 0.10)
  const insuranceAnnual = Math.round(listing.price * (listing.insuranceRate ?? 0.005))
  const pestControlAnnual = (listing.pestControlMonthly ?? 50) * 12
  const lawnCareAnnual = (listing.lawnCareMonthly ?? 50) * 12
  const netAnnualIncome =
    grossAnnualRent -
    vacancyReserve -
    maintenanceReserve -
    capExReserve -
    turnoverReserve -
    managementCost -
    listing.propertyTaxAnnual -
    annualHOA -
    insuranceAnnual -
    pestControlAnnual -
    lawnCareAnnual -
    LLC_ANNUAL_COST
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
    capExReserve: Math.round(capExReserve),
    turnoverReserve,
    netAnnualIncome: Math.round(netAnnualIncome),
    netCashYield,
    paybackYears,
    investmentScore,
    insuranceAnnual,
    pestControlAnnual,
    lawnCareAnnual,
    llcAnnualCost: LLC_ANNUAL_COST,
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

// ── CCAP financing helpers ────────────────────────────────────────────────────

/** Monthly principal + interest payment for a fully-amortizing loan. */
export function computeMonthlyPayment(principal: number, annualRate: number, termMonths = 360): number {
  if (annualRate === 0) return Math.round(principal / termMonths)
  const r = annualRate / 12
  const factor = Math.pow(1 + r, termMonths)
  return Math.round(principal * r * factor / (factor - 1))
}

/** Remaining loan balance after `monthsPaid` payments. */
export function computeRemainingBalance(
  principal: number,
  annualRate: number,
  termMonths: number,
  monthsPaid: number,
): number {
  if (monthsPaid <= 0) return Math.round(principal)
  if (annualRate === 0) {
    return Math.max(0, Math.round(principal - (principal / termMonths) * monthsPaid))
  }
  const r = annualRate / 12
  const payment = principal * r * Math.pow(1 + r, termMonths) / (Math.pow(1 + r, termMonths) - 1)
  const bal = principal * Math.pow(1 + r, monthsPaid) - payment * (Math.pow(1 + r, monthsPaid) - 1) / r
  return Math.max(0, Math.round(bal))
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
