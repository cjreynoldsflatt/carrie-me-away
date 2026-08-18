'use client'

import { useRef, useState, useEffect } from 'react'
import { ListFilter, X } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PropertyType } from '@/lib/types'

const MIN_PRICES = [
  { value: 0,      label: 'No min' },
  { value: 100000, label: '$100K' },
  { value: 150000, label: '$150K' },
  { value: 200000, label: '$200K' },
  { value: 250000, label: '$250K' },
  { value: 300000, label: '$300K' },
  { value: 350000, label: '$350K' },
  { value: 400000, label: '$400K' },
  { value: 450000, label: '$450K' },
  { value: 500000, label: '$500K' },
]
const MAX_PRICES = [
  { value: 250000, label: '$250K' },
  { value: 300000, label: '$300K' },
  { value: 350000, label: '$350K' },
  { value: 400000, label: '$400K' },
  { value: 450000, label: '$450K' },
  { value: 500000, label: '$500K' },
  { value: 600000, label: '$600K' },
  { value: 700000, label: '$700K' },
  { value: 800000, label: '$800K' },
  { value: 9999999, label: 'No max' },
]
const BEDS_OPTIONS = [
  { value: 0, label: 'Any' },
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
]
const BATHS_OPTIONS = [
  { value: 0,   label: 'Any' },
  { value: 1,   label: '1+' },
  { value: 1.5, label: '1.5+' },
  { value: 2,   label: '2+' },
  { value: 3,   label: '3+' },
]
const HOA_OPTIONS = [
  { value: 9999, label: 'Any' },
  { value: 0,    label: '$0' },
  { value: 100,  label: '≤$100/mo' },
  { value: 200,  label: '≤$200/mo' },
  { value: 300,  label: '≤$300/mo' },
  { value: 400,  label: '≤$400/mo' },
]
const YIELD_OPTIONS = [
  { value: 0,    label: 'Any' },
  { value: 0.04, label: '4%+' },
  { value: 0.05, label: '5%+' },
  { value: 0.06, label: '6%+' },
  { value: 0.07, label: '7%+' },
]

type TypeFilter = 'All' | 'Townhouse' | 'Condo' | 'Single Family' | 'Multi Family'

export default function FilterPopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const search = useAppStore((s) => s.search)
  const setSearch = useAppStore((s) => s.setSearch)

  // Close desktop popover on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Prevent body scroll when mobile modal is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const ALL_TYPES: PropertyType[] = ['Townhouse', 'Condo', 'Single Family', 'Multi Family']

  const typeFilter: TypeFilter =
    search.propertyTypes.length >= 4 ? 'All'
    : (search.propertyTypes[0] as TypeFilter) ?? 'All'

  const handleTypeChange = (value: TypeFilter) => {
    const types: PropertyType[] = value === 'All' ? ALL_TYPES : [value as PropertyType]
    setSearch({ propertyTypes: types })
  }

  const handleReset = () => {
    setSearch({
      minPrice: 0,
      maxPrice: 9999999,
      propertyTypes: ['Townhouse', 'Condo', 'Single Family', 'Multi Family'],
      minBeds: 0,
      minBaths: 0,
      maxHoaMonthly: 9999,
      minNetYield: 0,
    })
  }

  const filterContent = (
    <div className="space-y-4">
      {/* Price range */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500">Price range</label>
        <div className="flex items-center gap-2">
          <Select value={String(search.minPrice)} onValueChange={(v) => setSearch({ minPrice: Number(v) })}>
            <SelectTrigger className="h-9 text-sm flex-1">
              <SelectValue>{MIN_PRICES.find((p) => p.value === search.minPrice)?.label ?? 'No min'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MIN_PRICES.map((p) => <SelectItem key={p.value} value={String(p.value)} className="text-sm">{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-slate-400 text-sm shrink-0">–</span>
          <Select value={String(search.maxPrice)} onValueChange={(v) => setSearch({ maxPrice: Number(v) })}>
            <SelectTrigger className="h-9 text-sm flex-1">
              <SelectValue>{MAX_PRICES.find((p) => p.value === search.maxPrice)?.label ?? 'No max'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MAX_PRICES.map((p) => <SelectItem key={p.value} value={String(p.value)} className="text-sm">{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Property type */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500">Property type</label>
        <Select value={typeFilter} onValueChange={(v) => handleTypeChange(v as TypeFilter)}>
          <SelectTrigger className="h-9 text-sm w-full">
            <SelectValue>{typeFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(['All', 'Townhouse', 'Condo', 'Single Family', 'Multi Family'] as TypeFilter[]).map((t) => (
              <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Beds / Baths */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Min beds</label>
          <Select value={String(search.minBeds)} onValueChange={(v) => setSearch({ minBeds: Number(v) })}>
            <SelectTrigger className="h-9 text-sm w-full">
              <SelectValue>{BEDS_OPTIONS.find((o) => o.value === search.minBeds)?.label ?? 'Any'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BEDS_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)} className="text-sm">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Min baths</label>
          <Select value={String(search.minBaths)} onValueChange={(v) => setSearch({ minBaths: Number(v) })}>
            <SelectTrigger className="h-9 text-sm w-full">
              <SelectValue>{BATHS_OPTIONS.find((o) => o.value === search.minBaths)?.label ?? 'Any'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BATHS_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)} className="text-sm">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Max HOA / Min yield */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Max HOA</label>
          <Select value={String(search.maxHoaMonthly)} onValueChange={(v) => setSearch({ maxHoaMonthly: Number(v) })}>
            <SelectTrigger className="h-9 text-sm w-full">
              <SelectValue>{HOA_OPTIONS.find((o) => o.value === search.maxHoaMonthly)?.label ?? 'Any'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {HOA_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)} className="text-sm">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Min yield</label>
          <Select value={String(search.minNetYield)} onValueChange={(v) => setSearch({ minNetYield: Number(v) })}>
            <SelectTrigger className="h-9 text-sm w-full">
              <SelectValue>{YIELD_OPTIONS.find((o) => o.value === search.minNetYield)?.label ?? 'Any'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {YIELD_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)} className="text-sm">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={handleReset}
        className="w-full text-xs text-slate-500 hover:text-slate-700 underline text-center pt-1"
      >
        Reset all filters
      </button>
    </div>
  )

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Filters"
        className={`w-8 h-8 rounded-md flex items-center justify-center border transition-colors ${
          open
            ? 'bg-blue-50 border-blue-300 text-blue-600'
            : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
        }`}
      >
        <ListFilter size={15} />
      </button>

      {open && (
        <>
          {/* Mobile: full-screen bottom sheet */}
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="relative bg-white rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-base font-semibold text-slate-800">Filters</span>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              {filterContent}
            </div>
          </div>

          {/* Desktop: floating popover */}
          <div className="hidden md:block absolute right-0 top-10 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-4">
            <div className="text-sm font-semibold text-slate-800 mb-4">Filters</div>
            {filterContent}
          </div>
        </>
      )}
    </div>
  )
}
