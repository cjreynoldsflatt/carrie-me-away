'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'

type Mode = 'url' | 'text' | 'manual'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500 block">
        {label}
        {hint && <span className="font-normal ml-1 text-slate-400">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white'

export default function AddListingModal() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('url')

  // ── URL-only mode ──────────────────────────────────────────────────────────
  const [uUrl, setUUrl] = useState('')

  // ── Text-paste mode ────────────────────────────────────────────────────────
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [units, setUnits] = useState(2)

  // ── Manual entry mode ──────────────────────────────────────────────────────
  const [mUrl, setMUrl] = useState('')
  const [mAddress, setMAddress] = useState('')
  const [mCity, setMCity] = useState('')
  const [mPrice, setMPrice] = useState('')
  const [mBeds, setMBeds] = useState('')
  const [mBaths, setMBaths] = useState('')
  const [mType, setMType] = useState('Townhouse')
  const [mHoa, setMHoa] = useState('')
  const [mTax, setMTax] = useState('')
  const [mSqft, setMSqft] = useState('')
  const [mYear, setMYear] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const uUrlRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<HTMLInputElement>(null)
  const mUrlRef = useRef<HTMLInputElement>(null)
  const initialize = useAppStore((s) => s.initialize)

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (mode === 'url') uUrlRef.current?.focus()
        else if (mode === 'text') urlRef.current?.focus()
        else mUrlRef.current?.focus()
      }, 50)
    } else {
      setUUrl('')
      setUrl(''); setText(''); setPropertyType(''); setUnits(2)
      setMUrl(''); setMAddress(''); setMCity(''); setMPrice(''); setMBeds('')
      setMBaths(''); setMType('Townhouse'); setMHoa(''); setMTax(''); setMSqft(''); setMYear('')
      setError(null); setSuccess(null)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!uUrl.trim()) return
    setLoading(true); setError(null); setSuccess(null)
    try {
      const res = await fetch('/api/add-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: uUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
      } else {
        const p = data.parsed
        setSuccess(`Added: ${data.listing?.address ?? p.address ?? '(address)'} · $${p.price?.toLocaleString() ?? '0'} · ${p.beds}bd/${p.baths}ba`)
        await initialize()
        setTimeout(() => setOpen(false), 2000)
      }
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true); setError(null); setSuccess(null)
    try {
      const res = await fetch('/api/add-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          text: text.trim(),
          ...(propertyType ? { propertyType } : {}),
          ...(propertyType === 'Multi Family' ? { units } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
      } else {
        const p = data.parsed
        setSuccess(`Added: ${p.address ?? '(no address)'} · $${p.price?.toLocaleString() ?? '0'} · ${p.beds}bd/${p.baths}ba`)
        setUrl(''); setText('')
        await initialize()
        setTimeout(() => setOpen(false), 2000)
      }
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const price = Number(mPrice.replace(/[,$]/g, ''))
    if (!mAddress && !mUrl) { setError('Enter the property URL or address'); return }
    if (!price || price < 10000) { setError('Enter a valid purchase price'); return }
    if (!mBeds) { setError('Enter number of beds'); return }

    setLoading(true); setError(null); setSuccess(null)
    try {
      const res = await fetch('/api/add-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: mUrl.trim() || undefined,
          propertyType: mType,
          manual: {
            address: mAddress.trim() || undefined,
            city: mCity.trim() || undefined,
            price,
            beds: Number(mBeds) || 0,
            baths: Number(mBaths) || 0,
            sqft: mSqft ? Number(mSqft) : undefined,
            yearBuilt: mYear ? Number(mYear) : undefined,
            hoaMonthly: mHoa ? Number(mHoa) : 0,
            propertyTaxAnnual: mTax ? Number(mTax) : undefined,
            propertyType: mType,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
      } else {
        const p = data.parsed
        setSuccess(`Added: ${data.listing?.address ?? p.address ?? '(address)'} · $${price.toLocaleString()} · ${p.beds}bd/${p.baths}ba`)
        await initialize()
        setTimeout(() => setOpen(false), 2000)
      }
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  const formId = mode === 'url' ? 'url-form' : mode === 'text' ? 'text-form' : 'manual-form'
  const submitDisabled = loading ||
    (mode === 'url' && !uUrl.trim()) ||
    (mode === 'text' && !text.trim())

  return (
    <>
      {/* Mobile: icon-only button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden w-8 h-8 rounded-md flex items-center justify-center border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors shrink-0"
        title="Add listing"
      >
        <Plus size={15} />
      </button>
      {/* Desktop: text button */}
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="hidden md:flex h-7 text-xs gap-1.5 shrink-0">
        <Plus size={12} />
        Add listing
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[800] flex items-end sm:items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <h2 className="text-base font-semibold text-slate-900">Add listing</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            {/* 3-tab mode toggle */}
            <div className="px-5 pb-3 shrink-0">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
                {(['url', 'text', 'manual'] as const).map((m, i) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 transition-colors ${i > 0 ? 'border-l border-slate-200' : ''} ${
                      mode === m ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {m === 'url' ? 'URL' : m === 'text' ? 'Copy & paste' : 'Manual'}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable form body */}
            <div className="overflow-y-auto flex-1 min-h-0 px-5">

              {mode === 'url' && (
                <form id="url-form" onSubmit={handleUrlSubmit} className="space-y-3 pb-5">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Paste a Redfin or realtor.com URL — price, beds, and details will be imported automatically.
                    If auto-import fails, switch to Manual.
                  </p>
                  <Field label="Listing URL">
                    <input
                      ref={uUrlRef}
                      type="url"
                      value={uUrl}
                      onChange={(e) => setUUrl(e.target.value)}
                      placeholder="https://www.redfin.com/… or realtor.com/…"
                      className={inputCls}
                      disabled={loading}
                      inputMode="url"
                    />
                  </Field>
                </form>
              )}

              {mode === 'text' && (
                <form id="text-form" onSubmit={handleTextSubmit} className="space-y-3 pb-5">
                  <Field label="Listing URL">
                    <input
                      ref={urlRef}
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.redfin.com/… or realtor.com/…"
                      className={inputCls}
                      disabled={loading}
                    />
                  </Field>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Field label="Property type">
                        <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} disabled={loading} className={inputCls}>
                          <option value="">Auto-detect</option>
                          <option>Townhouse</option>
                          <option>Condo</option>
                          <option>Single Family</option>
                          <option>Multi Family</option>
                        </select>
                      </Field>
                    </div>
                    {propertyType === 'Multi Family' && (
                      <div className="w-28">
                        <Field label="Units">
                          <input type="number" min={2} max={50} value={units} onChange={(e) => setUnits(Math.max(2, Number(e.target.value)))} disabled={loading} className={inputCls} />
                        </Field>
                      </div>
                    )}
                  </div>

                  <Field label="Paste listing page text" hint="(Ctrl+A → Ctrl+C from the listing page)">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Paste the full page text here…"
                      rows={8}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                      disabled={loading}
                    />
                  </Field>
                </form>
              )}

              {mode === 'manual' && (
                <form id="manual-form" onSubmit={handleManualSubmit} className="space-y-3 pb-5">
                  <Field label="Listing URL" hint="(optional — auto-fills address + photo)">
                    <input
                      ref={mUrlRef}
                      type="url"
                      value={mUrl}
                      onChange={(e) => setMUrl(e.target.value)}
                      placeholder="https://www.redfin.com/… or realtor.com/…"
                      className={inputCls}
                      disabled={loading}
                      inputMode="url"
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-3">
                    <Field label="Street address" hint="(if no URL)">
                      <input
                        type="text"
                        value={mAddress}
                        onChange={(e) => setMAddress(e.target.value)}
                        placeholder="123 Main St"
                        className={inputCls}
                        disabled={loading}
                      />
                    </Field>
                    <Field label="City, State ZIP" hint="(if no URL)">
                      <input
                        type="text"
                        value={mCity}
                        onChange={(e) => setMCity(e.target.value)}
                        placeholder="Ellicott City, MD 21043"
                        className={inputCls}
                        disabled={loading}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="List price ($)*">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={mPrice}
                        onChange={(e) => setMPrice(e.target.value)}
                        placeholder="450,000"
                        className={inputCls}
                        disabled={loading}
                      />
                    </Field>
                    <Field label="Property type">
                      <select value={mType} onChange={(e) => setMType(e.target.value)} className={inputCls} disabled={loading}>
                        <option>Townhouse</option>
                        <option>Condo</option>
                        <option>Single Family</option>
                        <option>Multi Family</option>
                      </select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Beds*">
                      <input type="number" inputMode="numeric" min={0} max={20} step={1} value={mBeds} onChange={(e) => setMBeds(e.target.value)} placeholder="3" className={inputCls} disabled={loading} />
                    </Field>
                    <Field label="Baths">
                      <input type="number" inputMode="decimal" min={0} max={20} step={0.5} value={mBaths} onChange={(e) => setMBaths(e.target.value)} placeholder="2.5" className={inputCls} disabled={loading} />
                    </Field>
                    <Field label="Sqft">
                      <input type="number" inputMode="numeric" min={0} value={mSqft} onChange={(e) => setMSqft(e.target.value)} placeholder="1800" className={inputCls} disabled={loading} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Field label="HOA $/mo">
                      <input type="number" inputMode="numeric" min={0} value={mHoa} onChange={(e) => setMHoa(e.target.value)} placeholder="0" className={inputCls} disabled={loading} />
                    </Field>
                    <Field label="Tax $/yr">
                      <input type="number" inputMode="numeric" min={0} value={mTax} onChange={(e) => setMTax(e.target.value)} placeholder="4200" className={inputCls} disabled={loading} />
                    </Field>
                    <Field label="Year built">
                      <input type="number" inputMode="numeric" min={1800} max={2030} value={mYear} onChange={(e) => setMYear(e.target.value)} placeholder="2005" className={inputCls} disabled={loading} />
                    </Field>
                  </div>
                </form>
              )}

              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
              {success && <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2 mb-4">{success}</p>}
            </div>

            {/* Pinned footer */}
            <div className="px-5 pb-5 pt-2 shrink-0 border-t border-slate-100">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form={formId}
                  size="sm"
                  disabled={submitDisabled}
                  className="flex-1"
                >
                  {loading
                    ? <><Loader2 size={12} className="animate-spin mr-1.5" />Adding…</>
                    : 'Add listing'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
