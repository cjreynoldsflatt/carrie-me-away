import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidRealtorKey } from '@/lib/share'
import FinderClient from '@/app/finder/FinderClient'

export const metadata: Metadata = {
  title: 'Listings · CMA Investments (Realtor Version)',
  description: 'Investment analysis for properties under consideration — view only.',
  robots: { index: false, follow: false },
}

// Read-only Realtor Version of the Property Finder (public, signed key; no CMA-I details)
export default async function RealtorPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  if (!isValidRealtorKey(key)) notFound()
  return <FinderClient realtorKey={key} />
}
