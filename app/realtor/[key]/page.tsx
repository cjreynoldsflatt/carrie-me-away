import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidRealtorKey, shareKey } from '@/lib/share'
import { listingShareMetadata } from '@/lib/share-meta'
import FinderClient from '@/app/finder/FinderClient'

type Props = {
  params: Promise<{ key: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Listing-specific preview (title, image) when the link opens on a property via ?id=
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const base: Metadata = {
    title: 'Listings · CMA Investments (Realtor Version)',
    description: 'Investment analysis for properties under consideration — view only.',
    robots: { index: false, follow: false },
  }
  const [{ key }, { id }] = await Promise.all([params, searchParams])
  if (!isValidRealtorKey(key) || typeof id !== 'string') return base
  const meta = await listingShareMetadata(id, shareKey(id))
  return meta ? { ...base, ...meta, robots: base.robots } : base
}

// Read-only Realtor Version of the Property Finder (public, signed key; no CMA-I details)
export default async function RealtorPage({ params }: Props) {
  const { key } = await params
  if (!isValidRealtorKey(key)) notFound()
  return <FinderClient realtorKey={key} />
}
