'use client'

// Printable worksheet for one listing: every number the app uses (conservative + realistic),
// a blank "Your number" column to write over them, the rent comps, a checklist and notes space.
import { useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Printer } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { computeConservativeRent, distanceMiles, realisticAssumptions, realisticRent, OPERATING_RESERVE, LLC_ANNUAL_COST } from '@/lib/investment'
import { scenarioMetrics } from '@/lib/scenario'
import { isFreshComp, compAdjustedRent, MAX_BED_DIFF } from '@/lib/rent-comps'
import { regulatedAreasAt } from '@/lib/regulated-areas'
import { scoreToGrade } from '@/lib/grades'
import { fmtCurrency, fmtPrice, fmtYield } from '@/lib/format'

const money = (n: number) => fmtCurrency(Math.round(n))
const pct = (n: number) => `${(n * 100).toFixed(n * 100 < 10 ? 1 : 0)}%`

// Appliances / systems to record on a walkthrough; blank rows follow for extras
const APPLIANCES = [
  'Furnace / air handler', 'AC / heat pump', 'Water heater', 'Roof', 'Electrical panel',
  'Refrigerator', 'Range / oven', 'Microwave', 'Dishwasher', 'Garbage disposal',
  'Washer', 'Dryer', 'Sump pump', 'Windows', 'Smoke / CO detectors',
]

// Title line for the extra pages, so loose sheets stay matched to the property
function PageHeading({ title, address }: { title: string; address: string }) {
  return (
    <div className="flex items-end justify-between border-b-2 border-slate-800 pb-1 mb-2">
      <h2 className="text-xs font-bold uppercase tracking-wide">{title}</h2>
      <span className="text-[10px] text-slate-500">{address}</span>
    </div>
  )
}

// One worksheet row: label (+ note) | conservative | realistic | blank write-in box
function Row({ label, note, cons, real, bold }: { label: string; note?: string; cons: string; real?: string; bold?: boolean }) {
  return (
    <tr className="border-b border-slate-200 align-bottom">
      <td className={`py-1.5 pr-2 ${bold ? 'font-semibold' : ''}`}>
        {label}
        {note && <span className="block text-[9px] leading-tight text-slate-500 font-normal">{note}</span>}
      </td>
      <td className={`py-1.5 px-2 text-right tabular-nums whitespace-nowrap ${bold ? 'font-semibold' : ''}`}>{cons}</td>
      <td className={`py-1.5 px-2 text-right tabular-nums whitespace-nowrap ${bold ? 'font-semibold' : ''}`}>{real ?? cons}</td>
      <td className="py-1.5 pl-2 w-[1.6in]"><div className="h-5 border-b border-slate-400" /></td>
    </tr>
  )
}

// Blank expense line: write the item name and amounts by hand
function WriteInRow() {
  return (
    <tr className="border-b border-slate-200 align-bottom">
      <td className="py-1.5 pr-2">
        <div className="flex items-end gap-1 text-slate-400">Other:<div className="flex-1 h-5 border-b border-slate-400" /></div>
      </td>
      <td className="py-1.5 px-2"><div className="h-5 border-b border-slate-300" /></td>
      <td className="py-1.5 px-2"><div className="h-5 border-b border-slate-300" /></td>
      <td className="py-1.5 pl-2 w-[1.6in]"><div className="h-5 border-b border-slate-400" /></td>
    </tr>
  )
}

function SectionTable({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 break-inside-avoid">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-800 text-left">
            <th className="py-1 text-xs font-bold uppercase tracking-wide">{title}</th>
            <th className="py-1 px-2 w-[1.05in] text-right text-[9px] font-semibold uppercase text-slate-500">Conservative</th>
            <th className="py-1 px-2 w-[1.05in] text-right text-[9px] font-semibold uppercase text-slate-500">Realistic</th>
            <th className="py-1 pl-2 w-[1.6in] text-left text-[9px] font-semibold uppercase text-slate-500">Your number</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </section>
  )
}

export default function PrintWorksheetPage() {
  const { id } = useParams<{ id: string }>()
  const listingId = decodeURIComponent(id)
  const initialize = useAppStore((s) => s.initialize)
  const isLoading = useAppStore((s) => s.isLoading)
  const saleListings = useAppStore((s) => s.saleListings)
  const rentalListings = useAppStore((s) => s.rentalListings)
  const assumptions = useAppStore((s) => s.assumptions)

  useEffect(() => { initialize() }, [initialize])

  const l = saleListings.find((x) => x.id === listingId)

  const data = useMemo(() => {
    if (!l) return null
    const consRent = computeConservativeRent(l.estimatedRent, l.rentLow, l.rentHigh, l.rentConfidence)
    const realA = realisticAssumptions(assumptions, l.propertyType)
    const realRent = realisticRent(l)
    const c = scenarioMetrics(l, assumptions, consRent)
    const r = scenarioMetrics(l, realA, realRent)
    const target = assumptions.targetYieldOnCost
    const maxPrice = (noi: number) => noi > 0 && target > 0
      ? Math.round((noi / target - l.repairs - OPERATING_RESERVE) / (1 + assumptions.closingCostRate)) : 0
    const excluded = new Set(l.excludedCompIds ?? [])
    const comps = rentalListings
      .map((x) => ({ ...x, dist: distanceMiles(l.lat, l.lng, x.lat, x.lng), adjusted: compAdjustedRent(x, l) }))
      .filter((x) => x.dist <= 3 && Math.abs(x.beds - l.beds) <= MAX_BED_DIFF && x.propertyType === l.propertyType && isFreshComp(x.fetchedAt))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 12)
    return { consRent, realRent, realA, c, r, target, maxCons: maxPrice(c.netAnnualIncome), maxReal: maxPrice(r.netAnnualIncome), comps, excluded }
  }, [l, assumptions, rentalListings])

  if (!l || !data) {
    return <div className="p-10 text-sm text-slate-500">{isLoading || saleListings.length === 0 ? 'Loading worksheet…' : 'Listing not found.'}</div>
  }

  const { c, r, realA, target } = data
  const closing = l.price * assumptions.closingCostRate
  const totalCash = c.totalCashInvested + OPERATING_RESERVE
  const areas = regulatedAreasAt(l.lat, l.lng)
  const mgmt = (m: typeof c) => m.grossAnnualRent * assumptions.propertyManagementRate
  const expenses = (m: typeof c) => m.grossAnnualRent - m.netAnnualIncome

  return (
    <div className="bg-slate-100 print:bg-white min-h-dvh">
      <style>{`@page { size: letter; margin: 0.5in; } @media print { html, body { background: #fff; } }`}</style>

      {/* Screen-only toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <span className="text-sm text-slate-600">Print worksheet — letter size, both scenarios, blank column for your numbers</span>
        <button onClick={() => window.print()} className="flex items-center gap-2 text-sm font-semibold bg-slate-900 text-white rounded-lg px-4 py-2 hover:bg-slate-700">
          <Printer size={15} /> Print
        </button>
      </div>

      <div className="mx-auto my-6 print:my-0 bg-white shadow print:shadow-none w-[8.5in] max-w-full p-[0.5in] print:p-0 text-slate-900">
        {/* Header */}
        <header className="flex gap-4 mb-4 break-inside-avoid">
          {l.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- printed page; plain img prints reliably
            <img src={l.photoUrl} alt="" className="w-[2.1in] h-[1.45in] object-cover rounded" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-2xl font-extrabold leading-tight">{fmtPrice(l.price)} <span className="text-base font-semibold text-slate-500">({money(l.price)})</span></div>
                <div className="text-base font-semibold">{l.address}</div>
                <div className="text-sm text-slate-600">{l.city}</div>
              </div>
              <div className="text-right text-[11px] leading-snug">
                <div>Grade <b>{scoreToGrade(c.investmentScore)}</b> → <b>{scoreToGrade(r.investmentScore)}</b></div>
                <div>Yield <b>{fmtYield(c.netCashYield)}</b> – <b>{fmtYield(r.netCashYield)}</b></div>
                <div className="text-slate-500">Target {pct(target)}</div>
              </div>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-700">
              {l.beds} bd · {l.baths} ba{l.sqft ? ` · ${l.sqft.toLocaleString()} sqft` : ''}{l.yearBuilt ? ` · built ${l.yearBuilt}` : ''} · {l.propertyType}
              {l.hoaMonthly > 0 ? ` · HOA ${money(l.hoaMonthly)}/mo` : ' · No HOA'}{l.daysOnMarket ? ` · ${l.daysOnMarket} days on market` : ''}
            </div>
            {areas.map((a) => <div key={a.id} className="mt-1 text-[10px] font-semibold text-purple-800">⚑ {a.short} required — {a.summary[0]}</div>)}
            {l.listingUrl && <div className="mt-1 text-[9px] text-slate-500 break-all">{l.listingUrl}</div>}
            <div className="mt-1 text-[9px] text-slate-400">Printed {new Date().toLocaleDateString()} · CMA Investments</div>
          </div>
        </header>

        <SectionTable title="1 · Cash to close">
          <Row label="Purchase price" cons={money(l.price)} />
          <Row label="Closing costs" note={`${pct(assumptions.closingCostRate)} of price`} cons={money(closing)} />
          <Row label="Repairs / rehab" cons={money(l.repairs)} />
          <Row label="Day 1 operating reserve" cons={money(OPERATING_RESERVE)} />
          <Row label="Total cash required" cons={money(totalCash)} bold />
        </SectionTable>

        <SectionTable title="2 · Rent">
          <Row
            label="Monthly rent"
            note={l.rentSource === 'comps' ? `${l.rentCompCount} comps · conservative = low (25th pct), realistic = median` : l.rentSource === 'manual' ? 'Set manually' : 'HUD estimate (no comps nearby)'}
            cons={money(data.consRent)}
            real={money(data.realRent)}
          />
          <Row label="Gross annual rent" cons={money(c.grossAnnualRent)} real={money(r.grossAnnualRent)} bold />
        </SectionTable>

        <SectionTable title="3 · Annual expenses">
          <Row label="Vacancy" note={`${pct(assumptions.vacancyRate)} of rent`} cons={money(c.vacancyReserve)} real={money(r.vacancyReserve)} />
          <Row label="Maintenance" note={`${pct(assumptions.maintenanceRate)} → ${pct(realA.maintenanceRate)} of rent`} cons={money(c.maintenanceReserve)} real={money(r.maintenanceReserve)} />
          <Row label="CapEx" note={`${pct(assumptions.capExRate)} → ${pct(realA.capExRate)} of rent`} cons={money(c.capExReserve)} real={money(r.capExReserve)} />
          <Row label="Turnover" note={`${money(assumptions.turnoverCost)} every ${assumptions.tenancyYears} yrs`} cons={money(c.turnoverReserve)} real={money(r.turnoverReserve)} />
          {assumptions.propertyManagementRate > 0 && (
            <Row label="Property management" note={`${pct(assumptions.propertyManagementRate)} of rent`} cons={money(mgmt(c))} real={money(mgmt(r))} />
          )}
          <Row label="Property tax" note={l.propertyTaxIsEstimated ? 'Estimated — confirm the actual bill' : 'From assessment'} cons={money(l.cmaPropertyTaxAnnual)} />
          <Row label="HOA" note={`${money(l.hoaMonthly)}/mo`} cons={money(l.hoaMonthly * 12)} />
          <Row label="Insurance" note={`${(assumptions.insuranceRate * 100).toFixed(2)}% → ${(realA.insuranceRate * 100).toFixed(2)}% of price`} cons={money(c.insuranceAnnual)} real={money(r.insuranceAnnual)} />
          <Row label="Pest control" note={`$${assumptions.pestControlMonthly} → $${realA.pestControlMonthly}/mo`} cons={money(c.pestControlAnnual)} real={money(r.pestControlAnnual)} />
          <Row label="Lawn care" note={`$${assumptions.lawnCareMonthly} → $${realA.lawnCareMonthly}/mo`} cons={money(c.lawnCareAnnual)} real={money(r.lawnCareAnnual)} />
          <Row label="Super (maintenance protection)" cons={money(c.superAnnual)} real={money(r.superAnnual)} />
          <Row label="LLC fee" cons={money(LLC_ANNUAL_COST)} />
          {Array.from({ length: 3 }).map((_, i) => <WriteInRow key={i} />)}
          <Row label="Total expenses" cons={money(expenses(c))} real={money(expenses(r))} bold />
        </SectionTable>

        <SectionTable title="4 · Returns">
          <Row label="Net annual income (NOI)" cons={money(c.netAnnualIncome)} real={money(r.netAnnualIncome)} bold />
          <Row label="Net monthly cash flow" cons={money(c.netAnnualIncome / 12)} real={money(r.netAnnualIncome / 12)} />
          <Row label="Net cash yield" note="NOI ÷ total cash required" cons={fmtYield(c.netCashYield)} real={fmtYield(r.netCashYield)} bold />
          <Row label="Payback" note="Total cash ÷ NOI" cons={`${c.paybackYears.toFixed(1)} yrs`} real={`${r.paybackYears.toFixed(1)} yrs`} />
          <Row label="Target yield on cost" cons={pct(target)} />
          <Row
            label="Maximum purchase price"
            note={`Price that earns ${pct(target)} after closing, repairs and reserve`}
            cons={data.maxCons > 0 ? money(data.maxCons) : '—'}
            real={data.maxReal > 0 ? money(data.maxReal) : '—'}
            bold
          />
          <Row label="My offer" cons="" real="" bold />
        </SectionTable>

        {/* Rent comps */}
        {data.comps.length > 0 && (
          <section className="mb-4 break-inside-avoid">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-left">
                  <th className="py-1 text-xs font-bold uppercase tracking-wide" colSpan={2}>5 · Rent comps ({l.beds}±1bd {l.propertyType.toLowerCase()}, ≤3 mi)</th>
                  <th className="py-1 px-1 text-right text-[9px] font-semibold uppercase text-slate-500">Listed</th>
                  <th className="py-1 px-1 text-right text-[9px] font-semibold uppercase text-slate-500">Size-adj.</th>
                  <th className="py-1 pl-2 w-[0.7in] text-center text-[9px] font-semibold uppercase text-slate-500">Use? ✓/✗</th>
                </tr>
              </thead>
              <tbody>
                {data.comps.map((x) => (
                  <tr key={x.id} className="border-b border-slate-200">
                    <td className="py-1 pr-2">{x.address}{data.excluded.has(x.id) ? ' (excluded)' : ''}</td>
                    <td className="py-1 pr-2 text-slate-500 whitespace-nowrap">{x.beds}bd · {x.baths}ba{x.sqft ? ` · ${x.sqft.toLocaleString()} sf` : ''} · {x.dist.toFixed(1)} mi</td>
                    <td className="py-1 px-1 text-right tabular-nums">{money(x.monthlyRent)}</td>
                    <td className="py-1 px-1 text-right tabular-nums font-semibold">{money(x.adjusted)}</td>
                    <td className="py-1 pl-2"><div className="mx-auto w-4 h-4 border border-slate-400 rounded-sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Due-diligence checklist */}
        <section className="mb-4 break-inside-avoid">
          <h2 className="text-xs font-bold uppercase tracking-wide border-b-2 border-slate-800 py-1 mb-1.5">6 · Check before offering</h2>
          <div className="grid grid-cols-2 gap-x-6 text-[11px]">
            {[
              'HOA allows rentals? Any rental cap / waitlist?',
              'Actual annual tax bill (city vs county)',
              'Rental license / registration needed',
              'Appliances & systems recorded (appliance page)',
              'Lead paint (built before 1978?)',
              'Flood zone / insurance quote',
              'School assignments',
              'Comparable rents confirmed with an agent',
            ].map((item) => (
              <div key={item} className="flex items-end gap-2 py-1 border-b border-slate-200">
                <span className="w-3 h-3 border border-slate-500 rounded-sm shrink-0 mb-0.5" />
                <span className="shrink-0">{item}</span>
                <span className="flex-1 border-b border-dotted border-slate-300 mb-0.5" />
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Page: appliances & systems inventory */}
      <div className="mx-auto my-6 print:my-0 bg-white shadow print:shadow-none w-[8.5in] max-w-full p-[0.5in] print:p-0 text-slate-900 break-before-page">
        <PageHeading title="7 · Appliances & systems" address={`${l.address}, ${l.city}`} />
        <p className="text-[10px] text-slate-500 mb-2">
          Serial numbers usually encode the manufacture year. Condition: G = good, F = fair, P = poor / replace soon.
        </p>
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-800 text-left text-[9px] uppercase text-slate-500">
              <th className="py-1 pr-1 w-[1.5in] text-slate-900 text-[10px]">Item</th>
              <th className="py-1 px-1 w-[0.85in]">Brand</th>
              <th className="py-1 px-1 w-[0.95in]">Model #</th>
              <th className="py-1 px-1 w-[1.1in]">Serial #</th>
              <th className="py-1 px-1 w-[0.55in]">Year / age</th>
              <th className="py-1 px-1 w-[0.55in] text-center">G / F / P</th>
              <th className="py-1 pl-1">Notes</th>
            </tr>
          </thead>
          <tbody>
            {[...APPLIANCES, ...Array(6).fill('')].map((item, i) => (
              <tr key={i} className="border-b border-slate-300 h-[0.4in]">
                <td className="pr-1 font-medium leading-tight">{item}</td>
                {Array.from({ length: 4 }).map((_, j) => <td key={j} className="px-1 border-l border-slate-200" />)}
                <td className="px-1 border-l border-slate-200 text-center text-slate-400 tracking-widest">G F P</td>
                <td className="pl-1 border-l border-slate-200" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Page: more notes */}
      <div className="mx-auto my-6 print:my-0 bg-white shadow print:shadow-none w-[8.5in] max-w-full p-[0.5in] print:p-0 text-slate-900 break-before-page">
        <PageHeading title="8 · Notes" address={`${l.address}, ${l.city}`} />
        {Array.from({ length: 30 }).map((_, i) => <div key={i} className="h-[0.31in] border-b border-slate-300" />)}
      </div>
    </div>
  )
}
