'use client'

// App-wide navigation menu (replaces the old home page of nav cards).
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Map, FileText, Heart, Share2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/finder', label: 'Property Finder', icon: Map, tint: 'bg-sky-50 text-sky-500' },
  { href: '/documents', label: 'Documents', icon: FileText, tint: 'bg-emerald-50 text-emerald-500' },
  { href: '/about', label: 'About Us', icon: Heart, tint: 'bg-rose-50 text-rose-500' },
]

export default function AppMenu() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0 print:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 -ml-1.5 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu size={19} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-60 bg-white rounded-xl border border-slate-200 shadow-lg p-2 z-[2000]">
          <div className="px-2 pt-1 pb-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- static logo, same as share page */}
            <img src="/cma-logo.png" alt="CMA Investments" className="h-5 w-auto" />
          </div>
          {ITEMS.map(({ href, label, icon: Icon, tint }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors',
                  active ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', tint)}>
                  <Icon size={15} />
                </span>
                {label}
              </Link>
            )
          })}
          <div className="md:hidden">
          <div className="my-1.5 border-t border-slate-100" />
          {/* Phones only — on desktop it sits in the header next to Bookmarklet. Public, view-only version of the finder for realtors (no CMA-I details, no editing) */}
          <button
            onClick={async () => {
              const { path } = await fetch('/api/realtor-link').then((r) => r.json())
              await navigator.clipboard.writeText(`${window.location.origin}${path}`)
              setCopied(true)
              setTimeout(() => { setCopied(false); setOpen(false) }, 1200)
            }}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-50 text-violet-500">
              {copied ? <Check size={15} /> : <Share2 size={15} />}
            </span>
            {copied ? 'Copied realtor link' : 'Copy realtor link'}
          </button>
          </div>
        </div>
      )}
    </div>
  )
}
