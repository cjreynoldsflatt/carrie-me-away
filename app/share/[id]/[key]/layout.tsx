import type { Metadata } from 'next'

// Title for public share links
export const metadata: Metadata = {
  title: 'Property Analysis · CMA Investments',
  robots: { index: false, follow: false },
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children
}
