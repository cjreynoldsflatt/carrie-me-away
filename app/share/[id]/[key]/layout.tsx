import type { Metadata } from 'next'
import { listingShareMetadata } from '@/lib/share-meta'

// Title + link-preview image for public share links
export async function generateMetadata({ params }: { params: Promise<{ id: string; key: string }> }): Promise<Metadata> {
  const { id, key } = await params
  const meta = await listingShareMetadata(decodeURIComponent(id), key)
  return {
    title: 'Property Analysis · CMA Investments',
    ...meta,
    robots: { index: false, follow: false },
  }
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children
}
