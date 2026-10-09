'use client'

// Outside links for a listing — one component so the card and the detail panel show the same
// links, in the same order, at the same size.
import type { ReactNode } from 'react'
import { Building2, ExternalLink, MapPin, ShieldAlert } from 'lucide-react'
import { crimeGradeUrl, crimeMapUrl, hoaSearchUrl } from '@/lib/links'
import type { SaleListing } from '@/lib/types'

export const linkClass = 'inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-40'

interface Props {
  listing: Pick<SaleListing, 'listingUrl' | 'address' | 'city' | 'lat' | 'lng' | 'hoaMonthly' | 'community'>
  children?: ReactNode   // extra actions at the end (e.g. Fix location)
}

export default function ListingLinks({ listing, children }: Props) {
  const crimeGrade = crimeGradeUrl(listing.city)
  const links: { href: string; icon: ReactNode; label: string; title?: string }[] = [
    ...(listing.listingUrl ? [{
      href: listing.listingUrl,
      icon: <ExternalLink size={14} />,
      label: listing.listingUrl.includes('redfin.com') ? 'Redfin' : 'Realtor.com',
    }] : []),
    {
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.address}, ${listing.city}`)}`,
      icon: <MapPin size={14} />,
      label: 'Google Maps',
    },
    ...(crimeGrade ? [{
      href: crimeGrade,
      icon: <ShieldAlert size={14} />,
      label: 'Crime grade',
      title: 'CrimeGrade: green-to-red crime heat map for this ZIP',
    }] : []),
    {
      href: crimeMapUrl(listing.lat, listing.lng),
      icon: <MapPin size={14} />,
      label: 'Nearby incidents',
      title: 'SpotCrime: recent incidents around this exact address',
    },
    ...(listing.hoaMonthly > 0 ? [{
      href: hoaSearchUrl(listing),
      icon: <Building2 size={14} />,
      label: 'Find HOA',
      title: listing.community ? `Search for the ${listing.community} HOA website` : 'Search for this property’s HOA website',
    }] : []),
  ]

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1" onClick={(e) => e.stopPropagation()}>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" title={l.title} className={linkClass}>
          {l.icon}
          {l.label}
        </a>
      ))}
      {children}
    </div>
  )
}
