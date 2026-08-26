'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, FileText, Search, X, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Document } from '@/lib/documents'
// ─── Markdown renderer ────────────────────────────────────────────────────────

const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-slate-900 mt-10 mb-4 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mt-6 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-slate-700 text-sm leading-relaxed mb-4">{children}</p>
  ),
  ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-slate-700 text-sm leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
  hr: () => <hr className="border-slate-200 my-8" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-slate-200 pl-4 italic text-slate-600 my-4 text-sm">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-x-auto mb-4 [font-family:monospace] text-xs leading-relaxed text-slate-800 whitespace-pre">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className) || String(children).includes('\n')
    if (isBlock) return <code className="[font-family:monospace] text-xs whitespace-pre">{children}</code>
    return (
      <code className="[font-family:monospace] text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
        {children}
      </code>
    )
  },
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left font-semibold text-slate-700 border border-slate-200 px-3 py-2 bg-slate-50 text-xs">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="text-slate-700 border border-slate-200 px-3 py-2 text-sm">{children}</td>
  ),
}

// ─── Search helpers ───────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

function getSnippets(content: string, query: string): string[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('```') && l.toLowerCase().includes(q))
    .slice(0, 5)
    .map((l) => l.replace(/^[*\-\d.]+\s*/, ''))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentsClient({ documents }: { documents: Document[] }) {
  const [selectedSlug, setSelectedSlug] = useState(documents[0]?.slug ?? '')
  const [query, setQuery] = useState('')
  const [focusText, setFocusText] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  const isSearching = query.trim().length > 0

  const filteredDocs = useMemo(() => {
    if (!isSearching) return documents
    const q = query.toLowerCase()
    return documents.filter(
      (d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
    )
  }, [query, isSearching])

  const doc = documents.find((d) => d.slug === selectedSlug) ?? documents[0]

  // After navigating to a doc via snippet click, scroll to the matching text
  useEffect(() => {
    if (!focusText) return
    const timer = setTimeout(() => {
      const container = contentRef.current
      if (!container) return
      // Normalize: strip pipes (table syntax), collapse whitespace
      const norm = (s: string) =>
        s.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
      const q = norm(focusText)
      if (!q) return
      const blocks = container.querySelectorAll('p, li, td, pre, h1, h2, h3, h4, h5, h6')
      for (const el of Array.from(blocks)) {
        if (norm(el.textContent ?? '').includes(q)) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          break
        }
      }
      setFocusText('')
    }, 400)
    return () => clearTimeout(timer)
  }, [focusText, selectedSlug])

  const handleSelect = (slug: string) => {
    setSelectedSlug(slug)
    setQuery('')
  }

  const handleSnippetClick = (slug: string, snippet: string) => {
    setSelectedSlug(slug)
    setFocusText(snippet)
    setQuery('')
  }

  return (
    <div className="h-screen flex flex-col print:h-auto print:overflow-visible">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-5 py-3 flex flex-wrap items-center gap-3 shrink-0 print:hidden">
        <Link href="/" className="text-slate-400 hover:text-slate-700 transition-colors shrink-0">
          <ChevronLeft size={20} />
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
            <FileText size={15} className="text-emerald-500" />
          </div>
          <span className="text-lg font-bold text-slate-900">Documents</span>
        </div>

        {/* Search — full width on mobile, constrained on desktop */}
        <div className="relative w-full md:flex-1 md:max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search all documents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>


      </header>

      {/* ── Mobile picklist ── */}
      <div className="md:hidden border-b border-slate-200 bg-white px-4 py-2 print:hidden">
        <select
          value={selectedSlug}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
        >
          {documents.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.title}
            </option>
          ))}
        </select>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden print:overflow-visible print:block">

        {/* Sidebar — desktop only */}
        <aside className="hidden md:flex w-56 shrink-0 border-r border-slate-200 bg-white flex-col print:hidden">
          <nav className="flex-1 overflow-y-auto p-2 pt-3">
            {filteredDocs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No matches</p>
            ) : (
              filteredDocs.map((d) => (
                <button
                  key={d.slug}
                  onClick={() => handleSelect(d.slug)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors leading-snug ${
                    d.slug === selectedSlug && !isSearching
                      ? 'bg-emerald-50 text-emerald-800 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {d.title}
                </button>
              ))
            )}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-white print:overflow-visible">
          {isSearching ? (
            /* ── Search results ── */
            <div className="max-w-3xl mx-auto px-8 py-10">
              <p className="text-xs text-slate-400 mb-6">
                {filteredDocs.length === 0
                  ? 'No results'
                  : `${filteredDocs.length} document${filteredDocs.length !== 1 ? 's' : ''} matching "${query}"`}
              </p>
              <div className="space-y-4">
                {filteredDocs.map((d) => {
                  const snippets = getSnippets(d.content, query)
                  return (
                    <div key={d.slug} className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => handleSelect(d.slug)}
                        className="w-full text-left px-5 py-3.5 bg-slate-50 hover:bg-emerald-50 transition-colors flex items-center justify-between gap-3 group"
                      >
                        <span className="text-sm font-semibold text-slate-800 group-hover:text-emerald-800 transition-colors">
                          {d.title}
                        </span>
                        <ChevronRight size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0" />
                      </button>
                      {snippets.length > 0 && (
                        <div className="divide-y divide-slate-100">
                          {snippets.map((snippet, i) => (
                            <button
                              key={i}
                              onClick={() => handleSnippetClick(d.slug, snippet)}
                              className="w-full text-left px-5 py-3 text-xs text-slate-600 leading-relaxed hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                            >
                              <Highlight text={snippet} query={query} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : doc ? (
            /* ── Document view ── */
            <div ref={contentRef} className="max-w-3xl mx-auto px-8 py-10">
              <p className="text-xs text-slate-400 mb-8">Last updated {doc.updatedAt}</p>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {doc.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400 text-sm">Select a document</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
