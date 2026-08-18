'use client'

import Image from 'next/image'
import { useState, useRef } from 'react'
import { Building2, Home, Clock, Navigation, CheckSquare, Square, Pencil, X, RotateCcw, Loader2, MapPin, ExternalLink } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { SaleListing } from '@/lib/types'
import { fmtPrice, fmtRent, fmtYield, fmtCurrency, fmtPayback, fmtDom } from '@/lib/format'
import { useAppStore } from '@/lib/store'
import { equityScenarios, tenYearRentalIncome, distanceMiles } from '@/lib/investment'
import { HOME } from '@/lib/config'
import { cn } from '@/lib/utils'

interface Props {
  listing: SaleListing
  selected: boolean
  onClick: () => void
  compareMode?: boolean
  compareSelected?: boolean
}

// ── Grade scale (A+, A, B+, B, C, D) ────────────────────────────────────────
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

// ── Yield scale ───────────────────────────────────────────────────────────────
function yieldLabel(y: number) {
  if (y >= 0.055) return 'Exceptional'
  if (y >= 0.0475) return 'Very Good'
  if (y >= 0.04) return 'Good'
  if (y >= 0.0325) return 'Fair'
  if (y >= 0.025) return 'Below Average'
  return 'Poor'
}
// Score-based tile colors (match grade circle)
function yieldBg(score: number) {
  if (score >= 70) return 'bg-emerald-50'
  if (score >= 57) return 'bg-cyan-50'
  if (score >= 44) return 'bg-blue-50'
  if (score >= 32) return 'bg-orange-50'
  if (score >= 20) return 'bg-orange-100'
  return 'bg-red-50'
}
function yieldText(score: number) {
  if (score >= 70) return 'text-emerald-700'
  if (score >= 57) return 'text-cyan-700'
  if (score >= 44) return 'text-blue-700'
  if (score >= 32) return 'text-orange-500'
  if (score >= 20) return 'text-orange-700'
  return 'text-red-600'
}
function yieldBadge(score: number) {
  if (score >= 70) return 'bg-emerald-100 text-emerald-800'
  if (score >= 57) return 'bg-cyan-100 text-cyan-800'
  if (score >= 44) return 'bg-blue-100 text-blue-800'
  if (score >= 32) return 'bg-orange-100 text-orange-600'
  if (score >= 20) return 'bg-orange-200 text-orange-800'
  return 'bg-red-100 text-red-700'
}


function GradeBadge({ score, netCashYield }: { score: number; netCashYield: number }) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 cursor-default',
          gradeColor(score),
        )}
      >
        {scoreGrade(score)}
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs">
        <p className="font-semibold mb-1">Investment Grade: {scoreGrade(score)} ({score}/100)</p>
        <p className="text-sm text-muted-foreground">
          50% net cash yield · 15% rental demand · 15% rent confidence · 10% rental evidence · 10% HOA burden
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

export default function PropertyCard({ listing, selected, onClick, compareMode = false, compareSelected = false }: Props) {
  const saveRentToDb = useAppStore((s) => s.saveRentToDb)
  const resetRentToOriginal = useAppStore((s) => s.resetRentToOriginal)
  const originalRent = useAppStore((s) => s.originalRents[listing.id])

  const [editingRent, setEditingRent] = useState(false)
  const [rentInput, setRentInput] = useState('')
  const [savingRent, setSavingRent] = useState(false)
  const rentInputRef = useRef<HTMLInputElement>(null)

  function startEditRent(e: React.MouseEvent) {
    e.stopPropagation()
    setRentInput(String(listing.estimatedRent))
    setEditingRent(true)
    setTimeout(() => rentInputRef.current?.select(), 20)
  }

  async function commitRent(e?: React.MouseEvent | React.KeyboardEvent) {
    e?.stopPropagation()
    const val = parseInt(rentInput.replace(/[^0-9]/g, ''))
    if (!isNaN(val) && val > 0 && val !== listing.estimatedRent) {
      setSavingRent(true)
      await saveRentToDb(listing.id, val)
      setSavingRent(false)
    }
    setEditingRent(false)
  }

  async function handleResetRent(e: React.MouseEvent) {
    e.stopPropagation()
    setSavingRent(true)
    await resetRentToOriginal(listing.id)
    setSavingRent(false)
    setEditingRent(false)
  }

  const isRentEdited = originalRent != null && originalRent > 0 && originalRent !== listing.estimatedRent

  const equity = equityScenarios(listing.price, listing.appreciationRate)
  const tenYrRent = tenYearRentalIncome(listing.netAnnualIncome)
  const tenYrCombined = tenYrRent + equity.expected
  const distFromHome = distanceMiles(HOME.lat, HOME.lng, listing.lat, listing.lng)

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border cursor-pointer transition-all hover:shadow-md',
        compareMode && compareSelected
          ? 'border-blue-500 shadow-md ring-1 ring-blue-200'
          : selected && !compareMode
          ? 'border-blue-500 shadow-md ring-1 ring-blue-200'
          : 'border-slate-200 hover:border-slate-300',
      )}
    >
      {/* Photo */}
      <div className="relative h-40 rounded-t-xl overflow-hidden bg-slate-100">
        {listing.photoUrl ? (
          <Image src={listing.photoUrl} alt={listing.address} fill className="object-cover" sizes="420px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Home size={44} />
          </div>
        )}

        {/* Compare checkbox (top-left, when compare mode) */}
        {compareMode && (
          <div className="absolute top-2 left-2">
            <div className={cn(
              'w-7 h-7 rounded-md flex items-center justify-center backdrop-blur-sm border transition-colors',
              compareSelected
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-white/90 border-slate-200 text-slate-400',
            )}>
              {compareSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            </div>
          </div>
        )}

        {/* Property type badge (hidden in compare mode to avoid overlap) */}
        {!compareMode && (
          <div className="absolute top-2 left-2">
            <span className="bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
              {listing.propertyType === 'Condo' || listing.propertyType === 'Multi Family' ? <Building2 size={11} /> : <Home size={11} />}
              {listing.propertyType}{listing.units ? ` · ${listing.units} units` : ''}
            </span>
          </div>
        )}

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

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Price + Grade */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xl font-bold text-slate-900">{fmtPrice(listing.price)}</div>
            <div className="text-sm text-slate-500 leading-tight mt-0.5">{listing.address}</div>
            <div className="text-sm text-slate-400">{listing.city}</div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {listing.listingUrl && (
                <a
                  href={listing.listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={13} />
                  {listing.listingUrl?.includes('redfin.com') ? 'Redfin' : 'Realtor.com'}
                </a>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.address}, ${listing.city}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1"
              >
                <MapPin size={13} />
                Google Maps
              </a>
            </div>
          </div>
          <GradeBadge score={listing.investmentScore} netCashYield={listing.netCashYield} />
        </div>

        {/* Specs */}
        <div className="flex gap-3 text-sm text-slate-500">
          <span>{listing.beds}bd</span>
          <span>{listing.baths}ba</span>
          <span>{listing.sqft.toLocaleString()} sqft</span>
          <span>Built {listing.yearBuilt}</span>
        </div>

        {listing.community && (
          <div className="text-sm text-slate-500 flex items-center gap-1">
            <Building2 size={12} />{listing.community}
          </div>
        )}

        {/* Metric tiles */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Est. Rent — editable, saved to DB */}
          <div
            className={cn('bg-slate-50 rounded-lg p-2.5 group relative', editingRent && 'ring-2 ring-blue-400')}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Est. Rent</div>
              {isRentEdited && !editingRent && (
                <span className="text-[9px] font-semibold text-blue-600 bg-blue-100 px-1 rounded">edited</span>
              )}
            </div>
            {editingRent ? (
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-500">$</span>
                <input
                  ref={rentInputRef}
                  type="text"
                  value={rentInput}
                  onChange={(e) => setRentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRent(e)
                    if (e.key === 'Escape') { e.stopPropagation(); setEditingRent(false) }
                  }}
                  onBlur={() => { if (!savingRent) setEditingRent(false) }}
                  className="w-full text-sm font-bold text-slate-800 bg-transparent outline-none"
                  disabled={savingRent}
                />
                <button
                  onMouseDown={(e) => { e.preventDefault(); commitRent() }}
                  title="Save"
                  disabled={savingRent}
                  className="text-blue-500 hover:text-blue-700 font-semibold text-[10px] flex items-center gap-0.5"
                >
                  {savingRent ? <Loader2 size={10} className="animate-spin" /> : 'Save'}
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); setEditingRent(false) }} className="text-slate-400 hover:text-slate-600">
                  <X size={11} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {listing.estimatedRent > 0 ? (
                  <div className="text-base font-bold text-slate-800">{fmtRent(listing.estimatedRent)}</div>
                ) : (
                  <div className="text-sm font-medium text-slate-400 italic">Set rent</div>
                )}
                <button
                  onClick={startEditRent}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-500"
                  title="Edit rent"
                >
                  <Pencil size={11} />
                </button>
              </div>
            )}
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              {isRentEdited ? (
                <>
                  <span className="text-slate-400">was {fmtRent(originalRent)}</span>
                  <button
                    onClick={handleResetRent}
                    className="text-orange-500 hover:text-orange-700 flex items-center gap-0.5"
                    title="Reset to original HUD estimate"
                  >
                    <RotateCcw size={9} />
                    <span className="text-[10px]">reset</span>
                  </button>
                </>
              ) : listing.rentLow > 0 ? (
                <span>{fmtRent(listing.rentLow)}–{fmtRent(listing.rentHigh).replace('$', '')} <span className="text-slate-300">· HUD FMR</span></span>
              ) : listing.rentConfidence === 'High' ? (
                <span>Manually set</span>
              ) : (
                <span className="italic">No estimate — set rent</span>
              )}
            </div>
          </div>
          <div className={cn('rounded-lg p-2.5', yieldBg(listing.investmentScore))}>
            <div className="flex items-center justify-between mb-0.5">
              <div className="text-xs uppercase tracking-wide opacity-60">Net Yield</div>
              <div className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', yieldBadge(listing.investmentScore))}>
                {yieldLabel(listing.netCashYield)}
              </div>
            </div>
            <div className={cn('text-base font-bold', yieldText(listing.investmentScore))}>{fmtYield(listing.netCashYield)}</div>
            <div className="text-xs opacity-60">{fmtPayback(listing.paybackYears)} payback</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Net Income</div>
            <div className="text-base font-semibold text-slate-800">{fmtCurrency(listing.netAnnualIncome)}/yr</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">HOA</div>
            <div className="text-base font-semibold text-slate-800">
              {listing.hoaMonthly > 0 ? fmtCurrency(listing.hoaMonthly) + '/mo' : 'None'}
            </div>
          </div>
        </div>

        {/* 10-year equity */}
        <div className="bg-slate-900 rounded-lg p-2.5 grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">10-yr Equity</div>
            <div className="text-base font-bold text-white">+{fmtCurrency(equity.expected)}</div>
            <div className="text-xs text-slate-400">at {(listing.appreciationRate * 100).toFixed(1)}%/yr est.</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">10-yr Combined</div>
            <div className="text-base font-bold text-white">+{fmtCurrency(tenYrCombined)}</div>
            <div className="text-xs text-slate-400">rent + equity</div>
          </div>
        </div>

      </div>
    </div>
  )
}
