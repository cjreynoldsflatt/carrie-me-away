import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About — Carrie Me Away',
  description: 'Mother-son real estate investors looking for condos, townhomes, and multifamily properties to invest in, care for, and pass on.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-4">
        <Link href="/" className="shrink-0">
          <img src="/cma-logo.png" alt="Carrie Me Away" className="h-7 w-auto" />
        </Link>
        <Link
          href="/"
          className="ml-auto flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to app
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-14 space-y-12">

        {/* Photo */}
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-md bg-slate-100">
          <Image
            src="/team.png"
            alt="Carrie and her son"
            fill
            className="object-cover object-top"
            sizes="(max-width: 768px) 100vw, 672px"
            priority
          />
        </div>

        {/* Story */}
        <div className="space-y-8">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Founded 2026</p>
            <h1 className="text-3xl font-bold text-slate-900 leading-snug">
              Two generations.<br />One shared eye for opportunity.
            </h1>
          </div>

          <div className="space-y-5 text-slate-600 leading-relaxed">
            <p>
              CMA was founded by mother-son duo Carrie Reynolds-Flatt and her son, bringing together two generations and a shared excitement for finding potential in unexpected places.
            </p>

            <p>
              Carrie has been investing in real estate for more than 40 years, with experience in properties big and small. She has an eye for opportunity, a generous spirit, and decades of wisdom that can only come from actually doing it. She also really likes beige. Her color palette may be neutral, but her heart is pure gold.
            </p>

            <p>
              Her son grew up watching and learning from her. He brings a design-minded perspective, plenty of curiosity, and 37 years of being lovingly molded by his mom&rsquo;s wisdom, optimism, and eye for a good opportunity.
            </p>

            <p>
              Together, they&rsquo;re looking for condos, townhomes, and multifamily properties they can invest in, care for, and pass on to the next generation.
            </p>
          </div>

          <p className="text-slate-500 italic border-l-2 border-slate-200 pl-4">
            Two generations, one family, and hopefully a few really good properties along the way.
          </p>
        </div>

        {/* Back CTA */}
        <div className="pt-4 border-t border-slate-200">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to the property finder
          </Link>
        </div>
      </main>
    </div>
  )
}
