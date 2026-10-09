'use client'

// Public realtor view of one listing — the detail page without CMA-I sections, no login.
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PropertyDetail from '@/components/PropertyDetail'
import { useAppStore } from '@/lib/store'

export default function SharePage() {
  const { id, key } = useParams<{ id: string; key: string }>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    fetch(`/api/share/${encodeURIComponent(decodeURIComponent(id))}/${key}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        // Load just this listing into the store the detail page reads from
        useAppStore.setState({
          saleListings: [data.listing],
          rentalListings: data.rentalListings,
          assumptions: data.assumptions,
          selectedId: data.listing.id,
        })
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [id, key])

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">Loading…</div>
  }
  if (status !== 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full p-8 text-center space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- matches the home page logo */}
          <img src="/cma-logo.png" alt="CMA Investments" className="h-6 w-auto mx-auto" />
          <div className="space-y-1.5">
            <h1 className="text-base font-semibold text-slate-900">This listing is no longer available</h1>
            <p className="text-sm text-slate-500 leading-relaxed">It may have sold, gone off the market, or been removed from our list. Ask whoever sent the link for an updated one.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col bg-slate-50">
      <header className="shrink-0 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-5 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- matches the home page logo */}
          <img src="/cma-logo.png" alt="CMA Investments" className="h-6 w-auto" />
        </div>
      </header>
      <div className="flex-1 min-h-0 w-full max-w-2xl mx-auto flex flex-col">
        <PropertyDetail shareMode />
      </div>
    </div>
  )
}
