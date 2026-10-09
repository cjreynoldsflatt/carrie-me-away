'use client'

import Image from 'next/image'
import { ArrowLeft, Building2, Home, Clock, ExternalLink, Trash2, MapPin, RotateCcw, Navigation, ShieldAlert, Link2, Share2, Check, ScrollText, Printer, MoreHorizontal, AlertTriangle } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { isFreshComp, MAX_COMP_AGE_DAYS, MIN_COMPS, SIZE_ADJ_PER_SQFT, BED_ADJ, MAX_BED_DIFF, rentalRedfinUrl, compAdjustedRent } from '@/lib/rent-comps'
import { regulatedAreasAt } from '@/lib/regulated-areas'
import { GRADE_HEX, scoreToGrade } from '@/lib/grades'
import FavoriteButton from './FavoriteButton'
import { dataGaps } from '@/lib/data-gaps'
import { crimeMapUrl, crimeGradeUrl, hoaSearchUrl } from '@/lib/links'
import { computeMetrics, computeConservativeRent, realisticRent, realisticAssumptions, REALISTIC, equityScenarios, tenYearRentalIncome, distanceMiles, LLC_ANNUAL_COST, OPERATING_RESERVE } from '@/lib/investment'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { fmtCurrency, fmtDom, fmtPayback, fmtPrice, fmtRent, fmtYield } from '@/lib/format'
import { cn } from '@/lib/utils'
import { HOME } from '@/lib/config'
import { CMA_I, getVestingStatus } from '@/lib/cmai'
import type { SaleListing } from '@/lib/types'

// ── Grade scale (matches PropertyCard) ───────────────────────────────────────
function scoreGrade(score: number): string {
  if (score >= 97) return 'A+'
  if (score >= 88) return 'A'
  if (score >= 76) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}
function gradeColor(score: number): string {
  if (score >= 97) return 'bg-emerald-600'
  if (score >= 88) return 'bg-cyan-600'
  if (score >= 76) return 'bg-blue-600'
  if (score >= 60) return 'bg-orange-400'
  if (score >= 40) return 'bg-orange-600'
  return 'bg-red-600'
}

// ── Yield label — relative to user's configured target yield ─────────────────
function yieldLabel(y: number, target: number) {
  const r = target > 0 ? y / target : 0
  if (r >= 1.25) return 'Exceptional'
  if (r >= 1.10) return 'Very Good'
  if (r >= 1.00) return 'Good'
  if (r >= 0.85) return 'Fair'
  if (r >= 0.70) return 'Below Average'
  return 'Poor'
}
// Score-based colors (match grade circle & map marker)
function yieldColor(score: number) {
  if (score >= 97) return 'text-emerald-700'
  if (score >= 88) return 'text-cyan-700'
  if (score >= 76) return 'text-blue-700'
  if (score >= 60) return 'text-orange-500'
  if (score >= 40) return 'text-orange-700'
  return 'text-red-600'
}
function yieldBg(score: number) {
  if (score >= 97) return 'bg-emerald-50 border-emerald-200'
  if (score >= 88) return 'bg-cyan-50 border-cyan-200'
  if (score >= 76) return 'bg-blue-50 border-blue-200'
  if (score >= 60) return 'bg-orange-50 border-orange-200'
  if (score >= 40) return 'bg-orange-100 border-orange-300'
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

// ⋯ menu in the detail header: print worksheet, copy in-app link, copy public share link, delete
function DetailActionsMenu({ listingId, onDelete }: { listingId: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<'link' | 'share' | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  async function copy(kind: 'link' | 'share') {
    const { appPath, realtorPath } = await fetch(`/api/share-link?id=${encodeURIComponent(listingId)}`).then((r) => r.json())
    await navigator.clipboard.writeText(`${window.location.origin}${kind === 'link' ? appPath : realtorPath}`)
    setCopied(kind)
    setTimeout(() => { setCopied(null); setOpen(false) }, 1200)
  }

  const item = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-md hover:bg-slate-50'
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 -mr-1.5 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-slate-200 shadow-lg p-1 z-50">
          <a href={`/print/${encodeURIComponent(listingId)}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={cn(item, 'text-slate-700')}>
            <Printer size={15} className="text-slate-400" /> Print worksheet
          </a>
          <button onClick={() => copy('link')} className={cn(item, 'text-slate-700')} title="Link to this property in the app (requires login)">
            {copied === 'link' ? <Check size={15} className="text-emerald-600" /> : <Link2 size={15} className="text-slate-400" />}
            {copied === 'link' ? 'Copied' : 'Copy link'}
          </button>
          <button onClick={() => copy('share')} className={cn(item, 'text-slate-700')} title="Realtor Version opened on this property — no CMA-I details, no login needed">
            {copied === 'share' ? <Check size={15} className="text-emerald-600" /> : <Share2 size={15} className="text-slate-400" />}
            {copied === 'share' ? 'Copied' : 'Share externally'}
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button onClick={() => { setOpen(false); if (confirm('Delete this listing?')) onDelete() }} className={cn(item, 'text-red-600 hover:bg-red-50')}>
            <Trash2 size={15} /> Delete listing
          </button>
        </div>
      )}
    </div>
  )
}

// Stable anchor for a card title: "Step 1 — Total Cash Required" → "total-cash-required",
// "Rent Comps · 36 nearby" → "rent-comps"
function sectionSlug(title: string) {
  return title.replace(/^Step \d+\s*—\s*/i, '').split(' · ')[0]
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Copies the current page URL pointing at this card (#slug)
function CardLinkButton({ slug, label }: { slug: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    // A span (not a button) so it keeps working inside the read-only view's disabled fieldset
    <span
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click() } }}
      onClick={async () => {
        const { origin, pathname, search } = window.location
        await navigator.clipboard.writeText(`${origin}${pathname}${search}#${slug}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className={cn('cursor-pointer transition-colors', copied ? 'text-emerald-600' : 'text-slate-300 group-hover/card:text-slate-500 hover:text-slate-800')}
      title={`Copy link to “${label}”`}
      aria-label={`Copy link to ${label}`}
    >
      {copied ? <Check size={13} /> : <Link2 size={13} />}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const slug = sectionSlug(title)
  return (
    <div id={slug} className="group/card bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-4">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h2>
        <CardLinkButton slug={slug} label={title.split(' · ')[0]} />
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
// shareMode: public realtor view — hides CMA-I sections, home distance, and owner-only controls
export default function PropertyDetail({ onBack, shareMode = false, takeScrollTarget }: {
  onBack?: () => void
  shareMode?: boolean
  takeScrollTarget?: () => string   // one-time card anchor to jump to on open (share page uses the URL #hash)
}) {
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const saleListings = useAppStore((s) => s.saleListings)
  const deleteListing = useAppStore((s) => s.deleteListing)
  const assumptions = useAppStore((s) => s.assumptions)
  const setAssumptions = useAppStore((s) => s.setAssumptions)
  const saveRentToDb = useAppStore((s) => s.saveRentToDb)
  const resetRentToOriginal = useAppStore((s) => s.resetRentToOriginal)
  const saveRepairsToDb = useAppStore((s) => s.saveRepairsToDb)
  const saveSuperToDb = useAppStore((s) => s.saveSuperToDb)
  const savePropertyTypeToDb = useAppStore((s) => s.savePropertyTypeToDb)
  const saveUnitsToDb = useAppStore((s) => s.saveUnitsToDb)
  const saveLocationToDb = useAppStore((s) => s.saveLocationToDb)
  const listing = saleListings.find((l) => l.id === selectedId)
  // Automated estimate (comps or HUD) that a manual override resets to
  const originalRent = listing?.autoRent

  const isMultiFamily = listing?.propertyType === 'Multi Family'

  // Local editable values — reset when selected property changes
  const [repairsInput, setRepairsInput] = useState(20000)
  const [rentInput, setRentInput] = useState(listing?.estimatedRent ?? 0)
  const [unitsInput, setUnitsInput] = useState(listing?.units ?? 2)
  const [propertyTaxInput, setPropertyTaxInput] = useState(listing?.cmaPropertyTaxAnnual ?? listing?.propertyTaxAnnual ?? 0)
  // Per-unit rents for multi-family
  const [unitRents, setUnitRents] = useState<number[]>([])
  // Which gear row is expanded
  const [openGear, setOpenGear] = useState<string | null>(null)
  const [pmRateBeforeDisable, setPmRateBeforeDisable] = useState(
    assumptions.propertyManagementRate > 0 ? assumptions.propertyManagementRate : 0.10
  )
  const [superCostInput, setSuperCostInput] = useState(listing?.superAnnualCost ?? 1449)
  const [superBeforeDisable, setSuperBeforeDisable] = useState(listing?.superAnnualCost ?? 1449)
  const [regeocodeBusy, setRegeocodeBusy] = useState(false)
  // Who the numbers are for — CMA-I internally, a generic investor on shared pages
  const owner = shareMode ? 'investor' : 'CMA'

  // Operating reserve — CMA funds $20k reserve per property at acquisition
  const PROPERTY_RESERVE = OPERATING_RESERVE
  const [currentReserveInput, setCurrentReserveInput] = useState(PROPERTY_RESERVE)

  useEffect(() => {
    const dbRent = listing?.estimatedRent ?? 0
    const dbUnits = listing?.units ?? 2
    setRepairsInput(20000)
    // Default to the Low rent — the same value the map/list uses for grading
    const hasRentRange = (listing?.rentLow ?? 0) > 0 && (listing?.rentHigh ?? 0) > 0 && listing?.rentConfidence !== 'High'
    const defaultRent = hasRentRange
      ? computeConservativeRent(dbRent, listing?.rentLow ?? 0, listing?.rentHigh ?? 0, listing?.rentConfidence ?? 'Low')
      : dbRent
    setRentInput(defaultRent)
    setUnitsInput(dbUnits)
    setPropertyTaxInput(listing?.cmaPropertyTaxAnnual ?? listing?.propertyTaxAnnual ?? 0)
    const dbSuper = listing?.superAnnualCost ?? 1449
    setSuperCostInput(dbSuper)
    setSuperBeforeDisable(dbSuper > 0 ? dbSuper : 1449)
    setOpenGear(null)
    if (listing?.propertyType === 'Multi Family' && dbUnits >= 2) {
      const perUnit = Math.round(dbRent / dbUnits)
      setUnitRents(Array(dbUnits).fill(perUnit))
    } else {
      setUnitRents([])
    }
  }, [listing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Jump to a linked card (#slug) once the listing has rendered
  useEffect(() => {
    if (!listing) return
    // Finder hands over the hash captured on load (once); the share page keeps it in the URL
    const target = takeScrollTarget?.() || (shareMode ? decodeURIComponent(window.location.hash.slice(1)) : '')
    if (!target) return
    // Not cancelled on cleanup: the target is taken once, so a dev double-mount must not drop the scroll
    setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
  }, [listing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveRentInput = isMultiFamily && unitRents.length > 0
    ? unitRents.reduce((s, r) => s + r, 0)
    : rentInput

  // Mirror an unsaved rent choice (Low/Moderate/High/custom) onto the map pin and card; the
  // default (Low / conservative) needs no override. Cleared when leaving the listing.
  const setWhatIfRent = useAppStore((s) => s.setWhatIfRent)
  const defaultRent = listing ? computeConservativeRent(listing.estimatedRent, listing.rentLow, listing.rentHigh, listing.rentConfidence) : 0
  useEffect(() => {
    if (!listing) return
    setWhatIfRent(effectiveRentInput > 0 && effectiveRentInput !== defaultRent ? { id: listing.id, rent: effectiveRentInput } : null)
  }, [listing?.id, effectiveRentInput, defaultRent]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => setWhatIfRent(null), [listing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const metricsFor = (a: typeof assumptions, rent: number) => computeMetrics({
    price: listing.price,
    hoaMonthly: listing.hoaMonthly,
    estimatedRent: rent,
    propertyTaxAnnual: propertyTaxInput,
    insuranceRate: a.insuranceRate,
    closingCostRate: a.closingCostRate,
    repairs: repairsInput,
    superAnnualCost: superCostInput,
    vacancyRate: a.vacancyRate,
    maintenanceRate: a.maintenanceRate,
    capExRate: a.capExRate,
    propertyManagementRate: a.propertyManagementRate,
    tenancyYears: a.tenancyYears,
    turnoverCost: a.turnoverCost,
    pestControlMonthly: a.pestControlMonthly,
    lawnCareMonthly: a.lawnCareMonthly,
    appreciationRate: listing.appreciationRate ?? 0.03,
    targetYieldOnCost: a.targetYieldOnCost,
    rentGrowthRate: a.rentGrowthRate,
    expenseInflationRate: a.expenseInflationRate,
    rentalDemand: listing.rentalDemand,
    rentConfidence: listing.rentConfidence,
    rentalEvidence: listing.rentalEvidence,
  })
  const metrics = metricsFor(assumptions, effectiveRentInput)
  // Realistic scenario — typical costs; on the default Low rent it also uses the realistic rent
  // (comp median). If the user picked another rent, both scenarios use that rent.
  const realisticRentValue = activeScenario === 'low' ? realisticRent(listing) : effectiveRentInput
  const realA = realisticAssumptions(assumptions, listing.propertyType)
  const realisticMetrics = metricsFor(realA, realisticRentValue)

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
  // Only a saved custom override counts as an edit — picking Low/Moderate/High is a what-if, not saved
  const rentIsEdited = listing.rentSource === 'manual' && originalRent != null && originalRent > 0 && listing.estimatedRent !== originalRent
  const repairsIsEdited = repairsInput !== (20000)

  // Maximum Purchase Price — Stabilized Yield on Cost, solved for both scenarios.
  // Total cash includes the Day 1 reserve so the max price lines up with the Net Cash Yield shown above.
  const targetYieldOnCost = assumptions.targetYieldOnCost ?? 0.05
  const mpp = (noi: number) => {
    const maxTotal = targetYieldOnCost > 0 && noi > 0 ? Math.round(noi / targetYieldOnCost) : 0
    // price * (1 + closing) + repairs + reserve = maxTotal
    const price = maxTotal > 0
      ? Math.round((maxTotal - repairsInput - PROPERTY_RESERVE) / (1 + assumptions.closingCostRate)) : 0
    return {
      noi,
      maxTotal,
      price,
      closing: Math.round(Math.max(price, 0) * assumptions.closingCostRate),
      yieldAtAsking: totalCashRequired > 0 ? noi / totalCashRequired : 0,
    }
  }
  const mppCons = mpp(metrics.netAnnualIncome)
  // Scenario colors = their grade colors (same as the grade circles at the top)
  const consHex = GRADE_HEX[scoreToGrade(metrics.investmentScore)]
  const realHex = GRADE_HEX[scoreToGrade(realisticMetrics.investmentScore)]
  const mppReal = mpp(realisticMetrics.netAnnualIncome)
  const priceStatus: 'below' | 'near' | 'above' =
    mppCons.price > 0 && listing.price <= mppCons.price ? 'below'
    : mppReal.price > 0 && listing.price <= mppReal.price ? 'near'
    : 'above'

  return (
    // flex-1 + min-h-0 (not just h-full): Safari won't size % heights inside flex items, which
    // left the scroll area as tall as its content — i.e. unscrollable on iPhone
    <div className="flex flex-col h-full flex-1 min-h-0">
      {/* Back header — owner view gets the ⋯ actions menu; read-only views just the back arrow */}
      {(!shareMode || onBack) && (
      <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
        <button
          onClick={() => onBack ? onBack() : setSelectedId(null)}
          className="text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          title="All properties"
          aria-label="Back to all properties"
        >
          <ArrowLeft size={17} />
        </button>
        {/* Address stays visible while the detail scrolls */}
        <div className="flex-1 min-w-0 text-center leading-tight">
          <div className="text-sm font-semibold text-slate-900 truncate">{listing.address}</div>
          <div className="text-[11px] text-slate-400 truncate">{listing.city} · {fmtPrice(listing.price)}</div>
        </div>
        {!shareMode ? (
          <div className="flex items-center gap-0.5 shrink-0">
            <FavoriteButton id={listing.id} isFavorite={listing.isFavorite} className="w-8 h-8" />
            <DetailActionsMenu listingId={listing.id} onDelete={() => deleteListing(listing.id)} />
          </div>
        ) : (
          <div className="w-8 shrink-0 flex justify-end">
            <FavoriteButton id={listing.id} isFavorite={listing.isFavorite} readOnly className="w-8 h-8" />
          </div>
        )}
      </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {/* Shared / Realtor views are view-only: a disabled fieldset turns every input and button
            inside into read-only (links still work; card link icons are spans, not buttons) */}
        <fieldset disabled={shareMode} className="contents">
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
                {!shareMode && (
                  <span className="bg-white/90 backdrop-blur-sm text-slate-600 text-xs px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                    <Navigation size={10} />
                    {distFromHome.toFixed(1)} mi
                  </span>
                )}
                {listing.daysOnMarket > 0 && (
                  <span className="bg-white/90 backdrop-blur-sm text-slate-600 text-xs px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                    <Clock size={10} />
                    {fmtDom(listing.daysOnMarket)}
                  </span>
                )}
              </div>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div>
                <div className="text-xl font-bold text-slate-900">{fmtPrice(listing.price)}</div>
                <div className="text-sm text-slate-600 mt-0.5">{listing.address}</div>
                <div className="text-sm text-slate-400">{listing.city}</div>
              </div>
              {/* Grades on their own row below the city: conservative, then realistic */}
              <div className="flex items-center gap-4">
                {([
                  { label: 'Conservative', score: metrics.investmentScore, y: metrics.netCashYield },
                  { label: 'Realistic', score: realisticMetrics.investmentScore, y: realisticMetrics.netCashYield },
                ]).map((g) => (
                  <div key={g.label} className="flex items-center gap-2" title={`${g.label} grade: ${scoreGrade(g.score)} (${g.score}/100)`}>
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0', gradeColor(g.score))}>
                      {scoreGrade(g.score)}
                    </div>
                    <div className="leading-tight">
                      <div className={cn('text-sm font-bold', yieldColor(g.score))}>{fmtYield(g.y)}</div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">{g.label}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                {isMultiFamily ? (
                  <span className="font-medium text-slate-700">{unitsInput} units</span>
                ) : null}
                <span>{listing.beds} bed{isMultiFamily ? '/unit' : ''}</span>
                <span>{listing.baths} bath{isMultiFamily ? '/unit' : ''}</span>
                {listing.sqft > 0 && <span>{listing.sqft.toLocaleString()} sqft</span>}
                {listing.yearBuilt > 0 && <span>Built {listing.yearBuilt}</span>}
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
              {/* Extra rental licensing/registration where this property sits */}
              {regulatedAreasAt(listing.lat, listing.lng).map((area) => (
                <a
                  key={area.id}
                  href={area.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={area.summary.join(' · ')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2.5 py-0.5 mr-1.5 hover:bg-purple-100"
                >
                  <ScrollText size={12} />
                  {area.short} required
                </a>
              ))}
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
                {crimeGradeUrl(listing.city) && (
                  <a
                    href={crimeGradeUrl(listing.city)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    title="CrimeGrade: green-to-red crime heat map for this ZIP"
                  >
                    <ShieldAlert size={13} />
                    Crime grade
                  </a>
                )}
                <a
                  href={crimeMapUrl(listing.lat, listing.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  title="SpotCrime: recent incidents around this exact address"
                >
                  <MapPin size={13} />
                  Nearby incidents
                </a>
                {listing.hoaMonthly > 0 && (
                  <a
                    href={hoaSearchUrl(listing)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    title={listing.community ? `Search for the ${listing.community} HOA website` : 'Search for this property’s HOA website'}
                  >
                    <Building2 size={13} />
                    Find HOA
                  </a>
                )}
                {!shareMode && (
                <button
                  onClick={async () => {
                    setRegeocodeBusy(true)
                    try {
                      const q = encodeURIComponent(`${listing.address}, ${listing.city}`)
                      const { result } = await fetch(`/api/geocode?address=${q}`).then((r) => r.json()) as
                        { result: { lat: number; lng: number; precision: 'address' | 'zip' } | null }
                      const moved = result && (Math.abs(result.lat - listing.lat) > 1e-5 || Math.abs(result.lng - listing.lng) > 1e-5)
                      if (result?.precision === 'address' && moved) {
                        await saveLocationToDb(listing.id, result.lat, result.lng)
                        return
                      }
                      // Geocoders only know the ZIP (common for new construction) or agree with the
                      // current pin — let the user paste exact coordinates instead
                      const input = prompt(
                        `Couldn't find a more precise location for ${listing.address}.\n\n` +
                        'Paste coordinates as "lat, lng" (in Google Maps, right-click the house and click the numbers to copy them):',
                      )
                      const m = input?.match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/)
                      if (m) await saveLocationToDb(listing.id, parseFloat(m[1]), parseFloat(m[2]))
                      else if (input) alert('Could not read those coordinates — use the format "39.4294, -77.2950".')
                    } catch {
                      alert('Geocoding failed. Check your connection and try again.')
                    } finally {
                      setRegeocodeBusy(false)
                    }
                  }}
                  disabled={regeocodeBusy}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-40"
                >
                  <MapPin size={13} />
                  {regeocodeBusy ? 'Locating…' : 'Fix location'}
                </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Data gaps: what to collect before trusting the numbers (owner view) ── */}
          {!shareMode && dataGaps(listing).length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                <AlertTriangle size={15} /> Needs data before you trust these numbers
              </div>
              {dataGaps(listing).map((g) => (
                <div key={g.key} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-amber-900">{g.label}</div>
                    <div className="text-xs text-amber-800/80 leading-snug">{g.detail}</div>
                  </div>
                  <a
                    href={g.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={g.action}
                    className="shrink-0 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md px-2.5 py-1.5 flex items-center gap-1 whitespace-nowrap"
                  >
                    {g.button} <ExternalLink size={11} />
                  </a>
                </div>
              ))}
              <div className="text-[11px] text-amber-800/70">
                Comps come from a Redfin <span className="font-semibold">rentals search</span>; details come from the <span className="font-semibold">listing page</span>.
                Click your <span className="font-semibold">+ Carrie Me Away</span> bookmark on that page, then refresh here.
              </div>
            </div>
          )}

          {!shareMode && (<>
          {/* ── Carrie Capital ───────────────────────────────── */}
          <Section title="Carrie Capital">
            <div className="py-1">
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
            </div>
          </Section>
          </>)}

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
                        {listing.rentSource === 'comps'
                          ? `${listing.rentCompCount} nearby rental comps · ${listing.beds}bd ${listing.propertyType.toLowerCase()}s`
                          : listing.rentConfidence === 'Medium' ? 'HUD SAFMR + adjustments · no rental comps saved nearby' : 'HUD FMR + adjustments · no rental comps saved nearby'}
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
                    <div className="text-xs text-blue-600 mt-1.5">
                      Grade uses Low · Moderate/High are what-ifs and aren&apos;t saved
                    </div>
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
                      // Back to the default: Low end of the refreshed range
                      const fresh = useAppStore.getState().saleListings.find((l) => l.id === listing.id)
                      setRentInput(fresh && fresh.rentLow > 0 ? fresh.rentLow : originalRent)
                    }}
                    className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 pb-1"
                  >
                    <RotateCcw size={10} />
                    Reset to automated estimate ({fmtRent(originalRent)})
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
          <RentCompsSection listing={listing} shareMode={shareMode} />

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
              sub={listing.propertyTaxWarning ? `⚠ ${owner} est. may exceed seller current bill` : undefined}
              openGear={openGear} setOpenGear={setOpenGear}
            >
              <div className="space-y-2">
                {/* Three-line tax breakdown */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Seller currently pays</span>
                    <span className="tabular-nums font-medium">{fmtCurrency(listing.propertyTaxAnnual)}/yr</span>
                  </div>
                  <div className="flex justify-between text-slate-700 font-semibold">
                    <span>{shareMode ? 'Investor' : 'CMA'} estimated{listing.propertyTaxIsEstimated ? ' (est.)' : ''}</span>
                    <span className="tabular-nums">{fmtCurrency(listing.cmaPropertyTaxAnnual)}/yr</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>After reassessment (proj.)</span>
                    <span className="tabular-nums">{fmtCurrency(listing.projectedPropertyTaxAnnual)}/yr</span>
                  </div>
                </div>
                {listing.propertyTaxWarning && (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                    Current tax bill may understate taxes after acquisition. Seller may benefit from a Homestead Tax Credit that {shareMode ? 'an investor' : 'CMA'} will not receive as a rental owner.
                  </div>
                )}
                {/* Editable override */}
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Override for this analysis</span>
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
                  {propertyTaxInput !== listing.cmaPropertyTaxAnnual && (
                    <button
                      onClick={() => setPropertyTaxInput(listing.cmaPropertyTaxAnnual)}
                      className="flex items-center gap-0.5 text-xs text-orange-500 hover:text-orange-700"
                    >
                      <RotateCcw size={9} /> Reset to {owner} estimate
                    </button>
                  )}
                  <p className="text-xs text-slate-400">Resets on refresh · enter actual SDAT amount if known</p>
                </div>
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
              sub={shareMode ? 'Holding LLC fixed cost' : 'CMA Investments LLC fixed cost'}
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
                      ? `${shareMode ? 'Property' : 'CMA property'} mgmt fee (${(assumptions.propertyManagementRate * 100).toFixed(0)}%)`
                      : shareMode ? 'Property mgmt fee' : 'CMA property mgmt fee'}
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

          {/* ── Net cash yield — conservative vs realistic ─────── */}
          {(() => {
            const consYield = metrics.netCashYield
            const realCashRequired = realisticMetrics.totalCashInvested + PROPERTY_RESERVE
            const realYield = realCashRequired > 0 ? realisticMetrics.netAnnualIncome / realCashRequired : 0
            // Line-by-line differences between the two scenarios (only rows that actually differ)
            const diffs: { label: string; detail: string; amount: number }[] = [
              { label: 'Rent', detail: `${fmtRent(effectiveRentInput)} → ${fmtRent(realisticRentValue)}${listing.rentSource === 'comps' ? ' (comp median)' : ''}`,
                amount: realisticMetrics.grossAnnualRent - metrics.grossAnnualRent },
              { label: 'Vacancy', detail: 'same rate, on the rent above',
                amount: metrics.vacancyReserve - realisticMetrics.vacancyReserve },
              { label: 'Maintenance', detail: `${Math.round(assumptions.maintenanceRate * 100)}% → ${Math.round(realA.maintenanceRate * 100)}% of rent`,
                amount: metrics.maintenanceReserve - realisticMetrics.maintenanceReserve },
              { label: 'CapEx', detail: `${Math.round(assumptions.capExRate * 100)}% → ${Math.round(realA.capExRate * 100)}% of rent`,
                amount: metrics.capExReserve - realisticMetrics.capExReserve },
              { label: 'Insurance', detail: `${(assumptions.insuranceRate * 100).toFixed(2)}% → ${(realA.insuranceRate * 100).toFixed(2)}% of price`,
                amount: metrics.insuranceAnnual - realisticMetrics.insuranceAnnual },
              { label: 'Pest control', detail: `$${assumptions.pestControlMonthly} → $${realA.pestControlMonthly}/mo`,
                amount: metrics.pestControlAnnual - realisticMetrics.pestControlAnnual },
              { label: 'Lawn care', detail: `$${assumptions.lawnCareMonthly} → $${realA.lawnCareMonthly}/mo`,
                amount: metrics.lawnCareAnnual - realisticMetrics.lawnCareAnnual },
            ].filter((d) => Math.abs(d.amount) >= 1)
            return (
              <div id="net-cash-yield" className="group/card bg-white rounded-xl border border-slate-200 p-4 space-y-3 scroll-mt-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Cash Yield</div>
                  <CardLinkButton slug="net-cash-yield" label="Net Cash Yield" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { label: 'Conservative', y: consYield, noi: metrics.netAnnualIncome, cash: totalCashRequired, score: metrics.investmentScore },
                    { label: 'Realistic', y: realYield, noi: realisticMetrics.netAnnualIncome, cash: realCashRequired, score: realisticMetrics.investmentScore },
                  ]).map((c) => (
                    <div key={c.label} className={cn('rounded-lg p-3', yieldBg(c.score))}>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</div>
                      <div className={cn('text-2xl font-bold', yieldColor(c.score))}>{fmtYield(c.y)}</div>
                      <div className={cn('text-xs font-semibold', yieldColor(c.score))}>{yieldLabel(c.y, assumptions.targetYieldOnCost)}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{fmtCurrency(c.noi)}/yr ÷ {fmtCurrency(c.cash)}</div>
                    </div>
                  ))}
                </div>
                {diffs.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-medium text-slate-500">What realistic changes</div>
                    {diffs.map((d) => (
                      <div key={d.label} className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-600"><span className="font-medium">{d.label}</span> <span className="text-slate-400">· {d.detail}</span></span>
                        <span className={cn('tabular-nums font-medium shrink-0', d.amount >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {d.amount >= 0 ? '+' : '−'}{fmtCurrency(Math.abs(d.amount))}/yr
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-500 leading-relaxed">
                  Conservative uses your global assumptions. Realistic uses typical costs for a self-managed rental
                  (caps: maintenance {Math.round(REALISTIC.maintenanceRate * 100)}%, CapEx {Math.round(REALISTIC.capExRate * 100)}%, insurance {(REALISTIC.insuranceRate * 100).toFixed(2)}% of price,
                  pest ${REALISTIC.pestControlMonthly}/mo, no lawn care for townhouses/condos). Taxes, HOA, repairs, reserve and vacancy rate are the same in both.
                </p>
              </div>
            )
          })()}

          {/* ── Maximum Purchase Price / Stabilized Yield on Cost ── */}
          <Section title="Maximum Purchase Price">
            <p className="text-xs text-slate-400 leading-relaxed pt-1 pb-2">
              The highest price you can pay and still earn your target yield, for both scenarios.
              Total cash includes closing, repairs and the {fmtCurrency(PROPERTY_RESERVE)} reserve — the same basis as Net Cash Yield above. NOI excludes debt payments.
            </p>

            {/* Plain-English answer first: what you'd earn at the asking price */}
            <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700 leading-relaxed">
              At the asking price of <span className="font-semibold">{fmtCurrency(listing.price)}</span> you&apos;d earn{' '}
              <span className={cn('font-semibold', mppCons.yieldAtAsking >= targetYieldOnCost ? 'text-emerald-700' : 'text-red-600')}>{fmtYield(mppCons.yieldAtAsking)}</span> conservative to{' '}
              <span className={cn('font-semibold', mppReal.yieldAtAsking >= targetYieldOnCost ? 'text-emerald-700' : 'text-red-600')}>{fmtYield(mppReal.yieldAtAsking)}</span> realistic,
              vs your <span className="font-semibold">{fmtYield(targetYieldOnCost)}</span> target.
              {/* How far the price has to move to reach the target, per scenario */}
              <div className="mt-1.5 pt-1.5 border-t border-slate-200 space-y-0.5">
                {([
                  { label: 'Conservative', m: mppCons },
                  { label: 'Realistic', m: mppReal },
                ]).map(({ label, m }) => {
                  const gap = listing.price - m.price
                  return (
                    <div key={label}>
                      <span className="text-slate-500">{label}:</span>{' '}
                      {m.price <= 0 ? (
                        <span className="text-red-600">net income is too low to reach {fmtYield(targetYieldOnCost)} at any price</span>
                      ) : gap > 0 ? (
                        <>offer <span className="font-semibold text-red-600">{fmtCurrency(gap)} below asking</span> ({fmtCurrency(m.price)}) to get {fmtYield(targetYieldOnCost)}</>
                      ) : (
                        <>asking already beats {fmtYield(targetYieldOnCost)} — <span className="font-semibold text-emerald-700">{fmtCurrency(-gap)} of room</span></>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Target yield — slider */}
            <div className="py-1.5 mt-1">
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

            {/* Price ladder: conservative max · asking · realistic max (dots use each scenario's grade color) */}
            {(() => {
              const pts = [mppCons.price, mppReal.price, listing.price].filter((v) => v > 0)
              const lo = Math.min(...pts) * 0.96, hi = Math.max(...pts) * 1.04
              const pctOf = (v: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))
              const pos = (v: number) => `${pctOf(v)}%`
              // Labels near either end align inward so they aren't clipped by the panel
              const labelAlign = (v: number) => pctOf(v) < 18 ? 'left-0 text-left' : pctOf(v) > 82 ? 'right-0 text-right' : 'left-1/2 -translate-x-1/2 text-center'
              const marks = [
                { label: 'Conservative max', v: mppCons.price, hex: consHex },
                { label: 'Realistic max', v: mppReal.price, hex: realHex },
              ].filter((m) => m.v > 0)
              return (
                <div className="pt-6 pb-9 px-2">
                  <div className="relative h-2 rounded-full bg-slate-100">
                    {mppCons.price > 0 && (
                      <div
                        className="absolute h-2 rounded-full opacity-40"
                        style={{
                          left: pos(mppCons.price),
                          width: `calc(${pos(Math.max(mppReal.price, mppCons.price))} - ${pos(mppCons.price)})`,
                          backgroundImage: `linear-gradient(90deg, ${consHex}, ${realHex})`,
                        }}
                      />
                    )}
                    {marks.map((m) => (
                      <div key={m.label} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pos(m.v) }}>
                        <div className="w-3 h-3 rounded-full ring-2 ring-white" style={{ background: m.hex }} />
                        <div className={cn('absolute top-4 whitespace-nowrap', labelAlign(m.v))} style={{ color: m.hex }}>
                          <div className="text-xs font-bold tabular-nums">{fmtPrice(m.v)}</div>
                          <div className="text-[10px] text-slate-500">{m.label}</div>
                        </div>
                      </div>
                    ))}
                    <div className="absolute -translate-x-1/2" style={{ left: pos(listing.price), top: -6 }}>
                      <div className={cn('absolute bottom-full mb-0.5 whitespace-nowrap text-slate-700', labelAlign(listing.price))}>
                        <div className="text-xs font-bold tabular-nums">{fmtPrice(listing.price)} asking</div>
                      </div>
                      <div className="mx-auto w-0.5 h-5 bg-slate-800" />
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Asking price vs both maximums */}
            <div className={cn(
              'rounded-lg px-3 py-2.5',
              priceStatus === 'below' ? 'bg-emerald-50' : priceStatus === 'near' ? 'bg-orange-50' : 'bg-red-50'
            )}>
              <div className={cn('text-sm font-semibold', priceStatus === 'below' ? 'text-emerald-700' : priceStatus === 'near' ? 'text-orange-700' : 'text-red-700')}>
                {priceStatus === 'below' ? 'Asking is within the conservative max'
                  : priceStatus === 'near' ? 'Asking works only if things go typically'
                  : 'Asking is above both maximums'}
              </div>
              <div className={cn('text-xs mt-0.5 leading-relaxed', priceStatus === 'below' ? 'text-emerald-600' : priceStatus === 'near' ? 'text-orange-600' : 'text-red-600')}>
                {mppCons.price > 0
                  ? (listing.price > mppCons.price
                    ? `${fmtCurrency(listing.price - mppCons.price)} over the conservative max`
                    : `${fmtCurrency(mppCons.price - listing.price)} under the conservative max`)
                  : 'Conservative NOI is too low to support any price at this target'}
                {mppReal.price > 0 && (
                  ` · ${listing.price > mppReal.price
                    ? `${fmtCurrency(listing.price - mppReal.price)} over`
                    : `${fmtCurrency(mppReal.price - listing.price)} under`} the realistic max`
                )}
              </div>
            </div>

            {/* How the maximums are built — both scenarios side by side */}
            <div className="mt-3">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 text-sm items-center">
                <div />
                <div className="text-[10px] font-semibold uppercase tracking-wide text-right" style={{ color: consHex }}>Conservative</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-right" style={{ color: realHex }}>Realistic</div>

                <div className="text-slate-600">Annual stabilized NOI</div>
                <div className="text-right tabular-nums text-slate-800">{fmtCurrency(mppCons.noi)}</div>
                <div className="text-right tabular-nums text-slate-800">{fmtCurrency(mppReal.noi)}</div>

                <div className="text-slate-600">Max total cash <span className="text-xs text-slate-400">NOI ÷ {fmtYield(targetYieldOnCost)}</span></div>
                <div className="text-right tabular-nums text-slate-800">{mppCons.maxTotal > 0 ? fmtCurrency(mppCons.maxTotal) : '—'}</div>
                <div className="text-right tabular-nums text-slate-800">{mppReal.maxTotal > 0 ? fmtCurrency(mppReal.maxTotal) : '—'}</div>

                <div className="text-slate-500">− Closing costs <span className="text-xs text-slate-400">{(assumptions.closingCostRate * 100).toFixed(0)}% of max price</span></div>
                <div className="text-right tabular-nums text-slate-500">{fmtCurrency(mppCons.closing)}</div>
                <div className="text-right tabular-nums text-slate-500">{fmtCurrency(mppReal.closing)}</div>

                <div className="text-slate-500">− Repairs / rehab</div>
                <div className="text-right tabular-nums text-slate-500">{fmtCurrency(repairsInput)}</div>
                <div className="text-right tabular-nums text-slate-500">{fmtCurrency(repairsInput)}</div>

                <div className="text-slate-500">− Day 1 operating reserve</div>
                <div className="text-right tabular-nums text-slate-500">{fmtCurrency(PROPERTY_RESERVE)}</div>
                <div className="text-right tabular-nums text-slate-500">{fmtCurrency(PROPERTY_RESERVE)}</div>

                <div className="col-span-3 border-t border-slate-200 my-0.5" />

                <div className="font-semibold text-slate-900">Maximum purchase price</div>
                <div className="text-right tabular-nums font-bold" style={{ color: consHex }}>{mppCons.price > 0 ? fmtCurrency(mppCons.price) : '—'}</div>
                <div className="text-right tabular-nums font-bold" style={{ color: realHex }}>{mppReal.price > 0 ? fmtCurrency(mppReal.price) : '—'}</div>

              </div>
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

            // True year-by-year 5-year cash flows from computeMetrics
            const tenYrRent = metrics.cumulativeFiveYearCashFlow   // actual 5-yr sum
            const rent1yr = metrics.fiveYearCashFlows[0] ?? metrics.netAnnualIncome   // Year 1

            const computeCagr = (gain: number) => {
              const total = totalCashRequired + gain
              if (total <= 0 || totalCashRequired <= 0) return null
              return Math.pow(total / totalCashRequired, 1 / 5) - 1
            }
            const cagrCon = computeCagr(tenYrRent + eq.conservative)
            const cagrExp = computeCagr(tenYrRent + eq.expected)
            const cagrStr = computeCagr(tenYrRent + eq.strong)

            // 20-year chart: use year-by-year cash flows (growth-adjusted) for cumulative rent line
            // Variable expenses grow with rent; fixed expenses grow by expenseInflationRate
            const rentGrowthRate = assumptions.rentGrowthRate ?? 0.03
            const expInflRate = assumptions.expenseInflationRate ?? 0.025
            const baseGrossRent = metrics.grossAnnualRent
            const varExpRate = (assumptions.vacancyRate + assumptions.maintenanceRate +
              assumptions.capExRate + assumptions.propertyManagementRate)
            // Derive fixed expenses: what's left after variable expenses and net income
            const baseFixedExp = baseGrossRent * (1 - varExpRate) - metrics.netAnnualIncome

            let cumulativeRent = 0
            const chartData = Array.from({ length: 21 }, (_, yr) => {
              if (yr > 0) {
                const rentFactor = Math.pow(1 + rentGrowthRate, yr - 1)
                const expFactor = Math.pow(1 + expInflRate, yr - 1)
                const grossRent_yr = baseGrossRent * rentFactor
                const netCashFlow_yr = grossRent_yr - grossRent_yr * varExpRate - baseFixedExp * expFactor
                cumulativeRent += netCashFlow_yr
              }
              const rent = Math.round(cumulativeRent)
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
                {/* CMA-I capital, ownership & member economics — owner view only */}
                {!shareMode && (() => {
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
        </fieldset>
      </div>
    </div>
  )
}

// ── Rent comparables ─────────────────────────────────────────────────────────
function RentCompsSection({ listing, shareMode = false }: { listing: SaleListing; shareMode?: boolean }) {
  const rentalListings = useAppStore((s) => s.rentalListings)
  const toggleExcludedComp = useAppStore((s) => s.toggleExcludedComp)
  const [busyId, setBusyId] = useState<string | null>(null)
  const excluded = new Set(listing.excludedCompIds ?? [])

  // Exactly the pool the estimate draws from: same beds + type, fresh, within 3 mi
  const pool = rentalListings
    .map((r) => ({
      ...r,
      dist: distanceMiles(listing.lat, listing.lng, r.lat, r.lng),
      adjusted: compAdjustedRent(r, listing),
    }))
    .filter((r) => r.dist <= 3 && Math.abs(r.beds - listing.beds) <= MAX_BED_DIFF && r.propertyType === listing.propertyType && isFreshComp(r.fetchedAt))
    .sort((a, b) => a.dist - b.dist)
  if (pool.length === 0) return null

  // Mirror lib/rent-comps: 1.5 mi first, widened to 3 mi when fewer than MIN_COMPS remain
  const near = pool.filter((r) => r.dist <= 1.5 && !excluded.has(r.id)).length
  const radius = near >= MIN_COMPS ? 1.5 : 3
  const usedCount = pool.filter((r) => r.dist <= radius && !excluded.has(r.id)).length

  return (
    <Section title={`Rent Comps · ${usedCount} used`}>
      <div className="py-1">
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          {listing.beds}-bed (±1) {listing.propertyType.toLowerCase()} rentals seen on Redfin in the last {MAX_COMP_AGE_DAYS} days, within {radius} mi
          {radius === 3 ? ' (widened — fewer than 3 within 1.5 mi)' : ''}. Each rent is adjusted ${BED_ADJ} per bedroom and ${SIZE_ADJ_PER_SQFT.toFixed(2)}/sqft
          of difference{listing.sqft ? ` from this home's ${listing.sqft.toLocaleString()} sqft` : ' (size unknown — no adjustment)'}.
          {!shareMode && ' Exclude any that aren’t a fair match.'}
        </p>

        {(() => {
          const renderRow = (r: (typeof pool)[number]) => {
            const isExcluded = excluded.has(r.id)
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  {rentalRedfinUrl(r) ? (
                    <a
                      href={rentalRedfinUrl(r)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate flex items-center gap-1"
                    >
                      <span className={cn('truncate', isExcluded && 'line-through')}>{r.address}</span>
                      <ExternalLink size={11} className="shrink-0" />
                    </a>
                  ) : (
                    <div className={cn('text-sm text-slate-700 truncate', isExcluded && 'line-through')}>{r.address}</div>
                  )}
                  <div className="text-xs text-slate-400 mt-0.5">
                    <span className={cn(r.beds !== listing.beds && 'font-medium text-slate-500')}>{r.beds}bd</span> · {r.baths}ba{r.sqft ? ` · ${r.sqft.toLocaleString()} sqft` : ''}
                    <span className="mx-1">·</span>{r.dist.toFixed(1)} mi
                    {isExcluded && <span className="mx-1">· excluded</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-800 tabular-nums">{fmtRent(r.adjusted)}</div>
                    {r.adjusted !== r.monthlyRent && (
                      <div className="text-[10px] text-slate-400 tabular-nums">listed {fmtRent(r.monthlyRent)}</div>
                    )}
                  </div>
                  {!shareMode && (
                    <button
                      onClick={async () => { setBusyId(r.id); await toggleExcludedComp(listing.id, r.id); setBusyId(null) }}
                      disabled={busyId === r.id}
                      className={cn('text-xs px-1.5 py-0.5 rounded-md border transition-colors disabled:opacity-40',
                        isExcluded ? 'border-blue-200 text-blue-600 hover:bg-blue-50' : 'border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200')}
                      title={isExcluded ? 'Use this comp again' : 'Exclude this comp from the estimate'}
                    >
                      {isExcluded ? 'Undo' : '×'}
                    </button>
                  )}
                </div>
              </div>
            )
          }
          const used = pool.filter((r) => r.dist <= radius && !excluded.has(r.id))
          const notUsed = pool.filter((r) => !(r.dist <= radius && !excluded.has(r.id)))
          return (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">Used in estimate ({used.length})</div>
              <div className="divide-y divide-slate-100">{used.map(renderRow)}</div>
              {notUsed.length > 0 && (
                <>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-4 mb-0.5">
                    Nearby, not used — beyond {radius} mi{excluded.size > 0 ? ' or excluded' : ''} ({notUsed.length})
                  </div>
                  <div className="divide-y divide-slate-100">{notUsed.map(renderRow)}</div>
                </>
              )}
            </>
          )
        })()}

        <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5 text-sm">
          {listing.rentSource === 'comps' ? (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Estimate from {usedCount} comps</span>
              <span className="tabular-nums text-slate-700">
                Low <span className="font-semibold">{fmtRent(listing.rentLow)}</span> · Median <span className="font-semibold">{fmtRent(listing.estimatedRent)}</span>
              </span>
            </div>
          ) : (
            <div className="text-xs text-amber-600">
              {listing.rentSource === 'manual' ? 'Rent is set manually — comps are for reference.' : `Fewer than ${MIN_COMPS} usable comps — the estimate falls back to HUD.`}
            </div>
          )}
          {listing.rentSource === 'comps' && usedCount < 5 && (
            <div className="text-xs text-slate-500">Based on {usedCount} comps — usable, but more nearby rentals would firm it up.</div>
          )}
        </div>
      </div>
    </Section>
  )
}
