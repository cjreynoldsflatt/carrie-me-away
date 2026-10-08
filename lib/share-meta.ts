// Link-preview metadata (Open Graph / Twitter card) for a shared listing.
// Used by the public share page and by signed internal /finder?id=…&k=… links.
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { isValidShareKey } from './share'
import { loadSharedListing } from './shared-listing'
import { fmtPrice, fmtYield } from './format'

export async function listingShareMetadata(id: string, key: string | undefined): Promise<Metadata | null> {
  if (!key || !isValidShareKey(id, key)) return null
  const data = await loadSharedListing(id)
  if (!data) return null

  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3001'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')

  const { listing: l, summary } = data
  const title = `${fmtPrice(l.price)} · ${l.address}, ${l.city}`
  const description = [
    `${l.beds} bd · ${l.baths} ba${l.sqft ? ` · ${l.sqft.toLocaleString()} sqft` : ''} ${l.propertyType.toLowerCase()}`,
    `Est. rent $${summary.consRent.toLocaleString()}/mo`,
    `Net yield ${fmtYield(summary.conservative.netCashYield)}–${fmtYield(summary.realistic.netCashYield)}`,
  ].join(' · ')
  const image = { url: `/api/og/${encodeURIComponent(id)}/${key}`, width: 1200, height: 630, alt: title }

  return {
    metadataBase: new URL(`${proto}://${host}`),
    title,
    description,
    openGraph: { title, description, images: [image], siteName: 'CMA Investments', type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  }
}
