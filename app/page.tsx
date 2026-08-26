import Link from 'next/link'
import { Map, FileText, Heart, ChevronRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-xl flex flex-col items-center">
        {/* Logo */}
        <img
          src="/cma-logo.png"
          alt="Carrie Me Away"
          className="h-9 w-auto mb-14"
        />

        {/* Nav cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          <Link
            href="/finder"
            className="group flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100 transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center">
              <Map size={24} className="text-sky-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-slate-900 text-lg font-bold mb-2">Property Finder</h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                Browse, filter, and analyze investment properties on an interactive map.
              </p>
            </div>
          </Link>

          <Link
            href="/documents"
            className="group flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FileText size={24} className="text-emerald-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-slate-900 text-lg font-bold mb-2">Documents</h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                Store and access important files, contracts, and reference materials.
              </p>
            </div>
          </Link>

          <Link
            href="/about"
            className="group flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 hover:border-rose-300 hover:shadow-lg hover:shadow-rose-100 transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center">
              <Heart size={24} className="text-rose-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-slate-900 text-lg font-bold mb-2">About Us</h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                Meet the mother-son team behind Carrie Me Away.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
