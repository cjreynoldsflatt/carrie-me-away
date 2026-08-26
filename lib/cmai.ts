// CMA Investments I, LLC — company-level settings
// Do not configure per-property. All UI components read from here.
// Updated: August 25, 2026

export const CMA_I = {
  // Governance
  carrieGovernancePct: 0.51,
  cameronGovernancePct: 0.49,

  // Contributed capital (initial)
  carrieContributedCapital: 500_000,
  cameronContributedCapital: 0,

  // Residual economic interest (matches governance)
  carrieResidualPct: 0.51,
  cameronResidualPct: 0.49,

  // Cameron's Service-Based Profits Interest
  serviceProfitsInterestPct: 0.49,
  // Update serviceInterestGrantDate when the agreement is executed
  serviceInterestGrantDate: new Date('2026-08-25'),
  vestingYears: 5,
  // 49% ÷ 5 years = 9.8 percentage points become nonforfeitable per year
  annualNonforfeitablePct: 0.098,

  // Full acceleration events
  deathAcceleration: true,
  permanentDisabilityAcceleration: true,
} as const

export interface VestingStatus {
  completedYears: number
  /** Percentage points permanently nonforfeitable as of the given date */
  nonforfeitablePct: number
  /** Percentage points still forfeitable if services cease */
  forfeitablePct: number
  /**
   * Cameron's current distribution share.
   * Always equals the full serviceProfitsInterestPct (49%) while he
   * continues providing required services — reverse vesting only affects
   * what he permanently keeps if he stops.
   */
  currentDistributionPct: number
}

/** Returns Cameron's vesting status as of a given date (defaults to today). */
export function getVestingStatus(asOf: Date = new Date()): VestingStatus {
  const { serviceInterestGrantDate, serviceProfitsInterestPct, annualNonforfeitablePct } = CMA_I
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000
  const yearsElapsed = Math.max(0, (asOf.getTime() - serviceInterestGrantDate.getTime()) / msPerYear)
  const completedYears = Math.floor(yearsElapsed)
  const nonforfeitablePct = Math.min(serviceProfitsInterestPct, completedYears * annualNonforfeitablePct)
  const forfeitablePct = serviceProfitsInterestPct - nonforfeitablePct
  return {
    completedYears,
    nonforfeitablePct,
    forfeitablePct,
    currentDistributionPct: serviceProfitsInterestPct,
  }
}
