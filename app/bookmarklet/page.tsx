'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { buildBookmarkletLink } from '@/lib/bookmarklet'

export default function BookmarkletPage() {
  const [copied, setCopied] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const bookmarkletJs = buildBookmarkletLink(baseUrl)

  function copyCode() {
    navigator.clipboard.writeText(bookmarkletJs)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-xl w-full p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bookmarklet</h1>
          <p className="text-sm text-slate-500 mt-1">
            One-click add from any Redfin or Realtor.com listing page — or every result on a Redfin search page. On a Redfin rentals search, it saves the rentals as rent comps.
          </p>
        </div>

        {/* Copy button */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Step 1 — Copy the bookmarklet code</p>
          <div className="relative">
            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 pr-10 overflow-x-auto text-[11px] text-slate-600 whitespace-pre-wrap break-all leading-relaxed max-h-28">
              {bookmarkletJs}
            </pre>
            <button
              onClick={copyCode}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-700 transition-colors"
              title="Copy"
            >
              {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
            </button>
          </div>
          <button
            onClick={copyCode}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy bookmarklet code</>}
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Step 2 — Create a bookmark manually</p>
          <ol className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Show your bookmarks bar if hidden: <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">Ctrl+Shift+B</kbd> (Win) / <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">⌘+Shift+B</kbd> (Mac)</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>Right-click the bookmarks bar → <strong>Add page…</strong> or <strong>Add bookmark</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Set the <strong>Name</strong> to <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">+ Carrie Me Away</span> and paste the copied code into the <strong>URL</strong> field</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
              <span>On any Redfin or Realtor.com listing, click the bookmark — a notification confirms the listing was saved. On a Redfin search page, it adds every listing shown (already-saved ones are left untouched).</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">5</span>
              <span>For better rent estimates: on Redfin, search <strong>For rent</strong>, filter to one property type (e.g. Townhouse), and click the bookmark. Those rentals become comps — listings with 3+ same-bed comps nearby use them instead of HUD.</span>
            </li>
          </ol>
        </div>

        <a href="/" className="block text-center text-xs text-blue-500 hover:text-blue-700">
          ← Back to app
        </a>
      </div>
    </div>
  )
}
