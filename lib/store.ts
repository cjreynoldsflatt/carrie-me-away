'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SaleListing, RentalListing, SearchSettings, LayerSettings, SortOption, GlobalAssumptions, PropertyType } from './types'
import { computeMetrics, computeConservativeRent } from './investment'
import { DEFAULT_ASSUMPTIONS } from './defaults'

export { DEFAULT_ASSUMPTIONS }

interface AppState {
  // Search
  search: SearchSettings
  setSearch: (updates: Partial<SearchSettings>) => void

  // Layers
  layers: LayerSettings
  setLayer: (key: keyof LayerSettings, value: boolean) => void

  // Selection
  selectedId: string | null
  setSelectedId: (id: string | null) => void

  // Sort
  sortBy: SortOption
  setSortBy: (sort: SortOption) => void

  // Data
  saleListings: SaleListing[]
  rentalListings: RentalListing[]

  // Global assumptions
  assumptions: GlobalAssumptions
  setAssumptions: (updates: Partial<GlobalAssumptions>) => void

  // Compare mode
  compareMode: boolean
  compareIds: string[]
  setCompareMode: (on: boolean) => void
  toggleCompare: (id: string) => void

  // Grade filter
  gradeFilter: string[]
  setGradeFilter: (grades: string[]) => void
  toggleGradeFilter: (grade: string) => void


  // Loading state
  isLoading: boolean

  // Original HUD rents — captured once per listing on first load, never overwritten
  originalRents: Record<string, number>

  // Persist a rent value to Supabase and clear any local override
  saveRentToDb: (id: string, rent: number) => Promise<void>
  // Reset to the original HUD value (saved in originalRents)
  resetRentToOriginal: (id: string) => Promise<void>
  // Persist repairs value to Supabase
  saveRepairsToDb: (id: string, repairs: number) => Promise<void>
  // Persist property type to Supabase
  savePropertyTypeToDb: (id: string, propertyType: PropertyType) => Promise<void>
  // Persist units count to Supabase
  saveUnitsToDb: (id: string, units: number) => Promise<void>

  // Actions
  initialize: () => Promise<void>
  deleteListing: (id: string) => Promise<void>

  // Computed selectors
  computedSaleListings: () => SaleListing[]
  filteredSaleListings: () => SaleListing[]
  filteredRentalListings: () => RentalListing[]
  sortedSaleListings: () => SaleListing[]
}

const DEFAULT_SEARCH: SearchSettings = {
  centerLat: 39.30,
  centerLng: -76.88,
  radiusMiles: 10,
  minPrice: 0,
  maxPrice: 9999999,
  propertyTypes: ['Townhouse', 'Condo', 'Single Family', 'Multi Family'],
  minBeds: 0,
  minBaths: 0,
  maxHoaMonthly: 9999,
  minNetYield: 0,
}

const DEFAULT_LAYERS: LayerSettings = {
  forSale: true,
  forRent: true,
  communities: false,
  investmentScore: true,
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      search: DEFAULT_SEARCH,
      setSearch: (updates) =>
        set((state) => ({ search: { ...state.search, ...updates } })),

      layers: DEFAULT_LAYERS,
      setLayer: (key, value) =>
        set((state) => ({ layers: { ...state.layers, [key]: value } })),

      selectedId: null,
      setSelectedId: (id) => set({ selectedId: id }),

      sortBy: 'best',
      setSortBy: (sort) => set({ sortBy: sort }),

      saleListings: [],
      rentalListings: [],

      originalRents: {},

      saveRentToDb: async (id, rent) => {
        await fetch(`/api/listings/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estimated_rent: rent }),
        })
        set((state) => ({
          saleListings: state.saleListings.map((l) =>
            l.id === id ? { ...l, estimatedRent: rent, rentConfidence: 'High' as const } : l
          ),
        }))
      },

      saveRepairsToDb: async (id, repairs) => {
        await fetch(`/api/listings/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repairs }),
        })
        set((state) => ({
          saleListings: state.saleListings.map((l) =>
            l.id === id ? { ...l, repairs } : l
          ),
        }))
      },

      savePropertyTypeToDb: async (id, propertyType) => {
        await fetch(`/api/listings/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ property_type: propertyType }),
        })
        set((state) => ({
          saleListings: state.saleListings.map((l) =>
            l.id === id ? { ...l, propertyType } : l
          ),
        }))
      },

      saveUnitsToDb: async (id, units) => {
        await fetch(`/api/listings/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ units }),
        })
        set((state) => ({
          saleListings: state.saleListings.map((l) =>
            l.id === id ? { ...l, units } : l
          ),
        }))
      },

      resetRentToOriginal: async (id) => {
        const original = get().originalRents[id]
        if (original == null) return
        await fetch(`/api/listings/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estimated_rent: original }),
        })
        set((state) => ({
          saleListings: state.saleListings.map((l) =>
            l.id === id ? { ...l, estimatedRent: original } : l
          ),
        }))
      },

      assumptions: DEFAULT_ASSUMPTIONS,
      setAssumptions: (updates) =>
        set((state) => ({ assumptions: { ...state.assumptions, ...updates } })),

      compareMode: false,
      compareIds: [],
      setCompareMode: (on) =>
        set({ compareMode: on, compareIds: on ? get().compareIds : [] }),
      toggleCompare: (id) =>
        set((state) => {
          if (state.compareIds.includes(id)) {
            return { compareIds: state.compareIds.filter((i) => i !== id) }
          }
          if (state.compareIds.length >= 3) return {}
          return { compareIds: [...state.compareIds, id] }
        }),

      gradeFilter: [],
      setGradeFilter: (grades) => set({ gradeFilter: grades }),
      toggleGradeFilter: (grade) =>
        set((state) => ({
          gradeFilter: state.gradeFilter.includes(grade)
            ? state.gradeFilter.filter((g) => g !== grade)
            : [...state.gradeFilter, grade],
        })),

      isLoading: false,

      initialize: async () => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/listings')
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          console.log('[initialize] saleListings from API:', data.saleListings?.length, data.saleListings)
          // Capture original HUD rents once per listing — never overwrite existing entries
          const incoming: SaleListing[] = data.saleListings ?? []
          set((state) => {
            const originals = { ...state.originalRents }
            for (const l of incoming) {
              if (!(l.id in originals)) originals[l.id] = l.estimatedRent
            }
            // Ensure all assumption defaults are present (guards against stale persisted state)
            const safeAssumptions = { ...DEFAULT_ASSUMPTIONS, ...state.assumptions }
            return {
              saleListings: incoming,
              rentalListings: data.rentalListings ?? [],
              originalRents: originals,
              assumptions: safeAssumptions,
            }
          })
        } catch (err) {
          console.error('[store] initialize failed:', err)
        } finally {
          set({ isLoading: false })
        }
      },

      deleteListing: async (id) => {
        await fetch(`/api/listings/${encodeURIComponent(id)}`, { method: 'DELETE' })
        set((state) => ({
          saleListings: state.saleListings.filter((l) => l.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
        }))
      },

      // Re-runs computeMetrics with current assumptions (live recalc)
      computedSaleListings: () => {
        const { assumptions, saleListings } = get()
        return saleListings.map((l) => {
          // Recompute conservativeRent here so it stays current with any rent edits
          const conservativeRent = computeConservativeRent(l.estimatedRent, l.rentLow, l.rentHigh, l.rentConfidence)
          const metrics = computeMetrics({
            price: l.price,
            hoaMonthly: l.hoaMonthly,
            estimatedRent: l.estimatedRent,
            conservativeRent,
            propertyTaxAnnual: l.propertyTaxAnnual,
            insuranceRate: assumptions.insuranceRate,
            closingCostRate: assumptions.closingCostRate,
            realtorRate: assumptions.realtorRate,
            repairs: l.repairs,
            vacancyRate: assumptions.vacancyRate,
            maintenanceRate: assumptions.maintenanceRate,
            capExRate: assumptions.capExRate,
            propertyManagementRate: assumptions.propertyManagementRate,
            tenancyYears: assumptions.tenancyYears,
            turnoverCost: assumptions.turnoverCost,
            rentalDemand: l.rentalDemand,
            rentConfidence: l.rentConfidence,
            rentalEvidence: l.rentalEvidence,
          })
          return {
            ...l,
            ...metrics,
            conservativeRent,
            closingCostRate: assumptions.closingCostRate,
            realtorRate: assumptions.realtorRate,
            vacancyRate: assumptions.vacancyRate,
            maintenanceRate: assumptions.maintenanceRate,
            capExRate: assumptions.capExRate,
            propertyManagementRate: assumptions.propertyManagementRate,
            tenancyYears: assumptions.tenancyYears,
            turnoverCost: assumptions.turnoverCost,
          }
        })
      },

      filteredSaleListings: () => {
        const { search } = get()
        return get()
          .computedSaleListings()
          .filter((l) => (
            l.price >= search.minPrice &&
            l.price <= search.maxPrice &&
            search.propertyTypes.includes(l.propertyType) &&
            l.beds >= search.minBeds &&
            l.baths >= search.minBaths &&
            l.hoaMonthly <= search.maxHoaMonthly &&
            (search.minNetYield === 0 || l.netCashYield >= search.minNetYield)
          ))
      },

      filteredRentalListings: () => get().rentalListings,

      sortedSaleListings: () => {
        const listings = get().filteredSaleListings()
        const sortBy = get().sortBy
        return [...listings].sort((a, b) => {
          switch (sortBy) {
            case 'best':       return b.investmentScore - a.investmentScore
            case 'worst':      return a.investmentScore - b.investmentScore
            case 'date-added': return (b.fetchedAt ?? '').localeCompare(a.fetchedAt ?? '')
            case 'yield':      return b.netCashYield - a.netCashYield
            case 'payback':   return a.paybackYears - b.paybackYears
            case 'price-asc': return a.price - b.price
            case 'price-desc':return b.price - a.price
            case 'rent':      return b.estimatedRent - a.estimatedRent
            case 'demand': {
              const order = { Strong: 3, Moderate: 2, Weak: 1, 'Insufficient Data': 0 }
              return order[b.rentalDemand] - order[a.rentalDemand]
            }
            case 'confidence': {
              const order = { High: 3, Medium: 2, Low: 1 }
              return order[b.rentConfidence] - order[a.rentConfidence]
            }
            case 'newest': return a.daysOnMarket - b.daysOnMarket
            case 'hoa':    return a.hoaMonthly - b.hoaMonthly
            default:       return b.investmentScore - a.investmentScore
          }
        })
      },
    }),
    {
      name: 'carrie-app-state',
      version: 14,
      migrate: (persisted: unknown, version: number) => {
        const s = persisted as Record<string, unknown>
        if (version === 0) {
          return {
            ...s,
            search: { ...DEFAULT_SEARCH, ...(s.search as object) },
            assumptions: DEFAULT_ASSUMPTIONS,
            rentOverrides: {},
          }
        }
        if (version === 1) {
          // Add 'Single Family' to propertyTypes if it was saved without it
          const search = (s.search as Record<string, unknown>) ?? {}
          const types = search.propertyTypes as string[] | undefined
          return {
            ...s,
            search: {
              ...search,
              propertyTypes: types && !types.includes('Single Family')
                ? [...types, 'Single Family']
                : types ?? DEFAULT_SEARCH.propertyTypes,
            },
          }
        }
        if (version < 4) {
          return { ...s, originalRents: {} }
        }
        if (version < 5) {
          const assumptions = (s.assumptions as Record<string, unknown>) ?? {}
          return {
            ...s,
            assumptions: { ...assumptions, propertyManagementRate: 0.10 },
            selfManageIds: [],
          }
        }
        if (version < 6) {
          const assumptions = (s.assumptions as Record<string, unknown>) ?? {}
          return {
            ...s,
            assumptions: { ...assumptions, maintenanceRate: 0.07 },
          }
        }
        if (version < 8) {
          const assumptions = (s.assumptions as Record<string, unknown>) ?? {}
          const { insuranceAnnual: _dropped, ...rest } = assumptions as Record<string, unknown> & { insuranceAnnual?: unknown }
          void _dropped
          return {
            ...s,
            assumptions: { ...rest, insuranceRate: 0.005 },
          }
        }
        if (version < 9) {
          const search = (s.search as Record<string, unknown>) ?? {}
          const types = search.propertyTypes as string[] | undefined
          const assumptions = (s.assumptions as Record<string, unknown>) ?? {}
          const { insuranceAnnual: _drop2, ...restA } = assumptions as Record<string, unknown> & { insuranceAnnual?: unknown }
          void _drop2
          return {
            ...s,
            search: {
              ...search,
              propertyTypes: types && !types.includes('Multi Family')
                ? [...types, 'Multi Family']
                : types ?? DEFAULT_SEARCH.propertyTypes,
            },
            assumptions: {
              ...restA,
              insuranceRate: (restA.insuranceRate as number | undefined) ?? 0.005,
            },
          }
        }
        if (version < 10) {
          // Upgrade maintenanceRate from old default 0.07 → 0.10 if user hasn't customised it
          const assumptions = (s.assumptions as Record<string, unknown>) ?? {}
          const maint = assumptions.maintenanceRate as number | undefined
          return {
            ...s,
            assumptions: {
              ...assumptions,
              maintenanceRate: (maint === 0.07 || maint === 0.05 || maint == null) ? 0.10 : maint,
            },
          }
        }
        if (version < 11) {
          // Force-reset propertyTypes to all 4 types so filter always defaults to "All"
          const search = (s.search as Record<string, unknown>) ?? {}
          return {
            ...s,
            search: {
              ...search,
              propertyTypes: DEFAULT_SEARCH.propertyTypes,
            },
          }
        }
        if (version < 12) {
          // Add capExRate and reset maintenanceRate to 5% (was 10% which double-counted capEx)
          const assumptions = (s.assumptions as Record<string, unknown>) ?? {}
          return {
            ...s,
            assumptions: {
              ...assumptions,
              maintenanceRate: 0.05,
              capExRate: 0.03,
            },
          }
        }
        if (version < 13) {
          // Add tenant turnover assumptions
          const assumptions = (s.assumptions as Record<string, unknown>) ?? {}
          return {
            ...s,
            assumptions: {
              ...assumptions,
              tenancyYears: (assumptions.tenancyYears as number | undefined) ?? 3,
              turnoverCost: (assumptions.turnoverCost as number | undefined) ?? 1500,
            },
          }
        }
        if (version < 14) {
          // Update maintenance/capEx to new defaults; add realtorRate
          const assumptions = (s.assumptions as Record<string, unknown>) ?? {}
          const maint = assumptions.maintenanceRate as number | undefined
          const capEx = assumptions.capExRate as number | undefined
          return {
            ...s,
            assumptions: {
              ...assumptions,
              maintenanceRate: (maint === 0.05 || maint == null) ? 0.10 : maint,
              capExRate: (capEx === 0.03 || capEx == null) ? 0.10 : capEx,
              realtorRate: (assumptions.realtorRate as number | undefined) ?? 0.03,
            },
          }
        }
        return s
      },
      partialize: (state) => ({
        search: state.search,
        layers: state.layers,
        assumptions: state.assumptions,
        originalRents: state.originalRents,
      }),
    },
  ),
)
