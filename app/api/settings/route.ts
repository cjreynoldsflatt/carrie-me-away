// GET /api/settings — returns global assumptions from Supabase
// PATCH /api/settings — updates global assumptions
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { GlobalAssumptions } from '@/lib/types'
import { DEFAULT_ASSUMPTIONS } from '@/lib/defaults'

function rowToAssumptions(row: Record<string, unknown>): GlobalAssumptions {
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

export async function GET() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error || !data) {
    return NextResponse.json({ assumptions: DEFAULT_ASSUMPTIONS })
  }

  return NextResponse.json({ assumptions: rowToAssumptions(data as Record<string, unknown>) })
}

export async function PATCH(req: Request) {
  const body: Partial<GlobalAssumptions> = await req.json()

  const updates: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() }
  if (body.vacancyRate            !== undefined) updates.vacancy_rate             = body.vacancyRate
  if (body.maintenanceRate        !== undefined) updates.maintenance_rate         = body.maintenanceRate
  if (body.capExRate              !== undefined) updates.cap_ex_rate              = body.capExRate
  if (body.insuranceRate          !== undefined) updates.insurance_rate           = body.insuranceRate
  if (body.closingCostRate        !== undefined) updates.closing_cost_rate        = body.closingCostRate
  if (body.propertyManagementRate !== undefined) updates.property_management_rate = body.propertyManagementRate
  if (body.tenancyYears           !== undefined) updates.tenancy_years            = body.tenancyYears
  if (body.turnoverCost           !== undefined) updates.turnover_cost            = body.turnoverCost
  if (body.pestControlMonthly     !== undefined) updates.pest_control_monthly     = body.pestControlMonthly
  if (body.lawnCareMonthly        !== undefined) updates.lawn_care_monthly        = body.lawnCareMonthly
  if (body.targetYieldOnCost      !== undefined) updates.target_yield_on_cost     = body.targetYieldOnCost
  if (body.rentGrowthRate         !== undefined) updates.rent_growth_rate         = body.rentGrowthRate
  if (body.expenseInflationRate   !== undefined) updates.expense_inflation_rate   = body.expenseInflationRate

  const { error } = await supabase.from('settings').upsert(updates)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
