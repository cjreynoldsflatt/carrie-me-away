'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
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
  { value: 0, label: 'Any beds' },
  { value: 1, label: '1+ bd' },
  { value: 2, label: '2+ bd' },
  { value: 3, label: '3+ bd' },
  { value: 4, label: '4+ bd' },
]

const BATHS_OPTIONS = [
  { value: 0,   label: 'Any baths' },
  { value: 1,   label: '1+ ba' },
  { value: 1.5, label: '1.5+ ba' },
  { value: 2,   label: '2+ ba' },
  { value: 3,   label: '3+ ba' },
]

const HOA_OPTIONS = [
  { value: 9999, label: 'Any HOA' },
  { value: 0,    label: '$0 HOA' },
  { value: 100,  label: '≤$100/mo' },
  { value: 200,  label: '≤$200/mo' },
  { value: 300,  label: '≤$300/mo' },
  { value: 400,  label: '≤$400/mo' },
]

const YIELD_OPTIONS = [
  { value: 0,    label: 'Any yield' },
  { value: 0.04, label: '4%+ yield' },
  { value: 0.05, label: '5%+ yield' },
  { value: 0.06, label: '6%+ yield' },
  { value: 0.07, label: '7%+ yield' },
]

type TypeFilter = 'Both' | 'Townhouse' | 'Condo'

export default function SearchControls() {
  const search = useAppStore((s) => s.search)
  const setSearch = useAppStore((s) => s.setSearch)

  const typeFilter: TypeFilter =
    search.propertyTypes.length === 2 ? 'Both'
    : search.propertyTypes[0] === 'Townhouse' ? 'Townhouse'
    : 'Condo'

  const handleTypeChange = (value: TypeFilter) => {
    const types: PropertyType[] =
      value === 'Both' ? ['Townhouse', 'Condo']
      : value === 'Townhouse' ? ['Townhouse']
      : ['Condo']
    setSearch({ propertyTypes: types })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Min / Max price */}
      <div className="flex items-center gap-1">
        <Select
          value={String(search.minPrice)}
          onValueChange={(v) => v && setSearch({ minPrice: Number(v) })}
        >
          <SelectTrigger className="h-8 text-sm w-[88px]">
            <SelectValue>
              {MIN_PRICES.find((p) => p.value === search.minPrice)?.label ?? `$${search.minPrice}`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MIN_PRICES.map((p) => (
              <SelectItem key={p.value} value={String(p.value)} className="text-sm">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-slate-400 text-sm">–</span>
        <Select
          value={String(search.maxPrice)}
          onValueChange={(v) => v && setSearch({ maxPrice: Number(v) })}
        >
          <SelectTrigger className="h-8 text-sm w-[88px]">
            <SelectValue>
              {MAX_PRICES.find((p) => p.value === search.maxPrice)?.label ?? `$${search.maxPrice}`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MAX_PRICES.map((p) => (
              <SelectItem key={p.value} value={String(p.value)} className="text-sm">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Property type */}
      <div className="flex items-center gap-0 bg-slate-100 rounded-lg p-0.5">
        {(['Both', 'Townhouse', 'Condo'] as TypeFilter[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTypeChange(t)}
            className={`text-sm px-3 py-1 rounded-md transition-colors whitespace-nowrap ${
              typeFilter === t
                ? 'bg-white text-slate-900 shadow-sm font-medium'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Beds */}
      <Select
        value={String(search.minBeds)}
        onValueChange={(v) => setSearch({ minBeds: Number(v) })}
      >
        <SelectTrigger className="h-8 text-sm w-[120px]">
          <SelectValue>
            {BEDS_OPTIONS.find((o) => o.value === search.minBeds)?.label ?? 'Any beds'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {BEDS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={String(o.value)} className="text-sm">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Baths */}
      <Select
        value={String(search.minBaths)}
        onValueChange={(v) => setSearch({ minBaths: Number(v) })}
      >
        <SelectTrigger className="h-8 text-sm w-[124px]">
          <SelectValue>
            {BATHS_OPTIONS.find((o) => o.value === search.minBaths)?.label ?? 'Any baths'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {BATHS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={String(o.value)} className="text-sm">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Max HOA */}
      <Select
        value={String(search.maxHoaMonthly)}
        onValueChange={(v) => setSearch({ maxHoaMonthly: Number(v) })}
      >
        <SelectTrigger className="h-8 text-sm w-[120px]">
          <SelectValue>
            {HOA_OPTIONS.find((o) => o.value === search.maxHoaMonthly)?.label ?? 'Any HOA'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {HOA_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={String(o.value)} className="text-sm">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Min Yield */}
      <Select
        value={String(search.minNetYield)}
        onValueChange={(v) => setSearch({ minNetYield: Number(v) })}
      >
        <SelectTrigger className="h-8 text-sm w-[124px]">
          <SelectValue>
            {YIELD_OPTIONS.find((o) => o.value === search.minNetYield)?.label ?? 'Any yield'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {YIELD_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={String(o.value)} className="text-sm">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
