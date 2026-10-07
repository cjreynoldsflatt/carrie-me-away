import type { Metadata } from 'next'

// Neutral title for public share links (the root layout's title names CMA Investments)
export const metadata: Metadata = {
  title: 'Property Analysis',
  robots: { index: false, follow: false },
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children
}
