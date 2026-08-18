'use client'

import { useRef, useState, useEffect } from 'react'
import { Settings, RotateCcw, X } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { DEFAULT_ASSUMPTIONS } from '@/lib/store'

function NumericInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  format: (v: number) => string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-600">{label}</label>
        <span className="text-sm font-semibold text-slate-800 tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
    </div>
  )
}

export default function AssumptionsPopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const assumptions = useAppStore((s) => s.assumptions)
  const setAssumptions = useAppStore((s) => s.setAssumptions)

  // Close desktop popover on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Prevent body scroll when mobile sheet is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isDefault =
    assumptions.vacancyRate === DEFAULT_ASSUMPTIONS.vacancyRate &&
    assumptions.maintenanceRate === DEFAULT_ASSUMPTIONS.maintenanceRate &&
    assumptions.capExRate === DEFAULT_ASSUMPTIONS.capExRate &&
    assumptions.insuranceRate === DEFAULT_ASSUMPTIONS.insuranceRate &&
    assumptions.closingCostRate === DEFAULT_ASSUMPTIONS.closingCostRate &&
    assumptions.propertyManagementRate === DEFAULT_ASSUMPTIONS.propertyManagementRate &&
    assumptions.tenancyYears === DEFAULT_ASSUMPTIONS.tenancyYears &&
    assumptions.turnoverCost === DEFAULT_ASSUMPTIONS.turnoverCost

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Global Assumptions"
        className={`w-8 h-8 rounded-md flex items-center justify-center border transition-colors ${
          open
            ? 'bg-blue-50 border-blue-300 text-blue-600'
            : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
        }`}
      >
        <Settings size={15} />
      </button>

      {open && (() => {
        const content = (
          <div className="space-y-4">
            <div className="space-y-3">
              <NumericInput
                label="Vacancy Rate"
                value={assumptions.vacancyRate}
                onChange={(v) => setAssumptions({ vacancyRate: v })}
                min={0} max={0.3} step={0.005}
                format={(v) => `${(v * 100).toFixed(1)}%`}
              />
              <NumericInput
                label="Maintenance Reserve"
                value={assumptions.maintenanceRate}
                onChange={(v) => setAssumptions({ maintenanceRate: v })}
                min={0} max={0.15} step={0.005}
                format={(v) => `${(v * 100).toFixed(1)}% of rent`}
              />
              <NumericInput
                label="CapEx Reserve"
                value={assumptions.capExRate}
                onChange={(v) => setAssumptions({ capExRate: v })}
                min={0} max={0.15} step={0.005}
                format={(v) => `${(v * 100).toFixed(1)}% of rent`}
              />
              <NumericInput
                label="Insurance Rate"
                value={assumptions.insuranceRate}
                onChange={(v) => setAssumptions({ insuranceRate: v })}
                min={0.001} max={0.015} step={0.001}
                format={(v) => `${(v * 100).toFixed(1)}% of price/yr`}
              />
              <NumericInput
                label="Closing Costs"
                value={assumptions.closingCostRate}
                onChange={(v) => setAssumptions({ closingCostRate: v })}
                min={0} max={0.1} step={0.005}
                format={(v) => `${(v * 100).toFixed(1)}%`}
              />
              <div className="space-y-2">
                <label className="text-sm text-slate-600">Property Management</label>
                <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs font-medium">
                  <button
                    onClick={() => setAssumptions({ propertyManagementRate: 0 })}
                    className={`flex-1 py-1.5 transition-colors ${assumptions.propertyManagementRate === 0 ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Self-manage: $0
                  </button>
                  <button
                    onClick={() => setAssumptions({ propertyManagementRate: assumptions.propertyManagementRate > 0 ? assumptions.propertyManagementRate : 0.10 })}
                    className={`flex-1 py-1.5 transition-colors border-l border-slate-200 ${assumptions.propertyManagementRate > 0 ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Property Manager
                  </button>
                </div>
                {assumptions.propertyManagementRate > 0 && (
                  <NumericInput
                    label="Manager Rate"
                    value={assumptions.propertyManagementRate}
                    onChange={(v) => setAssumptions({ propertyManagementRate: v })}
                    min={0.05} max={0.2} step={0.005}
                    format={(v) => `${(v * 100).toFixed(1)}% of rent`}
                  />
                )}
              </div>
            </div>
              <div className="space-y-2 pt-1">
                <label className="text-sm text-slate-600">Tenant Turnover</label>
                <NumericInput
                  label="Expected tenancy"
                  value={assumptions.tenancyYears}
                  onChange={(v) => setAssumptions({ tenancyYears: v })}
                  min={1} max={10} step={1}
                  format={(v) => `${v} yr${v === 1 ? '' : 's'}`}
                />
                <NumericInput
                  label="Turnover cost"
                  value={assumptions.turnoverCost}
                  onChange={(v) => setAssumptions({ turnoverCost: v })}
                  min={0} max={5000} step={250}
                  format={(v) => `$${v.toLocaleString()}`}
                />
                <div className="text-xs text-slate-400">
                  = ${Math.round(assumptions.turnoverCost / Math.max(1, assumptions.tenancyYears)).toLocaleString()}/yr annualized
                </div>
              </div>
            <div className="text-xs text-slate-400 pt-1 border-t border-slate-100">
              Changes apply instantly to all yield and income figures.
            </div>
          </div>
        )

        const header = (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800">Global Assumptions</div>
              <div className="text-xs text-slate-400 mt-0.5">Applied to all yield calculations</div>
            </div>
            {!isDefault && (
              <button
                onClick={() => setAssumptions(DEFAULT_ASSUMPTIONS)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-md px-2 py-1 hover:border-slate-300 transition-colors"
              >
                <RotateCcw size={11} />
                Reset
              </button>
            )}
          </div>
        )

        return (
          <>
            {/* Mobile: bottom sheet */}
            <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
              <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
              <div className="relative bg-white rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-base font-semibold text-slate-800">Global Assumptions</div>
                    <div className="text-xs text-slate-400 mt-0.5">Applied to all yield calculations</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isDefault && (
                      <button
                        onClick={() => setAssumptions(DEFAULT_ASSUMPTIONS)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-md px-2 py-1"
                      >
                        <RotateCcw size={11} /> Reset
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={20} />
                    </button>
                  </div>
                </div>
                {content}
              </div>
            </div>

            {/* Desktop: floating popover */}
            <div className="hidden md:block absolute left-0 top-10 z-[1000] w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4 space-y-4">
              {header}
              {content}
            </div>
          </>
        )
      })()}
    </div>
  )
}
