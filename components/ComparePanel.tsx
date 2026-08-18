'use client'

import { X } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { fmtPrice, fmtRent, fmtYield, fmtCurrency, fmtPayback } from '@/lib/format'
import { equityScenarios } from '@/lib/investment'
import type { SaleListing } from '@/lib/types'
import { cn } from '@/lib/utils'

function scoreGrade(score: number): string {
  if (score >= 80) return 'A+'
  if (score >= 70) return 'A'
  if (score >= 60) return 'B'
  if (score >= 45) return 'C'
  if (score >= 30) return 'D'
  return 'F'
}

type BestFn = (listings: SaleListing[]) => string | null

interface Row {
  label: string
  value: (l: SaleListing) => string
  rawValue: (l: SaleListing) => number
  /** higher is better: true = max is best, false = min is best */
  higherIsBetter: boolean
}

const ROWS: Row[] = [
  {
    label: 'Price',
    value: (l) => fmtPrice(l.price),
    rawValue: (l) => l.price,
    higherIsBetter: false,
  },
  {
    label: 'Type',
    value: (l) => l.propertyType,
    rawValue: () => 0,
    higherIsBetter: true,
  },
  {
    label: 'Beds / Baths',
    value: (l) => `${l.beds}bd · ${l.baths}ba`,
    rawValue: (l) => l.beds + l.baths,
    higherIsBetter: true,
  },
  {
    label: 'Sqft',
    value: (l) => l.sqft.toLocaleString(),
    rawValue: (l) => l.sqft,
    higherIsBetter: true,
  },
  {
    label: 'Est. Rent',
    value: (l) => fmtRent(l.estimatedRent),
    rawValue: (l) => l.estimatedRent,
    higherIsBetter: true,
  },
  {
    label: 'Net Yield',
    value: (l) => fmtYield(l.netCashYield),
    rawValue: (l) => l.netCashYield,
    higherIsBetter: true,
  },
  {
    label: 'Net Income',
    value: (l) => `${fmtCurrency(l.netAnnualIncome)}/yr`,
    rawValue: (l) => l.netAnnualIncome,
    higherIsBetter: true,
  },
  {
    label: 'HOA',
    value: (l) => (l.hoaMonthly > 0 ? `${fmtCurrency(l.hoaMonthly)}/mo` : 'None'),
    rawValue: (l) => l.hoaMonthly,
    higherIsBetter: false,
  },
  {
    label: 'Payback',
    value: (l) => fmtPayback(l.paybackYears),
    rawValue: (l) => (isFinite(l.paybackYears) ? l.paybackYears : 9999),
    higherIsBetter: false,
  },
  {
    label: '10-yr Equity',
    value: (l) => `+${fmtCurrency(equityScenarios(l.price, l.appreciationRate).expected)}`,
    rawValue: (l) => equityScenarios(l.price, l.appreciationRate).expected,
    higherIsBetter: true,
  },
  {
    label: 'Grade',
    value: (l) => `${scoreGrade(l.investmentScore)} (${l.investmentScore})`,
    rawValue: (l) => l.investmentScore,
    higherIsBetter: true,
  },
]

export default function ComparePanel() {
  const compareIds = useAppStore((s) => s.compareIds)
  const setCompareMode = useAppStore((s) => s.setCompareMode)
  const computedSaleListings = useAppStore((s) => s.computedSaleListings)

  const all = computedSaleListings()
  const listings = compareIds
    .map((id) => all.find((l) => l.id === id))
    .filter(Boolean) as SaleListing[]

  // Find best id for a row (null if all equal or not comparable)
  function bestId(row: Row): string | null {
    if (row.label === 'Type') return null // no "best" for categorical
    const values = listings.map((l) => row.rawValue(l))
    const best = row.higherIsBetter ? Math.max(...values) : Math.min(...values)
    // Only highlight if there's a clear winner (not all equal)
    if (values.every((v) => v === best)) return null
    const winner = listings.find((l) => row.rawValue(l) === best)
    return winner?.id ?? null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div>
          <div className="text-sm font-semibold text-slate-800">Compare Properties</div>
          <div className="text-xs text-slate-400 mt-0.5">{listings.length} selected · green = best value</div>
        </div>
        <button
          onClick={() => setCompareMode(false)}
          className="w-8 h-8 rounded-md flex items-center justify-center border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-2.5 w-28">
                Metric
              </th>
              {listings.map((l) => (
                <th key={l.id} className="text-left px-3 py-2.5">
                  <div className="font-semibold text-slate-800 text-xs leading-tight">{l.address}</div>
                  <div className="font-normal text-slate-400 text-xs truncate max-w-[120px]">{l.city}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const winner = bestId(row)
              return (
                <tr key={row.label} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                    {row.label}
                  </td>
                  {listings.map((l) => (
                    <td
                      key={l.id}
                      className={cn(
                        'px-3 py-2.5 text-sm font-medium',
                        winner === l.id
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-slate-700',
                      )}
                    >
                      {row.value(l)}
                      {winner === l.id && (
                        <span className="ml-1 text-[10px] text-emerald-600">★</span>
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
