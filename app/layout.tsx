import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'CMA Investments',
  description: 'CMA Investments property analysis and finder',
}

// White browser chrome tint (Safari colors its toolbar area from this; it was picking up
// the light-gray page background) — every page header is white
export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full bg-white`}>
      <body className="h-full antialiased bg-slate-50">
        <TooltipProvider delay={300}>{children}</TooltipProvider>
      </body>
    </html>
  )
}
