'use client'

import Image from 'next/image'
import { ArrowLeft, Building2, Home, Clock, ExternalLink, Trash2, MapPin, RotateCcw, Navigation, ShieldAlert } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { computeMetrics, equityScenarios, tenYearRentalIncome, distanceMiles, LLC_ANNUAL_COST, computeMonthlyPayment, computeRemainingBalance } from '@/lib/investment'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { fmtCurrency, fmtDom, fmtPayback, fmtPrice, fmtRent, fmtYield } from '@/lib/format'
import { cn } from '@/lib/utils'
import { HOME } from '@/lib/config'
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
  { label: 'S&P 500 (50-yr nominal avg)', rate: 0.10 },
  { label: 'REITs (hist. total return)', rate: 0.09 },
  { label: 'US Bond Index (hist. avg)', rate: 0.042 },
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
  const savePropertyTypeToDb = useAppStore((s) => s.savePropertyTypeToDb)
  const saveUnitsToDb = useAppStore((s) => s.saveUnitsToDb)
  const listing = saleListings.find((l) => l.id === selectedId)

  const isMultiFamily = listing?.propertyType === 'Multi Family'

  // Local editable values — reset when selected property changes
  const [repairsInput, setRepairsInput] = useState(listing?.repairs ?? 10000)
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
  const [carrieCapital, setCarrieCapital] = useState(1_000_000)

  useEffect(() => {
    const dbRepairs = listing?.repairs ?? 10000
    const dbRent = listing?.estimatedRent ?? 0
    const dbUnits = listing?.units ?? 2
    setRepairsInput(dbRepairs)
    setRentInput(dbRent)
    setUnitsInput(dbUnits)
    setPropertyTaxInput(listing?.propertyTaxAnnual ?? 0)
    setOpenGear(null)
    setPurchaseMethod('cash')
    setCcapRate(0.06)
    setCarrieCapital(1_000_000)
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
    metrics.pestControlAnnual + metrics.lawnCareAnnual + managementCost + LLC_ANNUAL_COST
  const ccapMonthlyPayment = purchaseMethod === 'ccap'
    ? computeMonthlyPayment(metrics.totalCashInvested, ccapRate, 360)
    : 0
  const annualDebtService = ccapMonthlyPayment * 12
  const cmaCashFlowAnnual = metrics.netAnnualIncome - annualDebtService
  const rentIsEdited = originalRent != null && originalRent > 0 && effectiveRentInput !== originalRent
  const repairsIsEdited = repairsInput !== (listing.repairs ?? 10000)

  return (
    <div className="flex flex-col h-full">
      {/* Back header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
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
                  CCAP Loan
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
                      <span className="text-slate-600">CCAP loan</span>
                      <span className="font-semibold text-slate-800">{fmtCurrency(metrics.totalCashInvested)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t border-slate-200 pt-1.5">
                      <span className="text-slate-800">CMA initial cash invested</span>
                      <span className="text-emerald-600">$0</span>
                    </div>
                  </div>
                  {/* Rate + debt service */}
                  <InlineSlider
                    label="CCAP loan rate"
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
                    CCAP finances 100% of the acquisition (price + closing costs + repairs) via a 30-year P+I loan. CMA's equity grows through appreciation and principal paydown.
                  </p>
                </div>
              )}
              {purchaseMethod === 'cash' && (
                <div className="rounded-lg bg-slate-50 px-3 py-2.5 space-y-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CMA Funding</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Capital source</span>
                    <span className="font-semibold text-slate-800">Carrie Reynolds-Flatt</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Carrie initial capital</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        min={0}
                        step={50000}
                        value={carrieCapital}
                        onChange={(e) => setCarrieCapital(Math.max(0, Number(e.target.value)))}
                        className="w-28 text-sm text-right tabular-nums border border-slate-200 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Cameron initial capital</span>
                    <span className="font-semibold text-slate-500">$0</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Capital deployed to this property</span>
                      <span className="font-semibold text-slate-800">{fmtCurrency(metrics.totalCashInvested)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Remaining undeployed CMA capital</span>
                      <span className={cn('font-semibold', carrieCapital - metrics.totalCashInvested >= 0 ? 'text-slate-800' : 'text-amber-600')}>
                        {fmtCurrency(Math.max(0, carrieCapital - metrics.totalCashInvested))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ── Step 1: Total cash invested ──────────────────── */}
          <Section title="Step 1 — Total Cash Invested">
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
                    onClick={() => setRepairsInput(listing.repairs ?? 10000)}
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
                    if (val !== (listing.repairs ?? 10000)) saveRepairsToDb(listing.id, val)
                  }}
                  className="w-24 text-sm text-right tabular-nums border border-slate-200 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>
            </div>
            <Divider />
            <TotalRow label="Total cash invested" value={fmtCurrency(metrics.totalCashInvested)} />
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
            <Row
              label="LLC annual fee"
              value={fmtCurrency(LLC_ANNUAL_COST)}
              monthly={mo(LLC_ANNUAL_COST)}
              prefix="−"
              sub="CMA Investments LLC fixed cost"
            />
            <GearRow
              id="management"
              label={assumptions.propertyManagementRate > 0 ? `Property management (${(assumptions.propertyManagementRate * 100).toFixed(0)}% of rent)` : 'Property management'}
              value={managementCost > 0 ? fmtCurrency(managementCost) : 'Self-managed'}
              monthly={managementCost > 0 ? mo(managementCost) : undefined}
              prefix="−"
              openGear={openGear} setOpenGear={setOpenGear}
            >
              <InlineSlider value={assumptions.propertyManagementRate} onChange={(v) => setAssumptions({ propertyManagementRate: v })} min={0} max={0.2} step={0.005} format={(v) => v === 0 ? 'Self-manage' : `${(v * 100).toFixed(1)}% of rent`} />
              <p className="text-xs text-slate-400">Global · applies to all properties</p>
            </GearRow>
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
                  label={`CCAP debt service (${(ccapRate * 100).toFixed(1)}%)`}
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
              {fmtCurrency(metrics.netAnnualIncome)}/yr ÷ {fmtCurrency(metrics.totalCashInvested)} invested
            </div>
            <div className={cn('text-3xl font-bold', yieldColor(metrics.investmentScore))}>
              {fmtYield(metrics.netCashYield)}
            </div>
            <div className={cn('text-sm font-semibold', yieldColor(metrics.investmentScore))}>
              {yieldLabel(metrics.netCashYield)}
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Target: 6%+ for a strong cash-flow investment. At 7%+ the deal earns meaningfully more than most liquid alternatives without the same concentration risk.
            </p>
          </div>

          {/* ── Stress test ──────────────────────────────────── */}
          {effectiveRentInput > 0 && (() => {
            const stressBase = {
              price: listing.price,
              hoaMonthly: listing.hoaMonthly,
              propertyTaxAnnual: listing.propertyTaxAnnual,
              insuranceRate: assumptions.insuranceRate,
              closingCostRate: assumptions.closingCostRate,
              repairs: repairsInput,
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
                {fmtCurrency(metrics.totalCashInvested)} invested ÷ {fmtCurrency(metrics.netAnnualIncome)}/yr income
              </div>
              <div className="text-3xl font-bold text-slate-900">{fmtPayback(metrics.paybackYears)}</div>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                Years of projected net rental income to equal the original cash invested. You still own the property throughout — this is not economic break-even or total return.
              </p>
            </div>
          </Section>


          {/* ── 10-year equity outlook ────────────────────────── */}
          {(() => {
            const eq = equityScenarios(listing.price, listing.appreciationRate)
            const tenYrRent = tenYearRentalIncome(metrics.netAnnualIncome)

            // CCAP-specific 10-yr calculations (computed always, used only in CCAP branch)
            const remBal10 = computeRemainingBalance(metrics.totalCashInvested, ccapRate, 360, 120)
            const propVal10 = Math.round(listing.price * Math.pow(1 + listing.appreciationRate, 10))
            const cmaEquity10 = propVal10 - remBal10
            const cumCashFlow10CCAP = Math.round(cmaCashFlowAnnual * 10)
            const cmaTotalGain10 = cumCashFlow10CCAP + cmaEquity10

            // Ownership gain: CCAP total or cash expected scenario
            const ownershipGain = purchaseMethod === 'ccap' ? cmaTotalGain10 : tenYrRent + eq.expected

            // ── CCAP mode ──────────────────────────────────────────
            if (purchaseMethod === 'ccap') {
              const ccapChartData = Array.from({ length: 11 }, (_, yr) => {
                const cashFlow = Math.round(cmaCashFlowAnnual * yr)
                const propVal = Math.round(listing.price * Math.pow(1 + listing.appreciationRate, yr))
                const remBal = yr === 0 ? metrics.totalCashInvested : computeRemainingBalance(metrics.totalCashInvested, ccapRate, 360, yr * 12)
                const equity = propVal - remBal
                return { yr, cashFlow, equity, total: cashFlow + equity }
              })
              return (
                <>
                  <Section title="10-Year CCAP Projection">
                    <div className="py-2 space-y-4">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        CMA economic position over 10 years — cumulative cash flow after CCAP debt service, plus equity built through appreciation and principal paydown.
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
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-slate-700">10-year cash profit/loss</span>
                          <span className={cn('tabular-nums', cumCashFlow10CCAP >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                            {cumCashFlow10CCAP >= 0 ? '+' : ''}{fmtCurrency(cumCashFlow10CCAP)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Property equity at Year 10</span>
                          <span className="font-semibold tabular-nums text-slate-700">+{fmtCurrency(cmaEquity10)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-1.5 mt-1.5">
                          <span className="text-slate-900">CMA net wealth created after 10 years</span>
                          <span className={cn(cmaTotalGain10 >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                            {cmaTotalGain10 >= 0 ? '+' : ''}{fmtCurrency(cmaTotalGain10)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Equity is wealth locked in the property — real but not spendable unless you sell or refinance. Cash flow is actual money in or out each month.
                      </p>
                    </div>
                  </Section>
                  <Section title="CMA Investments Ownership">
                    <div className="py-2 space-y-3">
                      <p className="text-xs text-slate-500">CMA Investments LLC — 50% Carrie Reynolds-Flatt / 50% Cameron Reynolds-Flatt</p>
                      <div className="space-y-2">
                        {[{ name: 'Carrie Reynolds-Flatt', pct: 0.5 }, { name: 'Cameron Reynolds-Flatt', pct: 0.5 }].map(({ name, pct }) => {
                          const partnerCash = Math.round(cumCashFlow10CCAP * pct)
                          const partnerEquity = Math.round(cmaEquity10 * pct)
                          const partnerNet = Math.round(cmaTotalGain10 * pct)
                          const partnerMonthly = Math.round(cmaCashFlowAnnual * pct / 12)
                          return (
                            <div key={name} className="rounded-lg bg-slate-50 px-3 py-2.5 space-y-1.5">
                              <div className="text-sm font-semibold text-slate-800">{name}</div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Cash contributed over 10 years</span>
                                <span className={cn('font-semibold tabular-nums', partnerCash >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                  {partnerCash >= 0 ? '+' : ''}{fmtCurrency(partnerCash)}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Share of property equity</span>
                                <span className="font-semibold tabular-nums text-slate-700">+{fmtCurrency(partnerEquity)}</span>
                              </div>
                              <div className="flex justify-between text-sm border-t border-slate-200 pt-1.5">
                                <span className="font-semibold text-slate-800">Net wealth position</span>
                                <div className="text-right">
                                  <div className={cn('font-bold tabular-nums', partnerNet >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                    {partnerNet >= 0 ? '+' : ''}{fmtCurrency(partnerNet)}
                                  </div>
                                  <div className={cn('text-xs tabular-nums', partnerMonthly >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                                    {partnerMonthly >= 0 ? '+' : ''}{fmtCurrency(partnerMonthly)}/mo {partnerMonthly < 0 ? 'cash needed' : 'cash income'}
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
              const total = metrics.totalCashInvested + gain
              if (total <= 0 || metrics.totalCashInvested <= 0) return null
              return Math.pow(total / metrics.totalCashInvested, 0.1) - 1
            }
            const cagrCon = computeCagr(tenYrRent + eq.conservative)
            const cagrExp = computeCagr(tenYrRent + eq.expected)
            const cagrStr = computeCagr(tenYrRent + eq.strong)

            const chartData = Array.from({ length: 11 }, (_, yr) => {
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
                <Section title="10-Year Return Projection">
                  <div className="py-2 space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Cumulative gain over time — rental income plus appreciation under three growth scenarios. Dashed line marks your total cash invested.
                    </p>

                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="yr" tickFormatter={(v) => v === 0 ? 'Now' : `Yr ${v}`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={abbr} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
                        <Tooltip formatter={(v, name) => [fmtCurrency(v as number), name]} labelFormatter={(l) => l === 0 ? 'Today' : `Year ${l}`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        <ReferenceLine y={metrics.totalCashInvested} stroke="#cbd5e1" strokeDasharray="5 3" label={{ value: 'Invested', position: 'insideTopRight', fontSize: 9, fill: '#94a3b8', dy: -4 }} />
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
                        { label: 'Conservative (1%/yr)', value: eq.conservative, projVal: Math.round(listing.price * Math.pow(1.01, 10)) },
                        { label: `Expected (${(listing.appreciationRate * 100).toFixed(1)}%/yr)`, value: eq.expected, projVal: eq.projectedValue, highlight: true },
                        { label: 'Strong (4%/yr)', value: eq.strong, projVal: Math.round(listing.price * Math.pow(1.04, 10)) },
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
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">10-yr net rental income</span>
                        <span className="font-semibold text-slate-800">+{fmtCurrency(tenYrRent)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">10-yr equity gain (expected)</span>
                        <span className="font-semibold text-slate-800">+{fmtCurrency(eq.expected)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-1.5 mt-1.5">
                        <span className="text-slate-900">10-yr combined gain</span>
                        <span className="text-slate-900">+{fmtCurrency(tenYrRent + eq.expected)}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3 space-y-3">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Effective Annual Return (CAGR)</div>
                      <p className="text-xs text-slate-500 -mt-1">
                        Annualized return on your total cash invested, combining rental income and property appreciation over 10 years.
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
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">vs. other investments (expected scenario)</p>
                          {BENCHMARKS.map(({ label, rate }) => {
                            const above = cagrExp >= rate
                            const diff = Math.abs(cagrExp - rate)
                            return (
                              <div key={label} className="flex items-center justify-between text-xs">
                                <span className="text-slate-600">{label}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-slate-500 tabular-nums">{(rate * 100).toFixed(1)}%</span>
                                  <span className={cn('font-semibold tabular-nums w-14 text-right', above ? 'text-emerald-600' : 'text-red-500')}>
                                    {above ? '+' : '−'}{(diff * 100).toFixed(1)}% {above ? '↑' : '↓'}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                          <p className="text-[10px] text-slate-400 leading-relaxed pt-0.5">
                            Historical nominal averages. Excludes taxes, leverage differences, and liquidity. Real estate CAGR excludes selling costs.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Section>
                {(() => {
                  const propVal10Cash = Math.round(listing.price * Math.pow(1 + listing.appreciationRate, 10))
                  const carrieCapitalBasis = metrics.totalCashInvested
                  const excessGain = propVal10Cash - carrieCapitalBasis
                  const excessEach = Math.round(excessGain / 2)
                  const tenYrRentEach = Math.round(tenYrRent / 2)
                  const monthlyEach = Math.round(metrics.netAnnualIncome * 0.5 / 12)
                  const carrieProfit = tenYrRentEach + excessEach
                  const cameronBenefit = tenYrRentEach + excessEach
                  return (
                    <Section title="CMA Investments Economics">
                      <div className="py-2 space-y-4">
                        <p className="text-xs text-slate-500">CMA Investments LLC — 50% Carrie Reynolds-Flatt / 50% Cameron Reynolds-Flatt</p>

                        {/* Ongoing rental distributions */}
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ongoing Rental Distributions</div>
                          <div className="space-y-2">
                            {(['Carrie Reynolds-Flatt', 'Cameron Reynolds-Flatt'] as const).map((name) => (
                              <div key={name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                                <div>
                                  <div className="text-sm font-semibold text-slate-800">{name}</div>
                                  <div className="text-xs text-slate-400">50% of distributable rental income</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-base font-bold tabular-nums text-emerald-700">+{fmtCurrency(monthlyEach)}/mo</div>
                                  <div className="text-xs text-slate-400 tabular-nums">+{fmtCurrency(tenYrRentEach)} over 10 yrs</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 10-year capital waterfall */}
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">10-Year Capital Position</div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2.5 space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Carrie's capital invested in this property</span>
                              <span className="font-semibold text-slate-800">{fmtCurrency(carrieCapitalBasis)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Estimated property value at Year 10</span>
                              <span className="font-semibold text-slate-800">{fmtCurrency(propVal10Cash)}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-1.5 space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Capital returned to Carrie</span>
                                <span className="font-semibold text-slate-800">{fmtCurrency(carrieCapitalBasis)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Profit / appreciation above capital</span>
                                <span className={cn('font-semibold', excessGain >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                  {excessGain >= 0 ? '+' : ''}{fmtCurrency(excessGain)}
                                </span>
                              </div>
                            </div>
                            <div className="border-t border-slate-200 pt-1.5 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Carrie's share of excess profit (50%)</span>
                                <span className={cn('font-semibold tabular-nums', excessEach >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                  {excessEach >= 0 ? '+' : ''}{fmtCurrency(excessEach)}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Cameron's share of excess profit (50%)</span>
                                <span className={cn('font-semibold tabular-nums', excessEach >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                  {excessEach >= 0 ? '+' : ''}{fmtCurrency(excessEach)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Partner summary cards */}
                        <div className="space-y-2">
                          {/* Carrie */}
                          <div className="rounded-lg border border-slate-200 px-3 py-2.5 space-y-1.5">
                            <div className="text-sm font-bold text-slate-800">Carrie Reynolds-Flatt</div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Capital returned (from sale)</span>
                              <span className="font-semibold tabular-nums text-slate-700">{fmtCurrency(carrieCapitalBasis)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Rental distributions over 10 yrs</span>
                              <span className="font-semibold tabular-nums text-emerald-700">+{fmtCurrency(tenYrRentEach)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Share of appreciation / profit</span>
                              <span className={cn('font-semibold tabular-nums', excessEach >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                {excessEach >= 0 ? '+' : ''}{fmtCurrency(excessEach)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-slate-100 pt-1.5">
                              <span className="font-semibold text-slate-700">Total profit (excl. capital return)</span>
                              <span className={cn('font-bold tabular-nums', carrieProfit >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                {carrieProfit >= 0 ? '+' : ''}{fmtCurrency(carrieProfit)}
                              </span>
                            </div>
                          </div>

                          {/* Cameron */}
                          <div className="rounded-lg border border-slate-200 px-3 py-2.5 space-y-1.5">
                            <div className="text-sm font-bold text-slate-800">Cameron Reynolds-Flatt</div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Initial capital contributed</span>
                              <span className="font-semibold tabular-nums text-slate-500">$0</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Rental distributions over 10 yrs</span>
                              <span className="font-semibold tabular-nums text-emerald-700">+{fmtCurrency(tenYrRentEach)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Share of appreciation / profit</span>
                              <span className={cn('font-semibold tabular-nums', excessEach >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                {excessEach >= 0 ? '+' : ''}{fmtCurrency(excessEach)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-slate-100 pt-1.5">
                              <span className="font-semibold text-slate-700">Total economic benefit</span>
                              <span className={cn('font-bold tabular-nums', cameronBenefit >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                {cameronBenefit >= 0 ? '+' : ''}{fmtCurrency(cameronBenefit)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                          Carrie's contributed capital is returned first at sale. Profit and appreciation above that capital is split 50/50. Rental distributions are paid 50/50 throughout and do not reduce Carrie's capital preference.
                        </p>
                      </div>
                    </Section>
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
