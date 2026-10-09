'use client'

import Image from 'next/image'
import { useState, useRef } from 'react'
import { Building2, Home, Clock, Navigation, CheckSquare, Square, Pencil, X, RotateCcw, Loader2, MapPin, ExternalLink, ShieldAlert, ScrollText, AlertTriangle } from 'lucide-react'
import { regulatedAreasAt } from '@/lib/regulated-areas'
import FavoriteButton from './FavoriteButton'
import { dataGaps } from '@/lib/data-gaps'
import { crimeMapUrl, crimeGradeUrl, hoaSearchUrl } from '@/lib/links'
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
  selectMode?: boolean
  selectSelected?: boolean
  listingStatus?: string   // from status check: 'Active' | 'Pending' | 'Sold' | 'Off Market' | 'Unknown'
  readOnly?: boolean       // Realtor Version: no rent editing
}

// ── Grade scale (A+, A, B+, B, C, D) ────────────────────────────────────────
function scoreGrade(score: number): string {
  if (score >= 97) return 'A+'
  if (score >= 88) return 'A'
  if (score >= 76) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}
function gradeColor(score: number): string {
  if (score >= 97) return 'bg-emerald-700'
  if (score >= 88) return 'bg-green-600'
  if (score >= 76) return 'bg-blue-700'
  if (score >= 60) return 'bg-blue-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-red-600'
}

function yieldText(score: number) {
  if (score >= 97) return 'text-emerald-700'
  if (score >= 88) return 'text-green-700'
  if (score >= 76) return 'text-blue-800'
  if (score >= 60) return 'text-blue-600'
  if (score >= 40) return 'text-orange-700'
  return 'text-red-600'
}


export default function PropertyCard({ listing, selected, onClick, selectMode = false, selectSelected = false, listingStatus, readOnly = false }: Props) {
  const saveRentToDb = useAppStore((s) => s.saveRentToDb)
  const resetRentToOriginal = useAppStore((s) => s.resetRentToOriginal)

  const [editingRent, setEditingRent] = useState(false)
  const [rentInput, setRentInput] = useState('')
  const [savingRent, setSavingRent] = useState(false)
  const rentInputRef = useRef<HTMLInputElement>(null)

  function startEditRent(e: React.MouseEvent) {
    e.stopPropagation()
    setRentInput(String(listing.conservativeRent))
    setEditingRent(true)
    setTimeout(() => rentInputRef.current?.select(), 20)
  }

  async function commitRent(e?: React.MouseEvent | React.KeyboardEvent) {
    e?.stopPropagation()
    const val = parseInt(rentInput.replace(/[^0-9]/g, ''))
    if (!isNaN(val) && val > 0 && val !== listing.estimatedRent && val !== listing.conservativeRent) {
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

  const isRentEdited = listing.rentSource === 'manual' && (listing.autoRent ?? 0) > 0 && listing.autoRent !== listing.estimatedRent

  const equity = equityScenarios(listing.price, listing.appreciationRate)
  const tenYrRent = tenYearRentalIncome(listing.netAnnualIncome)
  const tenYrCombined = tenYrRent + equity.expected
  const distFromHome = distanceMiles(HOME.lat, HOME.lng, listing.lat, listing.lng)

  const isNonActive = listingStatus && listingStatus !== 'Active' && listingStatus !== 'Unknown'

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border cursor-pointer transition-all hover:shadow-md',
        isNonActive && 'opacity-60',
        selectMode && selectSelected
          ? 'border-red-500 shadow-md ring-1 ring-red-200'
          : selected && !selectMode
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

        {/* Select checkbox (top-left, when select mode) */}
        {selectMode && (
          <div className="absolute top-2 left-2">
            <div className={cn(
              'w-7 h-7 rounded-md flex items-center justify-center backdrop-blur-sm border transition-colors',
              selectSelected
                ? 'bg-red-500 border-red-500 text-white'
                : 'bg-white/90 border-slate-200 text-slate-400',
            )}>
              {selectSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            </div>
          </div>
        )}

        {/* Property type badge (hidden in select mode to avoid overlap) */}
        {!selectMode && (
          <div className="absolute top-2 left-2">
            <span className="bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
              {listing.propertyType === 'Condo' || listing.propertyType === 'Multi Family' ? <Building2 size={11} /> : <Home size={11} />}
              {listing.propertyType}{listing.units ? ` · ${listing.units} units` : ''}
            </span>
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-1.5">
          {!readOnly && (
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

        {/* Listing status banner — shown after a status check */}
        {isNonActive && (
          <div className={cn(
            'absolute bottom-0 inset-x-0 py-1 text-center text-xs font-bold tracking-widest uppercase',
            listingStatus === 'Sold' && 'bg-red-600/90 text-white',
            listingStatus === 'Pending' && 'bg-orange-500/90 text-white',
            listingStatus === 'Off Market' && 'bg-slate-700/90 text-white',
          )}>
            {listingStatus}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Price + Grade */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xl font-bold text-slate-900">{fmtPrice(listing.price)}</div>
            <div className="text-sm text-slate-500 leading-tight mt-0.5">{listing.address}</div>
            <div className="text-sm text-slate-400">{listing.city}</div>
            {/* Grades row — same layout as the detail panel header */}
            <div className="flex items-center gap-4 my-2">
              {([
                { label: 'Conservative', score: listing.investmentScore, y: listing.netCashYield },
                ...(listing.realisticScore != null && listing.realisticNetCashYield != null
                  ? [{ label: 'Realistic', score: listing.realisticScore, y: listing.realisticNetCashYield }]
                  : []),
              ]).map((g) => (
                <div key={g.label} className="flex items-center gap-2" title={`${g.label} grade: ${scoreGrade(g.score)} (${g.score}/100)`}>
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0', gradeColor(g.score))}>
                    {scoreGrade(g.score)}
                  </div>
                  <div className="leading-tight">
                    <div className={cn('text-sm font-bold', yieldText(g.score))}>{fmtYield(g.y)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">{g.label}</div>
                  </div>
                </div>
              ))}
            </div>
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
              {crimeGradeUrl(listing.city) && (
                <a
                  href={crimeGradeUrl(listing.city)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1"
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
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1"
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
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1"
                  title={listing.community ? `Search for the ${listing.community} HOA website` : 'Search for this property’s HOA website'}
                >
                  <Building2 size={13} />
                  Find HOA
                </a>
              )}
            </div>
          </div>
          <FavoriteButton id={listing.id} isFavorite={listing.isFavorite} readOnly={readOnly} size={20} className="w-8 h-8 -mr-1 -mt-1 shrink-0" />
        </div>

        {/* Specs */}
        <div className="flex gap-3 text-sm text-slate-500">
          <span>{listing.beds}bd</span>
          <span>{listing.baths}ba</span>
          {listing.sqft > 0 && <span>{listing.sqft.toLocaleString()} sqft</span>}
          {listing.yearBuilt > 0 && <span>Built {listing.yearBuilt}</span>}
          <span>{listing.hoaMonthly > 0 ? `HOA ${fmtCurrency(listing.hoaMonthly)}/mo` : 'No HOA'}</span>
        </div>

        {/* Data gaps — what to collect with the bookmarklet (owner view only) */}
        {!readOnly && dataGaps(listing).length > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-1" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs font-semibold text-amber-800 flex items-center gap-1"><AlertTriangle size={12} />Needs data</span>
            {dataGaps(listing).map((g) => (
              <a
                key={g.key}
                href={g.href}
                target="_blank"
                rel="noopener noreferrer"
                title={`${g.detail} ${g.action}.`}
                className="text-xs font-medium text-amber-900 bg-white border border-amber-200 rounded-full px-2 py-0.5 hover:bg-amber-100 flex items-center gap-1"
              >
                {g.label}<ExternalLink size={10} />
              </a>
            ))}
          </div>
        )}

        {/* Extra rental licensing/registration where this property sits */}
        {regulatedAreasAt(listing.lat, listing.lng).map((area) => (
          <div key={area.id} className="flex items-center gap-1.5 text-xs font-medium text-purple-700" title={area.summary.join(' · ')}>
            <ScrollText size={12} />
            {area.short} required
          </div>
        ))}

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
              <div className="text-xs text-slate-400 uppercase tracking-wide">Rent</div>
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
                  <div className="text-base font-bold text-slate-800">{fmtRent(listing.conservativeRent)}</div>
                ) : (
                  <div className="text-sm font-medium text-slate-400 italic">Set rent</div>
                )}
                {!readOnly && (
                  <button
                    onClick={startEditRent}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-500"
                    title="Edit rent"
                  >
                    <Pencil size={11} />
                  </button>
                )}
              </div>
            )}
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              {isRentEdited && !readOnly ? (
                <>
                  <span className="text-slate-400">was {fmtRent(listing.autoRent ?? 0)}</span>
                  <button
                    onClick={handleResetRent}
                    className="text-orange-500 hover:text-orange-700 flex items-center gap-0.5"
                    title="Reset to original HUD estimate"
                  >
                    <RotateCcw size={9} />
                    <span className="text-[10px]">reset</span>
                  </button>
                </>
              ) : listing.rentSource === 'comps' ? (
                <span>{listing.rentCompCount} comps{(listing.rentCompCount ?? 0) < 5 ? ' · thin' : ''} · realistic {fmtRent(listing.realisticRent ?? listing.estimatedRent)}</span>
              ) : listing.rentLow > 0 ? (
                <span>HUD estimate · no comps nearby</span>
              ) : listing.rentConfidence === 'High' ? (
                <span>Manually set</span>
              ) : (
                <span className="italic">No estimate — set rent</span>
              )}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Net Income</div>
            <div className="text-base font-bold text-slate-800">{fmtCurrency(listing.netAnnualIncome)}/yr</div>
            <div className="text-xs text-slate-400">
              {listing.realisticNetAnnualIncome != null && <>realistic {fmtCurrency(listing.realisticNetAnnualIncome)} · </>}
              {fmtPayback(listing.paybackYears)} payback
            </div>
          </div>
        </div>

        {/* 5-year equity */}
        <div className="bg-slate-900 rounded-lg p-2.5 grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">5-yr Equity</div>
            <div className="text-base font-bold text-white">+{fmtCurrency(equity.expected)}</div>
            <div className="text-xs text-slate-400">at {(listing.appreciationRate * 100).toFixed(1)}%/yr est.</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">5-yr Combined</div>
            <div className="text-base font-bold text-white">+{fmtCurrency(tenYrCombined)}</div>
            <div className="text-xs text-slate-400">rent + equity</div>
          </div>
        </div>

      </div>
    </div>
  )
}
