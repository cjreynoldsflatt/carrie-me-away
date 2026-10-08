import type { Metadata } from 'next'
import { listingShareMetadata } from '@/lib/share-meta'
import FinderClient from './FinderClient'

// Copied in-app links (/finder?id=…&k=…) get a link preview; the page itself still needs login
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
  const { id, k } = await searchParams
  if (typeof id !== 'string' || typeof k !== 'string') return {}
  return (await listingShareMetadata(id, k)) ?? {}
}

export default function FinderPage() {
  return <FinderClient />
}
