import type { RentalDemand, RentalEvidence, RentConfidence } from './types'

export const LLC_ANNUAL_COST = 300  // CMA Investments LLC fixed annual fee
// Day 1 operating reserve funded at acquisition. Counted in the cash basis for every yield,
// payback and grade so all percentages in the app divide by the same total cash.
export const OPERATING_RESERVE = 20_000

// Returns the rent used for grading — the low end of the HUD range.
// When the user has manually set rent (High confidence) we trust their value directly.
export function computeConservativeRent(
  estimatedRent: number,
  rentLow: number,
  rentHigh: number,
  rentConfidence: string,
): number {
  if (rentConfidence === 'High') return estimatedRent
  if (rentLow > 0 && rentHigh > 0) {
    return rentLow
  }
  // No range: apply a 10% haircut as a safety margin
  return estimatedRent > 0 ? Math.round(estimatedRent * 0.90) : 0
}

// ── Realistic scenario ───────────────────────────────────────────────────────
// The main numbers use the user's (deliberately conservative) global assumptions.
// The realistic scenario uses typical costs for a well-run, self-managed rental.
// Each value is a ceiling: if the user's own setting is already lower, theirs wins.
export const REALISTIC = {
  maintenanceRate: 0.06,     // routine repairs; up-front repairs budget already covers move-in work
  capExRate: 0.05,           // roof/HVAC/water heater sinking fund
  insuranceRate: 0.0035,     // landlord (DP3) policy ≈ 0.35% of price for MD townhouses
  pestControlMonthly: 25,    // quarterly service, not monthly
  lawnCareMonthly: 0,        // townhouse/condo: tenant or HOA handles it (houses keep the user's value)
}

/** Rent for the realistic scenario: comp median when comps exist; HUD Low otherwise (HUD midpoints run high). */
export function realisticRent(l: {
  estimatedRent: number; rentLow: number; rentConfidence: string; rentSource?: string
}): number {
  if (l.rentConfidence === 'High') return l.estimatedRent            // user's own number
  if (l.rentSource === 'comps') return l.estimatedRent               // median of nearby rentals
  return l.rentLow > 0 ? l.rentLow : l.estimatedRent
}

/** Global assumptions with realistic ceilings applied. */
export function realisticAssumptions<A extends {
  maintenanceRate: number; capExRate: number; insuranceRate: number
  pestControlMonthly: number; lawnCareMonthly: number
}>(a: A, propertyType: string): A {
  const attached = propertyType === 'Townhouse' || propertyType === 'Condo'
  return {
    ...a,
    maintenanceRate: Math.min(a.maintenanceRate, REALISTIC.maintenanceRate),
    capExRate: Math.min(a.capExRate, REALISTIC.capExRate),
    insuranceRate: Math.min(a.insuranceRate, REALISTIC.insuranceRate),
    pestControlMonthly: Math.min(a.pestControlMonthly, REALISTIC.pestControlMonthly),
    lawnCareMonthly: attached ? Math.min(a.lawnCareMonthly, REALISTIC.lawnCareMonthly) : a.lawnCareMonthly,
  }
}

interface RawListing {
  price: number
  hoaMonthly: number
  estimatedRent: number          // display rent (midpoint of range)
  conservativeRent?: number      // rent used for calculations; defaults to estimatedRent
  propertyTaxAnnual: number
  insuranceRate: number
  closingCostRate: number
  repairs: number
  vacancyRate: number
  maintenanceRate: number
  capExRate: number
  propertyManagementRate: number
  tenancyYears: number
  turnoverCost: number
  pestControlMonthly?: number
  lawnCareMonthly?: number
  superAnnualCost?: number
  appreciationRate?: number      // annualized historical rate, used for 5-yr CAGR score
  targetYieldOnCost?: number     // user's configurable target; used as normalization ceiling
  rentGrowthRate?: number        // annual rent growth for 5-yr model (default 0.03)
  expenseInflationRate?: number  // annual fixed-expense inflation for 5-yr model (default 0.025)
  rentalDemand: RentalDemand
  rentConfidence: RentConfidence
  rentalEvidence: RentalEvidence
}

export function computeMetrics(listing: RawListing) {
  // Use conservativeRent for all financial calculations; estimatedRent is display-only
  const calcRent = listing.conservativeRent ?? listing.estimatedRent
  const totalCashInvested = listing.price * (1 + (listing.closingCostRate ?? 0.03)) + (listing.repairs ?? 15000)
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
  const superAnnual = listing.superAnnualCost ?? 1449
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
    superAnnual -
    LLC_ANNUAL_COST
  // Yield basis = all cash committed: price + closing + repairs + operating reserve
  const cashBasis = totalCashInvested + OPERATING_RESERVE
  const netCashYield = cashBasis > 0 ? netAnnualIncome / cashBasis : 0
  const paybackYears = netAnnualIncome > 0 ? cashBasis / netAnnualIncome : Infinity

  // ── 5-year year-by-year model ───────────────────────────────────────────
  const varExpRate = (listing.vacancyRate ?? 0.05) + (listing.maintenanceRate ?? 0.05) +
    (listing.capExRate ?? 0.03) + (listing.propertyManagementRate ?? 0.10)
  const fixedAnnualExpenses = listing.propertyTaxAnnual + annualHOA + insuranceAnnual +
    pestControlAnnual + lawnCareAnnual + superAnnual + LLC_ANNUAL_COST + turnoverReserve
  const { cashFlows: fiveYearCashFlows, total: cumulativeFiveYearCashFlow } = compute5YearCashFlows({
    grossAnnualRent,
    varExpRate,
    fixedAnnualExpenses,
    rentGrowthRate: listing.rentGrowthRate ?? 0.03,
    expenseInflationRate: listing.expenseInflationRate ?? 0.025,
  })

  const investmentScore = computeScore({
    netCashYield,
    netAnnualIncome,
    totalCashInvested: cashBasis,
    price: listing.price,
    closingCostRate: listing.closingCostRate,
    repairs: listing.repairs,
    appreciationRate: listing.appreciationRate ?? 0.03,
    targetYieldOnCost: listing.targetYieldOnCost ?? 0.05,
    cumulativeFiveYearCashFlow,
    rentalDemand: listing.rentalDemand,
    rentConfidence: listing.rentConfidence,
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
    superAnnual,
    llcAnnualCost: LLC_ANNUAL_COST,
    fiveYearCashFlows,
    cumulativeFiveYearCashFlow,
  }
}

// ── True year-by-year 5-year cash flow model ──────────────────────────────
// Variable expenses (vacancy, maintenance, capEx, management) are percentages of rent
// and grow automatically when rent grows. Fixed annual expenses (taxes, HOA, insurance,
// pest, lawn, super, LLC, turnover) grow by expenseInflationRate each year.
function compute5YearCashFlows(params: {
  grossAnnualRent: number
  varExpRate: number        // vacancy + maintenance + capEx + management rates combined
  fixedAnnualExpenses: number  // sum of all fixed-cost expenses for base year
  rentGrowthRate: number
  expenseInflationRate: number
}): { cashFlows: number[]; total: number } {
  const { grossAnnualRent, varExpRate, fixedAnnualExpenses, rentGrowthRate, expenseInflationRate } = params
  const cashFlows: number[] = []
  let total = 0
  for (let yr = 1; yr <= 5; yr++) {
    const rentFactor = Math.pow(1 + rentGrowthRate, yr - 1)
    const expFactor = Math.pow(1 + expenseInflationRate, yr - 1)
    const grossRent_yr = grossAnnualRent * rentFactor
    const netCashFlow_yr = Math.round(grossRent_yr - grossRent_yr * varExpRate - fixedAnnualExpenses * expFactor)
    cashFlows.push(netCashFlow_yr)
    total += netCashFlow_yr
  }
  return { cashFlows, total }
}

// ── Piecewise yield-ratio → component score ────────────────────────────────
// Reaching the user's target yields ~70/100. Must materially exceed it to score well.
// Control points: [yield / target ratio, component score]
function yieldRatioToScore(ratio: number): number {
  const pts: [number, number][] = [
    [0,    0],
    [0.70, 40],
    [0.85, 55],
    [1.00, 70],
    [1.10, 85],
    [1.25, 100],
  ]
  if (ratio <= 0) return 0
  if (ratio >= 1.25) return 100
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    if (ratio <= x1) return y0 + ((ratio - x0) / (x1 - x0)) * (y1 - y0)
  }
  return 100
}

function computeScore({
  netCashYield,
  netAnnualIncome,
  totalCashInvested,
  price,
  closingCostRate,
  repairs,
  appreciationRate,
  targetYieldOnCost,
  cumulativeFiveYearCashFlow,
  rentalDemand,
  rentConfidence,
}: {
  netCashYield: number
  netAnnualIncome: number
  totalCashInvested: number
  price: number
  closingCostRate: number
  repairs: number
  appreciationRate: number
  targetYieldOnCost: number
  cumulativeFiveYearCashFlow: number
  rentalDemand: RentalDemand
  rentConfidence: RentConfidence
}) {
  const target = targetYieldOnCost > 0 ? targetYieldOnCost : 0.05

  // 1. Stabilized Yield on Cost (45%)
  // Piecewise: target = 70pts, 125%+ of target = 100pts
  const stabilizedYieldScore = yieldRatioToScore(netCashYield / target)

  // 2. Net Cash Yield (25%)
  // Same curve; uses acquisition cost (purchase + closing) so excludes repair outlay
  const acquisitionCost = price * (1 + closingCostRate)
  const acquisitionYield = acquisitionCost > 0 ? netAnnualIncome / acquisitionCost : 0
  const netCashYieldScore = yieldRatioToScore(acquisitionYield / target)

  // 3. Projected 5-Year CAGR (15%)
  // Own scale: 10% annualized CAGR = 100. Not normalized against yield target.
  const appreciationGain = price * (Math.pow(1 + Math.max(0, appreciationRate), 5) - 1)
  const cumulativeCashFlow = cumulativeFiveYearCashFlow  // true year-by-year sum
  const totalReturn5yr = totalCashInvested > 0 ? (appreciationGain + cumulativeCashFlow) / totalCashInvested : 0
  const cagr5yr = totalReturn5yr >= 0
    ? Math.pow(1 + totalReturn5yr, 0.2) - 1
    : -(Math.pow(1 + Math.abs(totalReturn5yr), 0.2) - 1)
  const cagrScore = Math.min(100, Math.max(0, cagr5yr / 0.10 * 100))

  // 4. Renovation Value-Add ROI (10%)
  // Own scale: 0.3 income/repair ratio = 100. Not normalized against yield target.
  const renovROI = repairs > 0 ? netAnnualIncome / repairs : 1
  const renovationScore = Math.min(100, Math.max(0, renovROI / 0.3 * 100))

  // 5. Rent Confidence (3%)
  const confidenceScore: Record<RentConfidence, number> = {
    High: 100,
    Medium: 60,
    Low: 25,
  }

  // 6. Rental Demand (2%)
  const demandScore: Record<RentalDemand, number> = {
    Strong: 100,
    Moderate: 67,
    Weak: 33,
    'Insufficient Data': 0,
  }

  let score = Math.round(
    stabilizedYieldScore            * 0.45 +
    netCashYieldScore               * 0.25 +
    cagrScore                       * 0.15 +
    renovationScore                 * 0.10 +
    confidenceScore[rentConfidence] * 0.03 +
    demandScore[rentalDemand]       * 0.02,
  )

  // ── Grade guardrails ────────────────────────────────────────────────────────
  // Operating performance sets the ceiling; appreciation/renovation cannot
  // compensate for weak income metrics.
  const yieldRatio = target > 0 ? netCashYield / target : 0

  if (netAnnualIncome <= 0 || yieldRatio < 0.75) {
    score = Math.min(score, 59)   // max C
  } else if (yieldRatio < 1.00) {
    score = Math.min(score, 75)   // max B
  } else if (yieldRatio < 1.10) {
    score = Math.min(score, 87)   // max B+
  } else if (yieldRatio < 1.25) {
    score = Math.min(score, 96)   // max A
  }
  // 125%+ → eligible for A+ — but all core metrics must also be strong
  if (score >= 97 && (stabilizedYieldScore < 50 || netCashYieldScore < 50)) {
    score = Math.min(score, 96)
  }

  return score
}

// ── Equity / appreciation helpers ─────────────────────────────────────────────

export interface EquityScenarios {
  conservative: number  // price gain at 1% annualized
  expected: number      // price gain at the property's appreciationRate
  strong: number        // price gain at 4% annualized
  projectedValue: number // purchase price × (1 + appreciationRate)^years
}

export function equityScenarios(price: number, appreciationRate: number, years = 5): EquityScenarios {
  const gain = (rate: number) => Math.round(price * (Math.pow(1 + rate, years) - 1))
  return {
    conservative: gain(0.01),
    expected: gain(appreciationRate),
    strong: gain(0.04),
    projectedValue: Math.round(price * Math.pow(1 + appreciationRate, years)),
  }
}

export function tenYearRentalIncome(netAnnualIncome: number, years = 5): number {
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
