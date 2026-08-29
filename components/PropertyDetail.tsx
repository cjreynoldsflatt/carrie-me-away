'use client'

import Image from 'next/image'
import { ArrowLeft, Building2, Home, Clock, ExternalLink, Trash2, MapPin, RotateCcw, Navigation, ShieldAlert } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { computeMetrics, computeConservativeRent, equityScenarios, tenYearRentalIncome, distanceMiles, LLC_ANNUAL_COST, computeMonthlyPayment, computeRemainingBalance } from '@/lib/investment'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { fmtCurrency, fmtDom, fmtPayback, fmtPrice, fmtRent, fmtYield } from '@/lib/format'
import { cn } from '@/lib/utils'
import { HOME } from '@/lib/config'
import { CMA_I, getVestingStatus } from '@/lib/cmai'
import type { SaleListing } from '@/lib/types'

// ── Grade scale (matches PropertyCard) ───────────────────────────────────────
function scoreGrade(score: number): string {
  if (score >= 70) return 'A+'
  if (score >= 57) return 'A'
  if (score >= 44) return 'B+'
  if (score >= 32) return 'B'
  if (score >= 20) return 'C'
  return 'D'
}
function gradeColor(score: number): string {
  if (score >= 70) return 'bg-emerald-600'
  if (score >= 57) return 'bg-cyan-600'
  if (score >= 44) return 'bg-blue-600'
  if (score >= 32) return 'bg-orange-400'
  if (score >= 20) return 'bg-orange-600'
  return 'bg-red-600'
}

// ── Yield label (describes the yield %, not the grade) ───────────────────────
function yieldLabel(y: number) {
  if (y >= 0.055) return 'Exceptional'
  if (y >= 0.0475) return 'Very Good'
  if (y >= 0.04) return 'Good'
  if (y >= 0.0325) return 'Fair'
  if (y >= 0.025) return 'Below Average'
  return 'Poor'
}
// Score-based colors (match grade circle & map marker)
function yieldColor(score: number) {
  if (score >= 70) return 'text-emerald-700'
  if (score >= 57) return 'text-cyan-700'
  if (score >= 44) return 'text-blue-700'
  if (score >= 32) return 'text-orange-500'
  if (score >= 20) return 'text-orange-700'
  return 'text-red-600'
}
function yieldBg(score: number) {
  if (score >= 70) return 'bg-emerald-50 border-emerald-200'
  if (score >= 57) return 'bg-cyan-50 border-cyan-200'
  if (score >= 44) return 'bg-blue-50 border-blue-200'
  if (score >= 32) return 'bg-orange-50 border-orange-200'
  if (score >= 20) return 'bg-orange-100 border-orange-300'
  return 'bg-red-50 border-red-200'
}

// ── Shared ledger row ─────────────────────────────────────────────────────────
function Row({
  label,
  value,
  monthly,
  sub,
  prefix = '',
  muted = false,
  bold = false,
}: {
  label: string
  value: string
  monthly?: string
  sub?: string
  prefix?: string
  muted?: boolean
  bold?: boolean
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-1.5', muted && 'opacity-60')}>
      <div>
        <span className={cn('text-sm text-slate-700', bold && 'font-semibold text-slate-900')}>
          {prefix && <span className="inline-block w-4 text-slate-400 text-sm">{prefix}</span>}
          {label}
        </span>
        {sub && <div className="text-xs text-slate-400 ml-4">{sub}</div>}
      </div>
      <div className="text-right shrink-0">
        <span className={cn('text-sm tabular-nums', bold ? 'font-semibold text-slate-900' : 'text-slate-700')}>
          {value}
        </span>
        {monthly && <div className="text-xs text-slate-400 tabular-nums">{monthly}/mo</div>}
      </div>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-slate-200 my-1" />
}

function TotalRow({ label, value, monthly, color }: { label: string; value: string; monthly?: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm font-bold text-slate-900">{label}</span>
      <div className="text-right">
        <span className={cn('text-base font-bold tabular-nums', color ?? 'text-slate-900')}>{value}</span>
        {monthly && <div className="text-xs text-slate-400 tabular-nums">{monthly}/mo</div>}
      </div>
    </div>
  )
}

function abbr(v: number) {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${v < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${v < 0 ? '-' : ''}$${Math.round(abs / 1_000)}K`
  return `$${v}`
}

const BENCHMARKS = [
  { label: 'S&P 500 (VOO)', rate: 0.130 },
  { label: 'REITs (VNQ)', rate: 0.035 },
  { label: 'US Bond Index (AGG)', rate: -0.003 },
]

function InlineSlider({
  label, value, onChange, min, max, step, format,
}: {
  label?: string
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
        {label && <span className="text-xs text-slate-500">{label}</span>}
        <span className="text-xs font-semibold text-slate-700 tabular-nums ml-auto">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
    </div>
  )
}

function GearRow({
  id, label, value, monthly, prefix, sub,
  openGear, setOpenGear, children,
}: {
  id: string
  label: string
  value: string
  monthly?: string
  prefix?: string
  sub?: string
  openGear: string | null
  setOpenGear: (id: string | null) => void
  children: React.ReactNode
}) {
  const isOpen = openGear === id
  return (
    <div className={cn('-mx-4 px-4 transition-colors', isOpen ? 'bg-blue-50' : 'hover:bg-slate-50')}>
      <button
        onClick={() => setOpenGear(isOpen ? null : id)}
        className="w-full flex items-start justify-between gap-4 text-left py-1.5"
      >
        <div>
          <span className="text-sm text-slate-700">
            {prefix && <span className="inline-block w-4 text-slate-400 text-sm">{prefix}</span>}
            {label}
          </span>
          {sub && <div className="text-xs text-slate-400 ml-4">{sub}</div>}
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm tabular-nums text-slate-700">{value}</span>
          {monthly && <div className="text-xs text-slate-400 tabular-nums">{monthly}/mo</div>}
        </div>
      </button>
      {isOpen && (
        <div className="pb-3 pt-0.5 space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PropertyDetail({ onBack }: { onBack?: () => void }) {
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const saleListings = useAppStore((s) => s.saleListings)
  const deleteListing = useAppStore((s) => s.deleteListing)
  const assumptions = useAppStore((s) => s.assumptions)
  const setAssumptions = useAppStore((s) => s.setAssumptions)
  const saveRentToDb = useAppStore((s) => s.saveRentToDb)
  const resetRentToOriginal = useAppStore((s) => s.resetRentToOriginal)
  const originalRent = useAppStore((s) => selectedId ? s.originalRents[selectedId] : undefined)
  const saveRepairsToDb = useAppStore((s) => s.saveRepairsToDb)
  const saveSuperToDb = useAppStore((s) => s.saveSuperToDb)
  const savePropertyTypeToDb = useAppStore((s) => s.savePropertyTypeToDb)
  const saveUnitsToDb = useAppStore((s) => s.saveUnitsToDb)
  const listing = saleListings.find((l) => l.id === selectedId)

  const isMultiFamily = listing?.propertyType === 'Multi Family'

  // Local editable values — reset when selected property changes
  const [repairsInput, setRepairsInput] = useState(20000)
  const [rentInput, setRentInput] = useState(listing?.estimatedRent ?? 0)
  const [unitsInput, setUnitsInput] = useState(listing?.units ?? 2)
  const [propertyTaxInput, setPropertyTaxInput] = useState(listing?.propertyTaxAnnual ?? 0)
  // Per-unit rents for multi-family
  const [unitRents, setUnitRents] = useState<number[]>([])
  // Which gear row is expanded
  const [openGear, setOpenGear] = useState<string | null>(null)
  // Purchase method for CMA financing
  const [purchaseMethod, setPurchaseMethod] = useState<'cash' | 'ccap'>('cash')
  const [ccapRate, setCcapRate] = useState(0.06)
  const [pmRateBeforeDisable, setPmRateBeforeDisable] = useState(
    assumptions.propertyManagementRate > 0 ? assumptions.propertyManagementRate : 0.10
  )
  const [superCostInput, setSuperCostInput] = useState(listing?.superAnnualCost ?? 1449)
  const [superBeforeDisable, setSuperBeforeDisable] = useState(listing?.superAnnualCost ?? 1449)
  // Operating reserve — CMA funds $20k reserve per property at acquisition
  const PROPERTY_RESERVE = 20_000
  const [currentReserveInput, setCurrentReserveInput] = useState(PROPERTY_RESERVE)
  // Maximum Purchase Price — other costs (permits/legal/contingency); target yield lives in global assumptions
  const [otherCostsInput, setOtherCostsInput] = useState(0)

  useEffect(() => {
    const dbRent = listing?.estimatedRent ?? 0
    const dbUnits = listing?.units ?? 2
    setRepairsInput(20000)
    // Default to the same conservative rent the map/list uses for grading (20th-percentile of range)
    const hasRentRange = (listing?.rentLow ?? 0) > 0 && (listing?.rentHigh ?? 0) > 0 && listing?.rentConfidence !== 'High'
    const defaultRent = hasRentRange
      ? computeConservativeRent(dbRent, listing?.rentLow ?? 0, listing?.rentHigh ?? 0, listing?.rentConfidence ?? 'Low')
      : dbRent
    setRentInput(defaultRent)
    setUnitsInput(dbUnits)
    setPropertyTaxInput(listing?.propertyTaxAnnual ?? 0)
    const dbSuper = listing?.superAnnualCost ?? 1449
    setSuperCostInput(dbSuper)
    setSuperBeforeDisable(dbSuper > 0 ? dbSuper : 1449)
    setOpenGear(null)
    setPurchaseMethod('cash')
    setCcapRate(0.06)
    setOtherCostsInput(0)
    if (listing?.propertyType === 'Multi Family' && dbUnits >= 2) {
      const perUnit = Math.round(dbRent / dbUnits)
      setUnitRents(Array(dbUnits).fill(perUnit))
    } else {
      setUnitRents([])
    }
  }, [listing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveRentInput = isMultiFamily && unitRents.length > 0
    ? unitRents.reduce((s, r) => s + r, 0)
    : rentInput

  if (!listing) return null

  const vesting = getVestingStatus()

  // Computed rent scenario — derived from rentInput vs preset values (no extra state needed)
  const hasRange = listing.rentLow > 0 && listing.rentHigh > 0 && listing.rentConfidence !== 'High'
  const activeScenario = !hasRange ? 'custom'
    : rentInput === listing.rentLow ? 'low'
    : rentInput === listing.estimatedRent ? 'moderate'
    : rentInput === listing.rentHigh ? 'high'
    : 'custom'

  // Recompute metrics live using global assumptions + current input values
  const metrics = computeMetrics({
    price: listing.price,
    hoaMonthly: listing.hoaMonthly,
    estimatedRent: effectiveRentInput,
    propertyTaxAnnual: propertyTaxInput,
    insuranceRate: assumptions.insuranceRate,
    closingCostRate: assumptions.closingCostRate,
    repairs: repairsInput,
    superAnnualCost: superCostInput,
    vacancyRate: assumptions.vacancyRate,
    maintenanceRate: assumptions.maintenanceRate,
    capExRate: assumptions.capExRate,
    propertyManagementRate: assumptions.propertyManagementRate,
    tenancyYears: assumptions.tenancyYears,
    turnoverCost: assumptions.turnoverCost,
    pestControlMonthly: assumptions.pestControlMonthly,
    lawnCareMonthly: assumptions.lawnCareMonthly,
    rentalDemand: listing.rentalDemand,
    rentConfidence: listing.rentConfidence,
    rentalEvidence: listing.rentalEvidence,
  })

  const distFromHome = distanceMiles(HOME.lat, HOME.lng, listing.lat, listing.lng)
  const closingCosts = listing.price * assumptions.closingCostRate
  const annualHOA = listing.hoaMonthly * 12
  const grossAnnualRent = effectiveRentInput * 12
  const mo = (annual: number) => fmtCurrency(Math.round(annual / 12))
  const managementCost = assumptions.propertyManagementRate > 0
    ? Math.round(grossAnnualRent * assumptions.propertyManagementRate)
    : 0
  const totalExpenses = metrics.vacancyReserve + metrics.maintenanceReserve + metrics.capExReserve +
    metrics.turnoverReserve + propertyTaxInput + annualHOA + metrics.insuranceAnnual +
    metrics.pestControlAnnual + metrics.lawnCareAnnual + metrics.superAnnual + managementCost + LLC_ANNUAL_COST
  const ccapMonthlyPayment = purchaseMethod === 'ccap'
    ? computeMonthlyPayment(metrics.totalCashInvested, ccapRate, 360)
    : 0
  const annualDebtService = ccapMonthlyPayment * 12
  const cmaCashFlowAnnual = metrics.netAnnualIncome - annualDebtService

  // Operating reserve — fixed $20k target, funded at acquisition
  const reserveTarget = PROPERTY_RESERVE
  const reserveShortfall = Math.max(reserveTarget - currentReserveInput, 0)
  const reserveFullyFunded = reserveShortfall === 0
  // Total cash CMA must commit at acquisition (property cost + operating reserve)
  const totalCashRequired = metrics.totalCashInvested + PROPERTY_RESERVE

  // Quarterly distribution waterfall
  const quarterlyNetCashFlow = Math.round(metrics.netAnnualIncome / 4)
  const quarterlyReserveContribution = Math.min(quarterlyNetCashFlow, reserveShortfall)
  const quarterlyDistributable = Math.max(quarterlyNetCashFlow - quarterlyReserveContribution, 0)
  const carrieQuarterly = Math.round(quarterlyDistributable * CMA_I.carrieResidualPct)
  const cameronQuarterly = Math.round(quarterlyDistributable * CMA_I.cameronResidualPct)
  const rentIsEdited = originalRent != null && originalRent > 0 && effectiveRentInput !== originalRent
  const repairsIsEdited = repairsInput !== (20000)

  // Maximum Purchase Price — Stabilized Yield on Cost
  const annualStabilizedNOI = metrics.netAnnualIncome
  const targetYieldOnCost = assumptions.targetYieldOnCost ?? 0.05
  const maxTotalProjectCost = targetYieldOnCost > 0 && annualStabilizedNOI > 0
    ? Math.round(annualStabilizedNOI / targetYieldOnCost) : 0
  // Solve for max price with closing costs as % of price: price * (1 + rate) + repairs + other = maxTotal
  const maxPurchasePrice = maxTotalProjectCost > 0
    ? Math.round((maxTotalProjectCost - repairsInput - otherCostsInput) / (1 + assumptions.closingCostRate)) : 0
  const maxClosingCosts = Math.round(Math.max(maxPurchasePrice, 0) * assumptions.closingCostRate)
  const marketCapRate = listing.price > 0 ? annualStabilizedNOI / listing.price : 0
  const priceDelta = listing.price - maxPurchasePrice
  const priceStatus: 'below' | 'near' | 'above' =
    maxPurchasePrice <= 0 ? 'above'
    : listing.price <= maxPurchasePrice ? 'below'
    : listing.price <= maxPurchasePrice * 1.05 ? 'near'
    : 'above'

  return (
    <div className="flex flex-col h-full">
      {/* Back header */}
      <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
        <button
          onClick={() => onBack ? onBack() : setSelectedId(null)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={15} />
          All properties
        </button>
        <button
          onClick={() => {
            if (confirm('Delete this listing?')) deleteListing(listing.id)
          }}
          className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-4">

          {/* ── Photo + overview ─────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="relative h-48 bg-slate-100">
              {listing.photoUrl ? (
                <Image src={listing.photoUrl} alt={listing.address} fill className="object-cover" sizes="400px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Home size={48} />
                </div>
              )}
              {/* Property type badge — mirrors PropertyCard */}
              <div className="absolute top-2 left-2">
                <span className="bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                  {listing.propertyType === 'Condo' || listing.propertyType === 'Multi Family'
                    ? <Building2 size={11} />
                    : <Home size={11} />}
                  {listing.propertyType}{isMultiFamily && unitsInput >= 2 ? ` · ${unitsInput} units` : ''}
                </span>
              </div>
              {/* Distance + days badges — mirrors PropertyCard top-right */}
              <div className="absolute top-2 right-2 flex gap-1.5">
                <span className="bg-white/90 backdrop-blur-sm text-slate-600 text-xs px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                  <Navigation size={10} />
                  {distFromHome.toFixed(1)} mi
                </span>
                {listing.daysOnMarket > 0 && (
                  <span className="bg-white/90 backdrop-blur-sm text-slate-600 text-xs px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                    <Clock size={10} />
                    {fmtDom(listing.daysOnMarket)}
                  </span>
                )}
              </div>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xl font-bold text-slate-900">{fmtPrice(listing.price)}</div>
                  <div className="text-sm text-slate-600 mt-0.5">{listing.address}</div>
                  <div className="text-sm text-slate-400">{listing.city}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0', gradeColor(metrics.investmentScore))}>
                    {scoreGrade(metrics.investmentScore)}
                  </div>
                  <div className={cn('text-right px-3 py-2 rounded-xl border text-sm font-bold', yieldBg(metrics.investmentScore), yieldColor(metrics.investmentScore))}>
                    {fmtYield(metrics.netCashYield)}
                    <div className="text-xs font-normal opacity-75">{yieldLabel(metrics.netCashYield)}</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                {isMultiFamily ? (
                  <span className="font-medium text-slate-700">{unitsInput} units</span>
                ) : null}
                <span>{listing.beds} bed{isMultiFamily ? '/unit' : ''}</span>
                <span>{listing.baths} bath{isMultiFamily ? '/unit' : ''}</span>
                <span>{listing.sqft.toLocaleString()} sqft</span>
                <span>Built {listing.yearBuilt}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <span className="text-xs text-slate-400">Type:</span>
                  <select
                    value={listing.propertyType}
                    onChange={(e) => {
                      const newType = e.target.value as import('@/lib/types').PropertyType
                      savePropertyTypeToDb(listing.id, newType)
                      if (newType === 'Multi Family') {
                        const newUnits = (listing.units ?? 1) >= 2 ? (listing.units ?? 2) : 2
                        if ((listing.units ?? 1) < 2) saveUnitsToDb(listing.id, newUnits)
                        setUnitsInput(newUnits)
                        const perUnit = Math.round(rentInput / newUnits)
                        setUnitRents(Array(newUnits).fill(perUnit))
                      } else {
                        // Carry the current effective rent (sum of unit rents if edited) into single-unit input
                        const currentRent = unitRents.length > 0
                          ? unitRents.reduce((s, r) => s + r, 0)
                          : rentInput
                        setRentInput(currentRent)
                        setUnitsInput(1)
                        setUnitRents([])
                      }
                    }}
                    className="text-sm text-slate-700 border border-slate-200 rounded-md px-2 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Townhouse">Townhouse</option>
                    <option value="Condo">Condo</option>
                    <option value="Single Family">Single Family</option>
                    <option value="Multi Family">Multi Family</option>
                  </select>
                </div>
                {isMultiFamily && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <span className="text-xs text-slate-400">Units:</span>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      step={1}
                      value={unitsInput}
                      onChange={(e) => {
                        const newUnits = Math.max(2, Math.round(Number(e.target.value)))
                        setUnitsInput(newUnits)
                        const total = unitRents.reduce((s, r) => s + r, 0) || rentInput
                        const perUnit = Math.round(total / newUnits)
                        setUnitRents(Array(newUnits).fill(perUnit))
                      }}
                      onBlur={(e) => {
                        const newUnits = Math.max(2, Math.round(Number(e.target.value)))
                        saveUnitsToDb(listing.id, newUnits)
                      }}
                      className="w-16 text-sm text-right tabular-nums border border-slate-200 rounded-md px-2 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                {listing.community && (
                  <span className="flex items-center gap-1"><Building2 size={12} />{listing.community}</span>
                )}
                {listing.daysOnMarket > 0 && (
                  <span className="flex items-center gap-1"><Clock size={12} />{fmtDom(listing.daysOnMarket)} on market</span>
                )}
                {listing.hoaMonthly > 0 && <span>HOA {fmtCurrency(listing.hoaMonthly)}/mo</span>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {listing.listingUrl && (
                  <a
                    href={listing.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <ExternalLink size={13} />
                    {listing.listingUrl.includes('redfin.com') ? 'View on Redfin' : 'View on Realtor.com'}
                  </a>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.address}, ${listing.city}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <MapPin size={13} />
                  Google Maps
                </a>
                {(() => {
                  const zip = listing.city.match(/\b(\d{5})\b/)?.[1]
                  return zip ? (
                    <a
                      href={`https://crimegrade.org/safest-places-in-${zip}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <ShieldAlert size={13} />
                      Crime map
                    </a>
                  ) : null
                })()}
              </div>
            </div>
          </div>

          {/* ── Purchase Method ──────────────────────────────── */}
          <Section title="Purchase Method">
            <div className="py-1 space-y-3">
              <div className="flex rounded-md border border-slate-200 overflow-hidden text-sm font-medium">
                <button
                  onClick={() => setPurchaseMethod('cash')}
                  className={`flex-1 py-2 transition-colors ${purchaseMethod === 'cash' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Carrie Capital
                </button>
                <button
                  onClick={() => setPurchaseMethod('ccap')}
                  className={`flex-1 py-2 transition-colors border-l border-slate-200 ${purchaseMethod === 'ccap' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Loan
                </button>
              </div>
              {purchaseMethod === 'ccap' && (
                <div className="space-y-3">
                  {/* Acquisition summary */}
                  <div className="rounded-lg bg-slate-50 px-3 py-2.5 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total acquisition cost</span>
                      <span className="font-semibold text-slate-800">{fmtCurrency(metrics.totalCashInvested)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Loan</span>
                      <span className="font-semibold text-slate-800">{fmtCurrency(metrics.totalCashInvested)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t border-slate-200 pt-1.5">
                      <span className="text-slate-800">CMA initial cash invested</span>
                      <span className="text-emerald-600">$0</span>
                    </div>
                  </div>
                  {/* Rate + debt service */}
                  <InlineSlider
                    label="Loan rate"
                    value={ccapRate}
                    onChange={setCcapRate}
                    min={0.02}
                    max={0.15}
                    step={0.005}
                    format={(v) => `${(v * 100).toFixed(1)}%`}
                  />
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Monthly P&amp;I</span>
                    <span className="font-semibold tabular-nums">{fmtCurrency(ccapMonthlyPayment)}/mo</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Annual debt service</span>
                    <span className="font-semibold tabular-nums">{fmtCurrency(annualDebtService)}/yr</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Finances 100% of the acquisition (price + closing costs + repairs) via a 30-year P+I loan. CMA's equity grows through appreciation and principal paydown.
                  </p>
                </div>
              )}
              {purchaseMethod === 'cash' && (
                <div className="rounded-lg bg-slate-50 px-3 py-2.5 space-y-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CMA-I Capital</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Carrie contributed capital</span>
                      <span className="font-semibold text-slate-800">{fmtCurrency(CMA_I.carrieContributedCapital)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Cameron contributed capital</span>
                      <span className="font-semibold text-slate-500">$0</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-2 space-y-1.5">
                    <div className="flex items-start justify-between text-sm gap-2">
                      <div>
                        <span className="text-slate-600">CMA-I capital deployed to this property</span>
                        <div className="text-xs text-slate-400">Incl. {fmtCurrency(PROPERTY_RESERVE)} Day 1 operating reserve</div>
                      </div>
                      <span className="font-semibold text-slate-800 shrink-0">{fmtCurrency(totalCashRequired)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Remaining undeployed CMA-I capital</span>
                      <span className={cn('font-semibold', CMA_I.carrieContributedCapital - totalCashRequired >= 0 ? 'text-slate-800' : 'text-amber-600')}>
                        {fmtCurrency(Math.max(0, CMA_I.carrieContributedCapital - totalCashRequired))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ── Step 1: Total cash invested ──────────────────── */}
          <Section title="Step 1 — Total Cash Required">
            <Row label="Purchase price" value={fmtCurrency(listing.price)} bold />
            <Row label={`Closing costs (${(assumptions.closingCostRate * 100).toFixed(0)}%)`} value={fmtCurrency(closingCosts)} prefix="+" />
            {/* Editable repairs row */}
            <div className="flex items-center justify-between gap-4 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-4 text-slate-400 text-sm">+</span>
                <span className="text-sm text-slate-700">Repairs / renovations</span>
                {repairsIsEdited && (
                  <span className="text-[9px] font-semibold text-blue-600 bg-blue-100 px-1 rounded">edited</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {repairsIsEdited && (
                  <button
                    onClick={() => setRepairsInput(20000)}
                    className="text-orange-500 hover:text-orange-700 flex items-center gap-0.5"
                    title="Reset to saved value"
                  >
                    <RotateCcw size={9} />
                  </button>
                )}
                <span className="text-sm text-slate-400">$</span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={repairsInput}
                  onChange={(e) => setRepairsInput(Math.max(0, Number(e.target.value)))}
                  onBlur={(e) => {
                    const val = Math.max(0, Number(e.target.value))
                    if (val !== (20000)) saveRepairsToDb(listing.id, val)
                  }}
                  className="w-24 text-sm text-right tabular-nums border border-slate-200 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>
            </div>
            <Row label="Initial operating reserve (Day 1)" value={fmtCurrency(PROPERTY_RESERVE)} prefix="+" />
            <Divider />
            <TotalRow label="Total cash required at acquisition" value={fmtCurrency(totalCashRequired)} />
          </Section>

          {/* ── Step 2: Gross annual rent ─────────────────────── */}
          <Section title="Step 2 — Gross Annual Rent">
            {/* No estimate warning */}
            {listing.rentConfidence !== 'High' && listing.estimatedRent === 0 && (
              <div className="text-xs text-amber-600 pb-2">
                No automated estimate — enter a rent below to run calculations.
              </div>
            )}
            {isMultiFamily && unitRents.length > 0 ? (
              // Per-unit rent inputs for multi-family — auto-save on blur
              unitRents.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-1.5">
                  <span className="text-sm font-semibold text-slate-900">Unit {i + 1} monthly rent</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-400">$</span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={r}
                      onChange={(e) => {
                        const next = [...unitRents]
                        next[i] = Math.max(0, Number(e.target.value))
                        setUnitRents(next)
                      }}
                      onBlur={(e) => {
                        const next = [...unitRents]
                        next[i] = Math.max(0, Number(e.target.value))
                        saveRentToDb(listing.id, next.reduce((s, v) => s + v, 0))
                      }}
                      className="w-24 text-sm text-right tabular-nums border border-slate-200 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>
              ))
            ) : (
              <>
                {/* Low / Moderate / High segment picker */}
                {hasRange && (
                  <div className="mb-3">
                    <div className="mb-2">
                      <span className="text-xs text-slate-500">
                        {listing.rentConfidence === 'Medium' ? 'HUD SAFMR + adjustments' : 'HUD FMR + adjustments'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 rounded-lg p-1">
                      {([
                        { key: 'low' as const, label: 'Low', value: listing.rentLow },
                        { key: 'moderate' as const, label: 'Moderate', value: listing.estimatedRent },
                        { key: 'high' as const, label: 'High', value: listing.rentHigh },
                      ]).map(({ key, label, value }) => (
                        <button
                          key={key}
                          onClick={() => setRentInput(value)}
                          className={cn(
                            'rounded-md py-1.5 px-1 text-center transition-all',
                            activeScenario === key
                              ? 'bg-white shadow-sm text-slate-900'
                              : 'text-slate-500 hover:text-slate-700'
                          )}
                        >
                          <div className="text-[10px] font-medium uppercase tracking-wide">{label}</div>
                          <div className="text-sm font-bold tabular-nums">{fmtRent(value)}</div>
                        </button>
                      ))}
                    </div>
                    {listing.conservativeRent > 0 && listing.conservativeRent < listing.estimatedRent && (
                      <div className="text-xs text-blue-600 mt-1.5">
                        Grade uses {fmtRent(listing.conservativeRent)} (conservative)
                      </div>
                    )}
                  </div>
                )}
                {/* Custom override / manual input */}
                <div className="flex items-center justify-between gap-4 py-1.5">
                  <span className={cn(
                    'text-sm',
                    hasRange && activeScenario !== 'custom' ? 'text-slate-400' : 'font-semibold text-slate-900'
                  )}>
                    {hasRange
                      ? 'Custom override'
                      : listing.rentConfidence === 'High' ? 'Monthly rent' : 'Expected monthly rent'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-slate-400">$</span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={hasRange && activeScenario !== 'custom' ? '' : rentInput}
                      placeholder={hasRange && activeScenario !== 'custom' ? String(rentInput) : undefined}
                      onChange={(e) => setRentInput(Math.max(0, Number(e.target.value)))}
                      onBlur={(e) => {
                        if (hasRange && activeScenario !== 'custom') return
                        const val = Math.max(0, Number(e.target.value))
                        if (val > 0 && val !== listing.estimatedRent) saveRentToDb(listing.id, val)
                      }}
                      className="w-24 text-sm text-right tabular-nums border border-slate-200 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>
                {listing.rentConfidence === 'High' && (
                  <div className="text-xs text-slate-400 pb-1">
                    Manually entered — overrides the automated estimate.
                  </div>
                )}
                {rentIsEdited && originalRent && (
                  <button
                    onClick={async () => {
                      await resetRentToOriginal(listing.id)
                      setRentInput(originalRent)
                    }}
                    className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 pb-1"
                  >
                    <RotateCcw size={10} />
                    Reset to original estimate ({fmtRent(originalRent)})
                  </button>
                )}
              </>
            )}
            {/* Total + reset for MF */}
            {isMultiFamily && unitRents.length > 0 && (
              <div className="flex items-center gap-2 pb-1">
                <span className="text-xs text-slate-500 font-medium">Total: {fmtRent(effectiveRentInput)}</span>
                {rentIsEdited && (
                  <button
                    onClick={async () => { await resetRentToOriginal(listing.id); const orig = originalRent ?? 0; setUnitRents(Array(unitsInput).fill(Math.round(orig / unitsInput))) }}
                    className="text-orange-500 hover:text-orange-700 flex items-center gap-0.5 text-[10px]"
                    title="Reset to original HUD estimate"
                  >
                    <RotateCcw size={9} /> reset
                  </button>
                )}
              </div>
            )}
            <Row label="× 12 months" value="" muted />
            <Divider />
            <TotalRow label="Gross annual rent" value={fmtCurrency(grossAnnualRent)} monthly={mo(grossAnnualRent)} />
          </Section>

          {/* ── Rent comparables ─────────────────────────────── */}
          <RentCompsSection listing={listing} />

          {/* ── Step 3: Annual expenses ───────────────────────── */}
          <Section title="Step 3 — Annual Expenses">
            <GearRow
              id="vacancy"
              label={`Vacancy reserve (${(assumptions.vacancyRate * 100).toFixed(0)}%)`}
              value={fmtCurrency(metrics.vacancyReserve)}
              monthly={mo(metrics.vacancyReserve)}
              prefix="−"
              sub="Estimated periods without a tenant"
              openGear={openGear} setOpenGear={setOpenGear}
            >
              <InlineSlider value={assumptions.vacancyRate} onChange={(v) => setAssumptions({ vacancyRate: v })} min={0} max={0.3} step={0.005} format={(v) => `${(v * 100).toFixed(1)}%`} />
              <p className="text-xs text-slate-400">Global · applies to all properties</p>
            </GearRow>
            <GearRow
              id="maintenance"
              label={`Maintenance reserve (${(assumptions.maintenanceRate * 100).toFixed(0)}%)`}
              value={fmtCurrency(metrics.maintenanceReserve)}
              monthly={mo(metrics.maintenanceReserve)}
              prefix="−"
              sub="Routine repairs, appliances, wear"
              openGear={openGear} setOpenGear={setOpenGear}
            >
              <InlineSlider value={assumptions.maintenanceRate} onChange={(v) => setAssumptions({ maintenanceRate: v })} min={0} max={0.3} step={0.005} format={(v) => `${(v * 100).toFixed(1)}% of rent`} />
              <p className="text-xs text-slate-400">Global · applies to all properties</p>
            </GearRow>
            <GearRow
              id="capex"
              label={`CapEx reserve (${(assumptions.capExRate * 100).toFixed(0)}%)`}
              value={fmtCurrency(metrics.capExReserve)}
              monthly={mo(metrics.capExReserve)}
              prefix="−"
              sub="HVAC, roof, water heater, windows, flooring"
              openGear={openGear} setOpenGear={setOpenGear}
            >
              <InlineSlider value={assumptions.capExRate} onChange={(v) => setAssumptions({ capExRate: v })} min={0} max={0.3} step={0.005} format={(v) => `${(v * 100).toFixed(1)}% of rent`} />
              <p className="text-xs text-slate-400">Global · applies to all properties</p>
            </GearRow>
            <GearRow
              id="turnover"
              label={`Tenant turnover ($${assumptions.turnoverCost.toLocaleString()} / ${assumptions.tenancyYears} yr)`}
              value={fmtCurrency(metrics.turnoverReserve)}
              monthly={mo(metrics.turnoverReserve)}
              prefix="−"
              sub="Cleaning, advertising, lost rent between tenancies"
              openGear={openGear} setOpenGear={setOpenGear}
            >
              <InlineSlider label="Expected tenancy" value={assumptions.tenancyYears} onChange={(v) => setAssumptions({ tenancyYears: v })} min={1} max={10} step={1} format={(v) => `${v} yr${v === 1 ? '' : 's'}`} />
              <InlineSlider label="Turnover cost" value={assumptions.turnoverCost} onChange={(v) => setAssumptions({ turnoverCost: v })} min={0} max={5000} step={250} format={(v) => `$${v.toLocaleString()}`} />
              <p className="text-xs text-slate-400">Global · applies to all properties</p>
            </GearRow>
            <GearRow
              id="taxes"
              label="Property taxes"
              value={fmtCurrency(propertyTaxInput)}
              monthly={mo(propertyTaxInput)}
              prefix="−"
              openGear={openGear} setOpenGear={setOpenGear}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Annual amount</span>
                  <span className="text-xs font-semibold text-slate-700 tabular-nums">{fmtCurrency(propertyTaxInput)}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={propertyTaxInput}
                  onChange={(e) => setPropertyTaxInput(Math.max(0, Number(e.target.value)))}
                  className="w-full text-sm text-right tabular-nums border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <p className="text-xs text-slate-400">Local override · resets on refresh</p>
              </div>
            </GearRow>
            {listing.hoaMonthly > 0 && (
              <Row label={`HOA ($${listing.hoaMonthly}/mo × 12)`} value={fmtCurrency(annualHOA)} prefix="−" />
            )}
            <GearRow
              id="insurance"
              label="Insurance"
              value={fmtCurrency(metrics.insuranceAnnual)}
              monthly={mo(metrics.insuranceAnnual)}
              prefix="−"
              openGear={openGear} setOpenGear={setOpenGear}
            >
              <InlineSlider value={assumptions.insuranceRate} onChange={(v) => setAssumptions({ insuranceRate: v })} min={0.001} max={0.015} step={0.001} format={(v) => `${(v * 100).toFixed(1)}% of price/yr`} />
              <p className="text-xs text-slate-400">Global · applies to all properties</p>
            </GearRow>
            <GearRow
              id="pest"
              label={`Pest control ($${assumptions.pestControlMonthly}/mo)`}
              value={fmtCurrency(metrics.pestControlAnnual)}
              monthly={mo(metrics.pestControlAnnual)}
              prefix="−"
              openGear={openGear} setOpenGear={setOpenGear}
            >
              <InlineSlider value={assumptions.pestControlMonthly} onChange={(v) => setAssumptions({ pestControlMonthly: v })} min={0} max={200} step={5} format={(v) => v === 0 ? 'Included / N/A' : `$${v}/mo`} />
              <p className="text-xs text-slate-400">Global · applies to all properties</p>
            </GearRow>
            <GearRow
              id="lawn"
              label={`Lawn care ($${assumptions.lawnCareMonthly}/mo)`}
              value={fmtCurrency(metrics.lawnCareAnnual)}
              monthly={mo(metrics.lawnCareAnnual)}
              prefix="−"
              openGear={openGear} setOpenGear={setOpenGear}
            >
              <InlineSlider value={assumptions.lawnCareMonthly} onChange={(v) => setAssumptions({ lawnCareMonthly: v })} min={0} max={300} step={5} format={(v) => v === 0 ? 'Included / N/A' : `$${v}/mo`} />
              <p className="text-xs text-slate-400">Global · applies to all properties</p>
            </GearRow>
            {/* Super Maintenance Protection — per-property, with toggle */}
            <div className={cn('-mx-4 px-4 transition-colors', openGear === 'super' ? 'bg-blue-50' : 'hover:bg-slate-50')}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpenGear(openGear === 'super' ? null : 'super')}
                onKeyDown={(e) => e.key === 'Enter' && setOpenGear(openGear === 'super' ? null : 'super')}
                className="w-full flex items-start justify-between gap-4 text-left py-1.5 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-700">
                    <span className="inline-block w-4 text-slate-400 text-sm">−</span>
                    Super Maintenance Protection
                  </span>
                  {/* On/Off toggle — inline next to label */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (superCostInput > 0) {
                        setSuperBeforeDisable(superCostInput)
                        setSuperCostInput(0)
                        saveSuperToDb(listing.id, 0)
                      } else {
                        setSuperCostInput(superBeforeDisable)
                        saveSuperToDb(listing.id, superBeforeDisable)
                      }
                    }}
                    className={cn(
                      'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none',
                      superCostInput > 0 ? 'bg-blue-500' : 'bg-slate-300',
                    )}
                  >
                    <span className={cn(
                      'pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform',
                      superCostInput > 0 ? 'translate-x-3' : 'translate-x-0',
                    )} />
                  </button>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm tabular-nums text-slate-700">
                    {superCostInput > 0 ? fmtCurrency(superCostInput) : 'Disabled'}
                  </span>
                  {superCostInput > 0 && <div className="text-xs text-slate-400 tabular-nums">{mo(superCostInput)}/mo</div>}
                </div>
              </div>
              {openGear === 'super' && (
                <div className="pb-3 pt-0.5 space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Annual cost</span>
                      <span className="text-xs font-semibold text-slate-700 tabular-nums">{fmtCurrency(superCostInput > 0 ? superCostInput : superBeforeDisable)}/yr</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={superCostInput > 0 ? superCostInput : superBeforeDisable}
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value))
                        setSuperBeforeDisable(v > 0 ? v : superBeforeDisable)
                        if (superCostInput > 0) setSuperCostInput(v)
                      }}
                      onBlur={(e) => {
                        const v = Math.max(0, Number(e.target.value))
                        if (superCostInput > 0) {
                          setSuperCostInput(v)
                          saveSuperToDb(listing.id, v)
                        }
                      }}
                      className="w-full text-sm text-right tabular-nums border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <p className="text-xs text-slate-400">Maintenance marketplace / home systems &amp; appliance protection. Per-property.</p>
                </div>
              )}
            </div>
            <Row
              label="LLC annual fee"
              value={fmtCurrency(LLC_ANNUAL_COST)}
              monthly={mo(LLC_ANNUAL_COST)}
              prefix="−"
              sub="CMA Investments LLC fixed cost"
            />
            <div className={cn('-mx-4 px-4 transition-colors', openGear === 'management' ? 'bg-blue-50' : 'hover:bg-slate-50')}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpenGear(openGear === 'management' ? null : 'management')}
                onKeyDown={(e) => e.key === 'Enter' && setOpenGear(openGear === 'management' ? null : 'management')}
                className="w-full flex items-start justify-between gap-4 text-left py-1.5 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-700">
                    <span className="inline-block w-4 text-slate-400 text-sm">−</span>
                    {assumptions.propertyManagementRate > 0
                      ? `CMA property mgmt fee (${(assumptions.propertyManagementRate * 100).toFixed(0)}%)`
                      : 'CMA property mgmt fee'}
                  </span>
                  {/* Inline on/off toggle — stopPropagation so it doesn't open/close the gear */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (assumptions.propertyManagementRate > 0) {
                        setPmRateBeforeDisable(assumptions.propertyManagementRate)
                        setAssumptions({ propertyManagementRate: 0 })
                      } else {
                        setAssumptions({ propertyManagementRate: pmRateBeforeDisable })
                      }
                    }}
                    className={cn(
                      'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none',
                      assumptions.propertyManagementRate > 0 ? 'bg-blue-500' : 'bg-slate-300',
                    )}
                  >
                    <span className={cn(
                      'pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform',
                      assumptions.propertyManagementRate > 0 ? 'translate-x-3' : 'translate-x-0',
                    )} />
                  </button>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm tabular-nums text-slate-700">
                    {managementCost > 0 ? fmtCurrency(managementCost) : 'Self-managed'}
                  </span>
                  {managementCost > 0 && <div className="text-xs text-slate-400 tabular-nums">{mo(managementCost)}/mo</div>}
                </div>
              </div>
              {openGear === 'management' && (
                <div className="pb-3 pt-0.5 space-y-2">
                  <InlineSlider
                    value={assumptions.propertyManagementRate > 0 ? assumptions.propertyManagementRate : pmRateBeforeDisable}
                    onChange={(v) => { setAssumptions({ propertyManagementRate: v }); if (v > 0) setPmRateBeforeDisable(v) }}
                    min={0.05} max={0.2} step={0.005}
                    format={(v) => `${(v * 100).toFixed(1)}% of rent`}
                  />
                  <p className="text-xs text-slate-400">Global · applies to all properties</p>
                </div>
              )}
            </div>
            <Divider />
            <TotalRow
              label="Total annual expenses"
              value={fmtCurrency(totalExpenses)}
              monthly={mo(totalExpenses)}
              color="text-red-600"
            />
          </Section>

          {/* ── Step 4: Net annual income ─────────────────────── */}
          <Section title="Step 4 — Net Annual Income">
            <Row label="Gross annual rent" value={fmtCurrency(grossAnnualRent)} monthly={mo(grossAnnualRent)} />
            <Row
              label="Total annual expenses"
              value={fmtCurrency(totalExpenses)}
              monthly={mo(totalExpenses)}
              prefix="−"
            />
            <Divider />
            <TotalRow
              label="Net annual income"
              value={fmtCurrency(metrics.netAnnualIncome)}
              monthly={mo(metrics.netAnnualIncome)}
              color={metrics.netAnnualIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}
            />
          </Section>

          {/* ── CCAP Cash Flow (CCAP mode only) ──────────────── */}
          {purchaseMethod === 'ccap' && (
            <Section title="CMA Cash Flow After Financing">
              <div className="space-y-1 py-1">
                <Row label="Property net income (before debt)" value={fmtCurrency(metrics.netAnnualIncome)} monthly={mo(metrics.netAnnualIncome)} />
                <Row
                  label={`Loan debt service (${(ccapRate * 100).toFixed(1)}%)`}
                  value={fmtCurrency(annualDebtService)}
                  monthly={`${fmtCurrency(ccapMonthlyPayment)}`}
                  prefix="−"
                  sub="30-yr P+I on 100% of purchase price"
                />
                <Divider />
                <TotalRow
                  label="CMA annual cash flow"
                  value={fmtCurrency(cmaCashFlowAnnual)}
                  monthly={mo(cmaCashFlowAnnual)}
                  color={cmaCashFlowAnnual >= 0 ? 'text-emerald-700' : 'text-red-600'}
                />
              </div>
            </Section>
          )}

          {/* ── Net cash yield ────────────────────────────────── */}
          <div className={cn('rounded-xl border p-4 space-y-1', yieldBg(metrics.investmentScore))}>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Net Cash Yield</div>
            <div className="text-sm text-slate-600">
              {fmtCurrency(metrics.netAnnualIncome)}/yr ÷ {fmtCurrency(totalCashRequired)} invested
            </div>
            <div className={cn('text-3xl font-bold', yieldColor(metrics.investmentScore))}>
              {fmtYield(totalCashRequired > 0 ? metrics.netAnnualIncome / totalCashRequired : 0)}
            </div>
            <div className={cn('text-sm font-semibold', yieldColor(metrics.investmentScore))}>
              {yieldLabel(totalCashRequired > 0 ? metrics.netAnnualIncome / totalCashRequired : 0)}
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Target: 6%+ for a strong cash-flow investment. At 7%+ the deal earns meaningfully more than most liquid alternatives without the same concentration risk.
            </p>
          </div>

          {/* ── Maximum Purchase Price / Stabilized Yield on Cost ── */}
          <Section title="Maximum Purchase Price">
            <p className="text-xs text-slate-400 leading-relaxed pt-1 pb-2">
              Stabilized yield on cost — the highest price you can pay and still hit your target return. NOI excludes debt payments.
            </p>

            {/* Target yield — slider */}
            <div className="py-1.5">
              <InlineSlider
                label="Target yield on cost"
                value={parseFloat((targetYieldOnCost * 100).toFixed(1))}
                onChange={(v) => setAssumptions({ targetYieldOnCost: v / 100 })}
                min={1}
                max={20}
                step={0.5}
                format={(v) => `${v.toFixed(1)}%`}
              />
            </div>

            <Row label="Annual stabilized NOI" value={fmtCurrency(annualStabilizedNOI)} />
            <Row
              label="Max total project cost"
              value={maxTotalProjectCost > 0 ? fmtCurrency(maxTotalProjectCost) : '—'}
              sub={`NOI ÷ ${(targetYieldOnCost * 100).toFixed(1)}%`}
            />

            <div className="border-t border-slate-100 my-1.5" />
            <p className="text-xs font-medium text-slate-500 pb-1">Less other project costs</p>

            <Row label="Closing costs" value={fmtCurrency(maxClosingCosts)} prefix="−" sub={`${(assumptions.closingCostRate * 100).toFixed(0)}% of max price`} />
            <Row label="Repairs / rehab" value={fmtCurrency(repairsInput)} prefix="−" />

            {/* Permits / legal / contingency — editable */}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-slate-700">
                <span className="inline-block w-4 text-slate-400 text-sm">−</span>
                Permits, legal, contingency
              </span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-400">$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={otherCostsInput}
                  onChange={(e) => setOtherCostsInput(Math.max(0, Number(e.target.value)))}
                  className="w-24 text-sm text-right tabular-nums border border-slate-200 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <Divider />
            <TotalRow
              label="Maximum Purchase Price"
              value={maxPurchasePrice > 0 ? fmtCurrency(maxPurchasePrice) : '—'}
              color={priceStatus === 'below' ? 'text-emerald-700' : priceStatus === 'near' ? 'text-orange-600' : 'text-red-600'}
            />

            {/* Asking price vs maximum */}
            <div className={cn(
              'mt-2 rounded-lg px-3 py-2.5',
              priceStatus === 'below' ? 'bg-emerald-50' : priceStatus === 'near' ? 'bg-orange-50' : 'bg-red-50'
            )}>
              <div className={cn('text-sm font-semibold', priceStatus === 'below' ? 'text-emerald-700' : priceStatus === 'near' ? 'text-orange-700' : 'text-red-700')}>
                {priceStatus === 'below' ? 'Below maximum' : priceStatus === 'near' ? 'Near maximum' : 'Above maximum'}
              </div>
              <div className={cn('text-xs mt-0.5', priceStatus === 'below' ? 'text-emerald-600' : priceStatus === 'near' ? 'text-orange-600' : 'text-red-600')}>
                {maxPurchasePrice > 0 ? (
                  priceDelta > 0
                    ? `Asking ${fmtPrice(listing.price)} · needs to drop ${fmtCurrency(priceDelta)} to hit target`
                    : `Asking ${fmtPrice(listing.price)} · ${fmtCurrency(Math.abs(priceDelta))} below maximum`
                ) : 'NOI too low to support any purchase price at this target yield'}
              </div>
            </div>

            {/* Market cap rate — separate metric */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-700">Market Cap Rate</div>
                <div className="text-xs text-slate-400 mt-0.5">NOI ÷ asking price</div>
              </div>
              <div className="text-base font-semibold text-slate-700 tabular-nums">{fmtYield(marketCapRate)}</div>
            </div>
          </Section>

          {/* ── Stress test ──────────────────────────────────── */}
          {effectiveRentInput > 0 && (() => {
            const stressBase = {
              price: listing.price,
              hoaMonthly: listing.hoaMonthly,
              propertyTaxAnnual: listing.propertyTaxAnnual,
              insuranceRate: assumptions.insuranceRate,
              closingCostRate: assumptions.closingCostRate,
              repairs: repairsInput,
              superAnnualCost: superCostInput,
              capExRate: assumptions.capExRate,
              propertyManagementRate: assumptions.propertyManagementRate,
              tenancyYears: assumptions.tenancyYears,
              turnoverCost: assumptions.turnoverCost,
              pestControlMonthly: assumptions.pestControlMonthly,
              lawnCareMonthly: assumptions.lawnCareMonthly,
              rentalDemand: listing.rentalDemand,
              rentConfidence: listing.rentConfidence,
              rentalEvidence: listing.rentalEvidence,
            }
            const conservative = computeMetrics({ ...stressBase, estimatedRent: Math.round(effectiveRentInput * 0.90), vacancyRate: 0.10, maintenanceRate: 0.07 })
            const downside = computeMetrics({ ...stressBase, estimatedRent: Math.round(effectiveRentInput * 0.85), vacancyRate: 0.15, maintenanceRate: 0.10 })
            const scenarios = [
              { label: 'Base Case', sub: `${fmtRent(effectiveRentInput)}, ${(assumptions.vacancyRate * 100).toFixed(0)}% vacancy`, m: metrics, highlight: true },
              { label: 'Conservative', sub: 'Rent −10%, vacancy 10%, maintenance 7%', m: conservative },
              { label: 'Downside', sub: 'Rent −15%, vacancy 15%, maintenance 10%', m: downside },
            ]
            return (
              <Section title="Stress Test">
                <p className="text-xs text-slate-400 leading-relaxed pt-1 pb-3">
                  How this deal holds up under less favorable conditions.
                </p>
                <div className="space-y-1">
                  {scenarios.map(({ label, sub, m, highlight }) => {
                    const yc = m.netCashYield >= 0.05 ? 'text-emerald-700' : m.netCashYield >= 0.025 ? 'text-orange-600' : 'text-red-600'
                    return (
                      <div key={label} className={cn('flex items-center justify-between rounded-lg px-3 py-2.5', highlight ? 'bg-slate-100' : '')}>
                        <div>
                          <div className={cn('text-sm', highlight ? 'font-semibold text-slate-800' : 'text-slate-600')}>{label}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={cn('text-sm font-bold tabular-nums', yc)}>{fmtYield(m.netCashYield)}</div>
                          <div className="text-xs text-slate-400 tabular-nums">{fmtCurrency(m.netAnnualIncome)}/yr</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )
          })()}

          {/* ── Payback period ────────────────────────────────── */}
          <Section title="Rental Income Payback">
            <div className="py-2 space-y-1">
              <div className="text-sm text-slate-600">
                {fmtCurrency(totalCashRequired)} invested ÷ {fmtCurrency(metrics.netAnnualIncome)}/yr income
              </div>
              <div className="text-3xl font-bold text-slate-900">{fmtPayback(metrics.netAnnualIncome > 0 ? totalCashRequired / metrics.netAnnualIncome : Infinity)}</div>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                Years of projected net rental income to equal the original cash invested. You still own the property throughout — this is not economic break-even or total return.
              </p>
            </div>
          </Section>


          {/* ── 5-year equity outlook (+ 1-yr breakdown) ──────── */}
          {(() => {
            const eq = equityScenarios(listing.price, listing.appreciationRate)        // 5-yr
            const eq1 = equityScenarios(listing.price, listing.appreciationRate, 1)    // 1-yr
            const tenYrRent = tenYearRentalIncome(metrics.netAnnualIncome)             // 5-yr
            const rent1yr = tenYearRentalIncome(metrics.netAnnualIncome, 1)            // 1-yr

            // CCAP-specific 5-yr calculations (computed always, used only in CCAP branch)
            const remBal10 = computeRemainingBalance(metrics.totalCashInvested, ccapRate, 360, 60)
            const propVal10 = Math.round(listing.price * Math.pow(1 + listing.appreciationRate, 5))
            const cmaEquity10 = propVal10 - remBal10
            const cumCashFlow10CCAP = Math.round(cmaCashFlowAnnual * 5)
            const cmaTotalGain10 = cumCashFlow10CCAP + cmaEquity10

            // CCAP 1-year breakdown
            const remBal1 = computeRemainingBalance(metrics.totalCashInvested, ccapRate, 360, 12)
            const propVal1 = Math.round(listing.price * Math.pow(1 + listing.appreciationRate, 1))
            const cmaEquity1 = propVal1 - remBal1
            const cumCashFlow1CCAP = Math.round(cmaCashFlowAnnual * 1)
            const cmaTotalGain1 = cumCashFlow1CCAP + cmaEquity1

            // Combined gain for reference
            const ownershipGain = purchaseMethod === 'ccap' ? cmaTotalGain10 : tenYrRent + eq.expected

            // ── CCAP mode ──────────────────────────────────────────
            if (purchaseMethod === 'ccap') {
              const ccapChartData = Array.from({ length: 6 }, (_, yr) => {
                const cashFlow = Math.round(cmaCashFlowAnnual * yr)
                const propVal = Math.round(listing.price * Math.pow(1 + listing.appreciationRate, yr))
                const remBal = yr === 0 ? metrics.totalCashInvested : computeRemainingBalance(metrics.totalCashInvested, ccapRate, 360, yr * 12)
                const equity = propVal - remBal
                return { yr, cashFlow, equity, total: cashFlow + equity }
              })
              return (
                <>
                  <Section title="5-Year Loan Projection">
                    <div className="py-2 space-y-4">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        CMA economic position over 5 years — cumulative cash flow after loan debt service, plus equity built through appreciation and principal paydown.
                      </p>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={ccapChartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="yr" tickFormatter={(v) => v === 0 ? 'Now' : `Yr ${v}`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={abbr} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
                          <Tooltip formatter={(v, name) => [fmtCurrency(v as number), name]} labelFormatter={(l) => l === 0 ? 'Today' : `Year ${l}`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                          <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                          <Line dataKey="cashFlow" name="Cumulative cash flow" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                          <Line dataKey="equity" name="CMA equity" stroke="#93c5fd" strokeWidth={1.5} dot={false} />
                          <Line dataKey="total" name="Total CMA position" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-slate-300" />Cumul. cash flow</span>
                        <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-blue-300" />CMA equity</span>
                        <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-[3px] border-blue-600" />Total position</span>
                      </div>
                      <div className="border-t border-slate-200 pt-3 space-y-1.5">
                        {/* Column headers */}
                        <div className="grid grid-cols-3 text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                          <span />
                          <span className="text-center">Year 1</span>
                          <span className="text-right">Year 5</span>
                        </div>
                        <div className="grid grid-cols-3 items-center text-sm font-medium">
                          <span className="text-slate-700">Cash profit/loss</span>
                          <span className={cn('text-center tabular-nums', cumCashFlow1CCAP >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                            {cumCashFlow1CCAP >= 0 ? '+' : ''}{fmtCurrency(cumCashFlow1CCAP)}
                          </span>
                          <span className={cn('text-right tabular-nums', cumCashFlow10CCAP >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                            {cumCashFlow10CCAP >= 0 ? '+' : ''}{fmtCurrency(cumCashFlow10CCAP)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 items-center text-sm">
                          <span className="text-slate-600">Property equity</span>
                          <span className="text-center font-semibold tabular-nums text-slate-700">+{fmtCurrency(cmaEquity1)}</span>
                          <span className="text-right font-semibold tabular-nums text-slate-700">+{fmtCurrency(cmaEquity10)}</span>
                        </div>
                        <div className="grid grid-cols-3 items-center text-base font-bold border-t border-slate-200 pt-1.5 mt-1.5">
                          <span className="text-slate-900">Net wealth created</span>
                          <span className={cn('text-center', cmaTotalGain1 >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                            {cmaTotalGain1 >= 0 ? '+' : ''}{fmtCurrency(cmaTotalGain1)}
                          </span>
                          <span className={cn('text-right', cmaTotalGain10 >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                            {cmaTotalGain10 >= 0 ? '+' : ''}{fmtCurrency(cmaTotalGain10)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Equity is wealth locked in the property — real but not spendable unless you sell or refinance. Cash flow is actual money in or out each month.
                      </p>
                    </div>
                  </Section>
                  <Section title="CMA-I Projected Member Outcome">
                    <div className="py-2 space-y-3">
                      <p className="text-xs text-slate-500">
                        Carrie 51% governance &amp; residual economic interest · Cameron 49% Service-Based Profits Interest
                      </p>
                      <div className="space-y-2">
                        {([
                          { name: 'Carrie Reynolds-Flatt', pct: CMA_I.carrieResidualPct, label: '51% residual interest' },
                          { name: 'Cameron Reynolds-Flatt', pct: CMA_I.cameronResidualPct, label: '49% service-based interest' },
                        ]).map(({ name, pct, label }) => {
                          const partnerCash = Math.round(cumCashFlow10CCAP * pct)
                          const partnerEquity = Math.round(cmaEquity10 * pct)
                          const partnerNet = Math.round(cmaTotalGain10 * pct)
                          const partnerQuarterly = Math.round(cmaCashFlowAnnual * pct / 4)
                          return (
                            <div key={name} className="rounded-lg bg-slate-50 px-3 py-2.5 space-y-1.5">
                              <div className="flex items-start justify-between">
                                <div className="text-sm font-semibold text-slate-800">{name}</div>
                                <div className="text-xs text-slate-400 text-right">{label}</div>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">5-yr rental cash flow</span>
                                <span className={cn('font-semibold tabular-nums', partnerCash >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                  {partnerCash >= 0 ? '+' : ''}{fmtCurrency(partnerCash)}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Share of property equity</span>
                                <span className="font-semibold tabular-nums text-slate-700">+{fmtCurrency(partnerEquity)}</span>
                              </div>
                              <div className="flex justify-between text-sm border-t border-slate-200 pt-1.5">
                                <span className="font-semibold text-slate-800">Total projected benefit</span>
                                <div className="text-right">
                                  <div className={cn('font-bold tabular-nums', partnerNet >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                    {partnerNet >= 0 ? '+' : ''}{fmtCurrency(partnerNet)}
                                  </div>
                                  <div className={cn('text-xs tabular-nums', partnerQuarterly >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                                    {fmtCurrency(partnerQuarterly)}/qtr est.
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </Section>
                </>
              )
            }

            // ── Cash mode ──────────────────────────────────────────
            const computeCagr = (gain: number) => {
              const total = totalCashRequired + gain
              if (total <= 0 || totalCashRequired <= 0) return null
              return Math.pow(total / totalCashRequired, 1 / 5) - 1
            }
            const cagrCon = computeCagr(tenYrRent + eq.conservative)
            const cagrExp = computeCagr(tenYrRent + eq.expected)
            const cagrStr = computeCagr(tenYrRent + eq.strong)

            const chartData = Array.from({ length: 21 }, (_, yr) => {
              const rent = Math.round(metrics.netAnnualIncome * yr)
              const gain = (rate: number) => yr === 0 ? 0 : Math.round(listing.price * (Math.pow(1 + rate, yr) - 1))
              return {
                yr,
                rent,
                con: rent + gain(0.01),
                exp: rent + gain(listing.appreciationRate),
                str: rent + gain(0.04),
              }
            })

            return (
              <>
                <Section title="20-Year Return Projection">
                  <div className="py-2 space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Cumulative gain over 20 years — net rental cash flow plus compounded appreciation under three scenarios. Dashed line marks total cash committed at acquisition (including $20k reserve).
                    </p>

                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="yr" tickFormatter={(v) => v === 0 ? 'Now' : `Yr ${v}`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={abbr} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
                        <Tooltip formatter={(v, name) => [fmtCurrency(v as number), name]} labelFormatter={(l) => l === 0 ? 'Today' : `Year ${l}`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        <ReferenceLine y={totalCashRequired} stroke="#cbd5e1" strokeDasharray="5 3" label={{ value: 'Invested', position: 'insideTopRight', fontSize: 9, fill: '#94a3b8', dy: -4 }} />
                        <ReferenceLine x={5} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" label={{ value: 'Yr 5', position: 'insideTopRight', fontSize: 9, fill: '#94a3b8', dx: 2, dy: 4 }} />
                        <Line dataKey="rent" name="Cash flow only" stroke="#cbd5e1" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                        <Line dataKey="con" name="+ 1%/yr appreciation" stroke="#93c5fd" strokeWidth={1.5} dot={false} />
                        <Line dataKey="exp" name={`+ ${(listing.appreciationRate * 100).toFixed(1)}%/yr appreciation`} stroke="#2563eb" strokeWidth={2.5} dot={false} />
                        <Line dataKey="str" name="+ 4%/yr appreciation" stroke="#10b981" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-slate-300" />Cash flow only</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-blue-300" />1%/yr</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-[3px] border-blue-600" />{(listing.appreciationRate * 100).toFixed(1)}%/yr expected</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-emerald-500" />4%/yr</span>
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      {[
                        { label: 'Conservative (1%/yr)', value: eq.conservative, projVal: Math.round(listing.price * Math.pow(1.01, 5)) },
                        { label: `Expected (${(listing.appreciationRate * 100).toFixed(1)}%/yr)`, value: eq.expected, projVal: eq.projectedValue, highlight: true },
                        { label: 'Strong (4%/yr)', value: eq.strong, projVal: Math.round(listing.price * Math.pow(1.04, 5)) },
                      ].map(({ label, value, projVal, highlight }) => (
                        <div key={label} className={cn('flex items-center justify-between rounded-lg px-3 py-2', highlight ? 'bg-slate-100' : '')}>
                          <div>
                            <div className={cn('text-sm', highlight ? 'font-semibold text-slate-800' : 'text-slate-600')}>{label}</div>
                            <div className="text-xs text-slate-400">{fmtCurrency(listing.price)} → {fmtCurrency(projVal)}</div>
                          </div>
                          <div className={cn('text-sm font-bold tabular-nums', highlight ? 'text-slate-900' : 'text-slate-600')}>
                            +{fmtCurrency(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-200 pt-3 space-y-1.5">
                      {/* Year 1 / Year 5 column headers */}
                      <div className="grid grid-cols-3 text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                        <span />
                        <span className="text-center">Year 1</span>
                        <span className="text-right">5-yr total</span>
                      </div>
                      <div className="grid grid-cols-3 items-center text-sm">
                        <span className="text-slate-600">Net rental income</span>
                        <span className="text-center font-semibold text-slate-800">+{fmtCurrency(rent1yr)}</span>
                        <span className="text-right font-semibold text-slate-800">+{fmtCurrency(tenYrRent)}</span>
                      </div>
                      <div className="grid grid-cols-3 items-center text-sm">
                        <span className="text-slate-600">Equity gain (expected)</span>
                        <span className="text-center font-semibold text-slate-800">+{fmtCurrency(eq1.expected)}</span>
                        <span className="text-right font-semibold text-slate-800">+{fmtCurrency(eq.expected)}</span>
                      </div>
                      <div className="grid grid-cols-3 items-center text-base font-bold border-t border-slate-200 pt-1.5 mt-1.5">
                        <span className="text-slate-900">Combined gain</span>
                        <span className="text-center text-slate-900">+{fmtCurrency(rent1yr + eq1.expected)}</span>
                        <span className="text-right text-slate-900">+{fmtCurrency(tenYrRent + eq.expected)}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3 space-y-3">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Effective Annual Return (CAGR)</div>
                      <p className="text-xs text-slate-500 -mt-1">
                        Annualized return on your total cash invested, combining rental income and property appreciation over 5 years.
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs text-center">
                        {([
                          { label: 'Conservative', cagr: cagrCon, highlight: false },
                          { label: 'Expected', cagr: cagrExp, highlight: true },
                          { label: 'Strong', cagr: cagrStr, highlight: false },
                        ] as const).map(({ label, cagr: c, highlight }) => (
                          <div key={label} className={cn('rounded-lg p-2', highlight ? 'bg-slate-100' : 'bg-slate-50')}>
                            <div className={cn('text-[10px] mb-0.5', highlight ? 'text-slate-500 font-medium' : 'text-slate-400')}>{label}</div>
                            <div className={cn('font-bold tabular-nums', highlight ? 'text-slate-900 text-base' : 'text-slate-600')}>
                              {c != null ? `${(c * 100).toFixed(1)}%` : 'N/A'}
                            </div>
                          </div>
                        ))}
                      </div>
                      {cagrExp != null && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">5-Year Return Comparison</p>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-600 font-medium">This Property</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-slate-500 tabular-nums">{(cagrExp * 100).toFixed(1)}%</span>
                              <span className="text-slate-400 w-14 text-right text-[10px]">projected</span>
                            </div>
                          </div>
                          {BENCHMARKS.map(({ label, rate }) => {
                            const above = cagrExp >= rate
                            const diff = Math.abs(cagrExp - rate)
                            return (
                              <div key={label} className="flex items-center justify-between text-xs">
                                <span className="text-slate-600">{label}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-slate-500 tabular-nums">{rate >= 0 ? '' : '−'}{(Math.abs(rate) * 100).toFixed(1)}%</span>
                                  <span className={cn('font-semibold tabular-nums w-14 text-right', above ? 'text-emerald-600' : 'text-red-500')}>
                                    {above ? '+' : '−'}{(diff * 100).toFixed(1)}pp {above ? '↑' : '↓'}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                          <p className="text-[10px] text-slate-400 leading-relaxed pt-0.5">
                            Property return is projected over the next 5 years. Market benchmarks show trailing 5-year annualized total returns (Aug 2021–Aug 2026) and are for context only. Excludes taxes, leverage differences, and liquidity.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Section>
                {(() => {
                  const propVal10Cash = Math.round(listing.price * Math.pow(1 + listing.appreciationRate, 5))
                  // Capital deployed = property acquisition cost + Day 1 operating reserve
                  const capitalDeployed = totalCashRequired

                  // Sale waterfall: return capital first, then split residual 51/49
                  const residualGain = propVal10Cash - capitalDeployed
                  const carrieResidualSale = Math.round(residualGain * CMA_I.carrieResidualPct)
                  const cameronResidualSale = Math.round(residualGain * CMA_I.cameronResidualPct)

                  // Rental distributions: 51% Carrie / 49% Cameron (always full %; reverse vesting is informational only)
                  const carrieRentalDist = Math.round(tenYrRent * CMA_I.carrieResidualPct)
                  const cameronRentalDist = Math.round(tenYrRent * CMA_I.cameronResidualPct)

                  // Member totals
                  const carrieTotalBenefit = capitalDeployed + carrieResidualSale + carrieRentalDist
                  const cameronBenefit = cameronResidualSale + cameronRentalDist

                  return (
                    <>
                      {/* ── CMA-I Structure ── */}
                      <Section title="CMA-I Capital & Ownership">
                        <div className="py-2 space-y-3">
                          {/* Carrie */}
                          <div className="rounded-lg bg-slate-50 px-3 py-2.5 space-y-1.5 text-xs">
                            <div className="font-semibold text-slate-700 text-sm">Carrie Reynolds-Flatt</div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Capital contribution</span>
                              <span className="font-semibold text-slate-800">{fmtCurrency(CMA_I.carrieContributedCapital)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Capital deployed (this property)</span>
                              <span className="font-semibold text-slate-800">−{fmtCurrency(capitalDeployed)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-1.5">
                              <span className="text-slate-600 font-medium">Uninvested CMA-I capital</span>
                              <span className={cn('font-bold tabular-nums', CMA_I.carrieContributedCapital - capitalDeployed >= 0 ? 'text-slate-800' : 'text-red-600')}>
                                {fmtCurrency(Math.max(0, CMA_I.carrieContributedCapital - capitalDeployed))}
                              </span>
                            </div>
                            <div className="flex justify-between pt-0.5">
                              <span className="text-slate-500">Governance &amp; residual interest</span>
                              <span className="font-semibold text-slate-700">51%</span>
                            </div>
                          </div>
                          {/* Cameron */}
                          <div className="rounded-lg bg-slate-50 px-3 py-2.5 space-y-1.5 text-xs">
                            <div className="font-semibold text-slate-700 text-sm">Cameron Reynolds-Flatt</div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Interest type</span>
                              <span className="font-semibold text-slate-700">Service-Based Profits Interest</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Economic interest</span>
                              <span className="font-semibold text-slate-700">49%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Structure</span>
                              <span className="font-semibold text-slate-700">5-year reverse vesting</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-1.5">
                              <span className="text-slate-500">Currently nonforfeitable</span>
                              <span className="font-semibold text-slate-700">{(vesting.nonforfeitablePct * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Still subject to forfeiture</span>
                              <span className="font-semibold text-amber-600">{(vesting.forfeitablePct * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Capital contributed</span>
                              <span className="text-slate-400">$0 — service interest only</span>
                            </div>
                          </div>
                        </div>
                      </Section>

                      {/* ── Capital Protection ── */}
                      <Section title="Capital Protection">
                        <div className="py-2 space-y-3">
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Carrie&apos;s contributed capital is returned before residual appreciation is divided.
                          </p>
                          <div className="space-y-2 text-xs text-slate-600">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                              <span>Pay debt, sale costs, and obligations</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-blue-300 shrink-0" />
                              <span>Return applicable unrecovered contributed capital</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                              <span>Split remaining residual value <span className="font-semibold">51% Carrie / 49% Cameron</span></span>
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2.5 space-y-1.5 text-xs">
                            <div className="text-slate-500 font-medium mb-1">At projected Year 5 sale:</div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Projected net sale proceeds</span>
                              <span className="font-semibold text-slate-800">{fmtCurrency(propVal10Cash)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Return CMA-I capital (Carrie-contributed)</span>
                              <span className="font-semibold text-blue-700">−{fmtCurrency(capitalDeployed)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-1.5">
                              <span className="text-slate-600">Residual gain — split 51/49</span>
                              <span className={cn('font-semibold', residualGain >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                {residualGain >= 0 ? '+' : ''}{fmtCurrency(residualGain)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Section>

                      {/* ── CMA-I Member Economics ── */}
                      <Section title="CMA-I Member Economics">
                        <div className="py-2 space-y-4">

                          {/* Card A: Property Operating Reserve */}
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Property Operating Reserve</div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2.5 space-y-1.5 text-xs mb-3">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Reserve target</span>
                                <span className="font-semibold text-slate-800 tabular-nums">{fmtCurrency(reserveTarget)}</span>
                              </div>
                              {/* Current reserve input */}
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Current reserve</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400 text-[10px]">$</span>
                                  <input
                                    type="number"
                                    value={currentReserveInput}
                                    onChange={(e) => setCurrentReserveInput(Math.max(0, Number(e.target.value) || 0))}
                                    className="w-24 text-right text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:border-slate-400 tabular-nums"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Reserve shortfall</span>
                                <span className={cn('font-semibold tabular-nums', reserveShortfall > 0 ? 'text-amber-600' : 'text-emerald-700')}>
                                  {reserveFullyFunded ? '$0' : `−${fmtCurrency(reserveShortfall)}`}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Replenishment this quarter</span>
                                <span className="font-semibold tabular-nums text-slate-700">
                                  {quarterlyReserveContribution > 0 ? fmtCurrency(quarterlyReserveContribution) : '$0'}
                                </span>
                              </div>
                              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                                <span className="text-slate-600 font-medium">Status</span>
                                <span className={cn('font-semibold', reserveFullyFunded ? 'text-emerald-700' : 'text-amber-600')}>
                                  {reserveFullyFunded ? 'Fully Funded' : `${fmtCurrency(currentReserveInput)} / ${fmtCurrency(reserveTarget)}`}
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">Reserve is funded at acquisition ($20k Day 1). Future cash flow replenishes it only if the balance drops below target.</p>
                          </div>

                          {/* Card B: Quarterly Distribution Estimate */}
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estimated Quarterly Distribution</div>
                            {/* Cash flow waterfall */}
                            <div className="rounded-lg bg-slate-50 px-3 py-2.5 space-y-1.5 text-xs mb-3">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Quarterly net cash flow</span>
                                <span className={cn('font-semibold tabular-nums', quarterlyNetCashFlow >= 0 ? 'text-slate-800' : 'text-red-600')}>{fmtCurrency(quarterlyNetCashFlow)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Reserve contribution this quarter</span>
                                <span className="font-semibold tabular-nums text-slate-500">
                                  {quarterlyReserveContribution > 0 ? `−${fmtCurrency(quarterlyReserveContribution)}` : 'None (fully funded)'}
                                </span>
                              </div>
                              <div className="flex justify-between font-semibold border-t border-slate-200 pt-1.5">
                                <span className="text-slate-700">Quarterly distributable cash</span>
                                <span className={cn('tabular-nums', quarterlyDistributable >= 0 ? 'text-emerald-700' : 'text-red-600')}>{fmtCurrency(quarterlyDistributable)}</span>
                              </div>
                            </div>
                            {/* Member payouts */}
                            <div className="space-y-2">
                              {/* Carrie */}
                              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                                <div>
                                  <div className="text-sm font-semibold text-slate-800">Carrie Reynolds-Flatt</div>
                                  <div className="text-xs text-slate-400">51% of distributable cash</div>
                                </div>
                                <div className="text-right">
                                  <div className={cn('text-base font-bold tabular-nums', carrieQuarterly >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                    {fmtCurrency(carrieQuarterly)}/qtr
                                  </div>
                                  <div className="text-xs text-slate-400 tabular-nums">{fmtCurrency(Math.round(carrieQuarterly / 3))}/mo · {fmtCurrency(carrieQuarterly * 4)}/yr</div>
                                </div>
                              </div>
                              {/* Cameron */}
                              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                                <div>
                                  <div className="text-sm font-semibold text-slate-800">Cameron Reynolds-Flatt</div>
                                  <div className="text-xs text-slate-400">49% of distributable cash</div>
                                </div>
                                <div className="text-right">
                                  <div className={cn('text-base font-bold tabular-nums', cameronQuarterly >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                    {fmtCurrency(cameronQuarterly)}/qtr
                                  </div>
                                  <div className="text-xs text-slate-400 tabular-nums">{fmtCurrency(Math.round(cameronQuarterly / 3))}/mo · {fmtCurrency(cameronQuarterly * 4)}/yr</div>
                                </div>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">Distributions are quarterly estimates based on projected net cash flow. Tenant security deposits are held separately and excluded from investment cash flow and operating reserves.</p>
                          </div>

                          {/* Card B: Sale waterfall */}
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">5-Year Projected Sale Waterfall</div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2.5 space-y-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Projected property value (Year 5)</span>
                                <span className="font-semibold text-slate-800">{fmtCurrency(propVal10Cash)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Return CMA-I capital</span>
                                <span className="font-semibold text-slate-800">−{fmtCurrency(capitalDeployed)}</span>
                              </div>
                              <div className="flex justify-between text-sm font-medium border-t border-slate-200 pt-1.5">
                                <span className="text-slate-700">Residual gain (split 51/49)</span>
                                <span className={cn(residualGain >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                  {residualGain >= 0 ? '+' : ''}{fmtCurrency(residualGain)}
                                </span>
                              </div>
                              <div className="border-t border-slate-200 pt-1.5 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">→ Carrie 51% of residual gain</span>
                                  <span className={cn('font-semibold tabular-nums', carrieResidualSale >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                    {carrieResidualSale >= 0 ? '+' : ''}{fmtCurrency(carrieResidualSale)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">→ Cameron 49% of residual gain</span>
                                  <span className={cn('font-semibold tabular-nums', cameronResidualSale >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                    {cameronResidualSale >= 0 ? '+' : ''}{fmtCurrency(cameronResidualSale)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Member outcome summary */}
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Projected Member Outcome</div>
                            <div className="space-y-2">
                              {/* Carrie */}
                              <div className="rounded-lg border border-slate-200 px-3 py-2.5 space-y-1.5">
                                <div className="text-sm font-bold text-slate-800">Carrie Reynolds-Flatt</div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">CMA-I capital returned at sale</span>
                                  <span className="font-semibold tabular-nums text-slate-700">{fmtCurrency(capitalDeployed)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">51% of residual sale gain</span>
                                  <span className={cn('font-semibold tabular-nums', carrieResidualSale >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                    {carrieResidualSale >= 0 ? '+' : ''}{fmtCurrency(carrieResidualSale)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">51% of rental distributions (5 yr)</span>
                                  <span className="font-semibold tabular-nums text-emerald-700">+{fmtCurrency(carrieRentalDist)}</span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-slate-100 pt-1.5">
                                  <span className="font-semibold text-slate-700">Total projected cash benefit</span>
                                  <div className="text-right">
                                    <div className="font-bold tabular-nums text-emerald-700">+{fmtCurrency(carrieTotalBenefit)}</div>
                                    <div className="text-xs text-slate-400">incl. {fmtCurrency(capitalDeployed)} capital return</div>
                                  </div>
                                </div>
                              </div>

                              {/* Cameron */}
                              <div className="rounded-lg border border-slate-200 px-3 py-2.5 space-y-1.5">
                                <div className="flex items-start justify-between">
                                  <div className="text-sm font-bold text-slate-800">Cameron Reynolds-Flatt</div>
                                  <div className="text-[10px] text-slate-400 text-right">Service-Based Profits Interest<br />49% economic interest</div>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">49% of residual sale gain</span>
                                  <span className={cn('font-semibold tabular-nums', cameronResidualSale >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                    {cameronResidualSale >= 0 ? '+' : ''}{fmtCurrency(cameronResidualSale)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">49% of rental distributions (5 yr)</span>
                                  <span className={cn('font-semibold tabular-nums', cameronRentalDist >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                    +{fmtCurrency(cameronRentalDist)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-slate-100 pt-1.5">
                                  <span className="font-semibold text-slate-700">Total projected benefit</span>
                                  <div className={cn('font-bold tabular-nums', cameronBenefit >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                    {cameronBenefit >= 0 ? '+' : ''}{fmtCurrency(cameronBenefit)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card C: Cameron Service Interest vesting */}
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cameron Service-Based Profits Interest</div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2.5 space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600">Granted interest</span>
                                <span className="font-semibold text-slate-800">{(CMA_I.serviceProfitsInterestPct * 100).toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600">Current distribution share</span>
                                <span className="font-semibold text-emerald-700">{(vesting.currentDistributionPct * 100).toFixed(1)}%</span>
                              </div>
                              <div className="border-t border-slate-200 pt-1.5 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">Nonforfeitable ({vesting.completedYears} yr{vesting.completedYears !== 1 ? 's' : ''} elapsed)</span>
                                  <span className="font-semibold tabular-nums text-slate-700">{(vesting.nonforfeitablePct * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">Still forfeitable</span>
                                  <span className="font-semibold tabular-nums text-amber-600">{(vesting.forfeitablePct * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">Vesting period</span>
                                  <span className="font-semibold tabular-nums text-slate-700">{CMA_I.vestingYears} years · {(CMA_I.annualNonforfeitablePct * 100).toFixed(1)}%/yr</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-400 leading-relaxed pt-0.5">
                                Distribution share remains {(CMA_I.serviceProfitsInterestPct * 100).toFixed(0)}% while Cameron continues providing required services. Reverse vesting affects only what he permanently keeps if services cease.
                              </p>
                            </div>
                          </div>

                          <p className="text-xs text-slate-400 leading-relaxed">
                            Rental distributions are paid {(CMA_I.carrieResidualPct * 100).toFixed(0)}%/{(CMA_I.cameronResidualPct * 100).toFixed(0)}% and do not reduce Carrie&apos;s capital preference. At sale, applicable contributed capital is returned first; residual appreciation above that is split {(CMA_I.carrieResidualPct * 100).toFixed(0)}%/{(CMA_I.cameronResidualPct * 100).toFixed(0)}%.
                          </p>
                        </div>
                      </Section>
                    </>
                  )
                })()}
              </>
            )
          })()}

          {/* Bottom padding */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}

// ── Rent comparables ─────────────────────────────────────────────────────────
function RentCompsSection({ listing }: { listing: SaleListing }) {
  const rentalListings = useAppStore((s) => s.rentalListings)

  const comps = rentalListings
    .map((r) => ({ ...r, dist: distanceMiles(listing.lat, listing.lng, r.lat, r.lng) }))
    .filter((r) => r.dist <= 2.0 && Math.abs(r.beds - listing.beds) <= 1)
    .sort((a, b) => a.dist - b.dist)

  if (comps.length === 0) return null

  const avgRent = Math.round(comps.reduce((sum, r) => sum + r.monthlyRent, 0) / comps.length)
  const diff = listing.estimatedRent - avgRent
  const diffPct = avgRent > 0 ? diff / avgRent : 0

  return (
    <Section title={`Rent Comps · ${comps.length} nearby`}>
      <div className="py-1">
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          Active rentals within 2 mi with ±1 bed. With a live API these would be the exact comps used to derive the estimate.
        </p>

        <div className="divide-y divide-slate-100">
          {comps.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="text-sm text-slate-700 truncate">{r.address}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {r.beds}bd · {r.baths}ba · {r.sqft.toLocaleString()} sqft
                  <span className="mx-1">·</span>{r.dist.toFixed(1)} mi
                  <span className="mx-1">·</span>{fmtDom(r.daysOnMarket)}
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-800 tabular-nums shrink-0">
                {fmtRent(r.monthlyRent)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Comp average</span>
            <span className="text-sm font-semibold text-slate-700 tabular-nums">{fmtRent(avgRent)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">This estimate</span>
            <div className="flex items-center gap-2">
              {Math.abs(diffPct) >= 0.03 && (
                <span className={cn(
                  'text-xs font-medium',
                  diff > 0 ? 'text-amber-600' : 'text-emerald-600',
                )}>
                  {diff > 0 ? '+' : ''}{(diffPct * 100).toFixed(0)}% vs comps
                </span>
              )}
              <span className="text-sm font-bold text-slate-800 tabular-nums">{fmtRent(listing.estimatedRent)}</span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
