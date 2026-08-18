'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'

export default function AddListingModal() {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [units, setUnits] = useState(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const urlRef = useRef<HTMLInputElement>(null)
  const initialize = useAppStore((s) => s.initialize)

  useEffect(() => {
    if (open) setTimeout(() => urlRef.current?.focus(), 50)
    else { setUrl(''); setText(''); setPropertyType(''); setUnits(2); setError(null); setSuccess(null) }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setSuccess(null)
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
        setSuccess(
          `Added: ${p.address ?? '(no address)'} · $${p.price?.toLocaleString() ?? '0'} · ${p.beds}bd/${p.baths}ba · ${data.listing?.propertyType}`
        )
        setUrl('')
        setText('')
        await initialize()
        setTimeout(() => setOpen(false), 2000)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Add listing</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">
                  Listing URL
                </label>
                <input
                  ref={urlRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.redfin.com/... or https://www.realtor.com/..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>

              {/* Property type override */}
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-slate-500 block">Property type</label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    disabled={loading}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Auto-detect</option>
                    <option>Townhouse</option>
                    <option>Condo</option>
                    <option>Single Family</option>
                    <option>Multi Family</option>
                  </select>
                </div>
                {propertyType === 'Multi Family' && (
                  <div className="w-28 space-y-1">
                    <label className="text-xs font-medium text-slate-500 block">Units</label>
                    <input
                      type="number"
                      min={2}
                      max={50}
                      value={units}
                      onChange={(e) => setUnits(Math.max(2, Number(e.target.value)))}
                      disabled={loading}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">
                  Paste listing page text
                  <span className="font-normal ml-1 text-slate-400">(Ctrl+A → Ctrl+C from the page — needed for price, beds, baths)</span>
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the full page text here…"
                  rows={8}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                  disabled={loading}
                />
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              {success && <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">{success}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading || !text.trim()}>
                  {loading
                    ? <><Loader2 size={12} className="animate-spin mr-1.5" />Parsing…</>
                    : 'Add listing'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
