'use client'

// Copies the public, view-only Realtor Version link (no CMA-I details, no editing)
import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'

export default function RealtorLinkButton() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        const { path } = await fetch('/api/realtor-link').then((r) => r.json())
        await navigator.clipboard.writeText(`${window.location.origin}${path}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="h-7 px-2.5 text-xs font-medium rounded-md border border-slate-200 text-slate-800 hover:text-slate-900 hover:border-slate-300 flex items-center gap-1.5 transition-colors"
    >
      {copied ? <Check size={13} className="text-emerald-600" /> : <Share2 size={13} />}
      {copied ? 'Copied' : 'Share with realtor'}
    </button>
  )
}
