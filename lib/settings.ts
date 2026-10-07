// Maps the single-row `settings` table to GlobalAssumptions.
import type { GlobalAssumptions } from './types'
import { DEFAULT_ASSUMPTIONS } from './defaults'

export function rowToAssumptions(row: Record<string, unknown>): GlobalAssumptions {
  return {
    vacancyRate:             Number(row.vacancy_rate             ?? DEFAULT_ASSUMPTIONS.vacancyRate),
    maintenanceRate:         Number(row.maintenance_rate         ?? DEFAULT_ASSUMPTIONS.maintenanceRate),
    capExRate:               Number(row.cap_ex_rate              ?? DEFAULT_ASSUMPTIONS.capExRate),
    insuranceRate:           Number(row.insurance_rate           ?? DEFAULT_ASSUMPTIONS.insuranceRate),
    closingCostRate:         Number(row.closing_cost_rate        ?? DEFAULT_ASSUMPTIONS.closingCostRate),
    propertyManagementRate:  Number(row.property_management_rate ?? DEFAULT_ASSUMPTIONS.propertyManagementRate),
    tenancyYears:            Number(row.tenancy_years            ?? DEFAULT_ASSUMPTIONS.tenancyYears),
    turnoverCost:            Number(row.turnover_cost            ?? DEFAULT_ASSUMPTIONS.turnoverCost),
    pestControlMonthly:      Number(row.pest_control_monthly     ?? DEFAULT_ASSUMPTIONS.pestControlMonthly),
    lawnCareMonthly:         Number(row.lawn_care_monthly        ?? DEFAULT_ASSUMPTIONS.lawnCareMonthly),
    targetYieldOnCost:       Number(row.target_yield_on_cost     ?? DEFAULT_ASSUMPTIONS.targetYieldOnCost),
    rentGrowthRate:          Number(row.rent_growth_rate         ?? DEFAULT_ASSUMPTIONS.rentGrowthRate),
    expenseInflationRate:    Number(row.expense_inflation_rate   ?? DEFAULT_ASSUMPTIONS.expenseInflationRate),
  }
}
