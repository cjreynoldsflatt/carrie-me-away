// Pure helper: run computeMetrics for one listing under a set of assumptions and a rent.
// Shared by the server share loader and client pages (print worksheet) so the math matches the app.
import { computeMetrics } from './investment'
import type { GlobalAssumptions, SaleListing } from './types'

export function scenarioMetrics(l: SaleListing, a: GlobalAssumptions, rent: number) {
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
