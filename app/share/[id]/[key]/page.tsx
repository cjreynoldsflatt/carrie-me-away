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

  if (status !== 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        {status === 'loading' ? 'Loading…' : 'This link is invalid or the listing is no longer available.'}
      </div>
    )
  }

  return (
    <div className="h-screen bg-slate-50">
      <div className="h-full max-w-2xl mx-auto">
        <PropertyDetail shareMode />
      </div>
    </div>
  )
}
