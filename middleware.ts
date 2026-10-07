import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow the login page, auth API, bookmarklet ingestion endpoints, and signed realtor
  // share pages (the key in the URL is checked by /api/share) through without a cookie check
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/share/') ||
    pathname === '/cma-logo.png' ||   // shown on public share pages
    pathname.startsWith('/api/share/') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/add-listing') ||
    pathname.startsWith('/api/add-rentals')
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('cma-auth')?.value
  if (!process.env.AUTH_SECRET || token !== process.env.AUTH_SECRET) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Run on all routes except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
