import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PREVIEW_BOT = /facebookexternalhit|Facebot|Twitterbot|Slackbot|LinkedInBot|WhatsApp|Discordbot|TelegramBot|Applebot|SkypeUriPreview|Iframely|Embedly|Pinterest|redditbot|Mattermost|Google-PageRenderer|bingbot|Googlebot/i

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow the login page, auth API, bookmarklet ingestion endpoints, and signed realtor
  // share pages (the key in the URL is checked by /api/share) through without a cookie check
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/share/') ||
    pathname.startsWith('/realtor/') ||        // read-only Realtor Version (key checked by the page + API)
    pathname.startsWith('/api/realtor/') ||
    pathname === '/cma-logo.png' ||   // shown on public share pages
    pathname === '/bm.js' ||          // live bookmarklet program (loaded from redfin.com)
    pathname === '/icon.png' || pathname === '/apple-icon.png' ||   // favicons
    pathname.startsWith('/api/share/') ||
    pathname.startsWith('/api/og/') ||          // link-preview images (signed key)
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/add-listing') ||
    pathname.startsWith('/api/add-rentals') ||
    pathname.startsWith('/api/enrich-listing')
  ) {
    return NextResponse.next()
  }

  // Link-preview bots (iMessage, Slack, etc.) may fetch a signed in-app link to read its
  // preview tags. The page shell holds no data — listings still come from the login-only API.
  if (
    pathname === '/finder' &&
    request.nextUrl.searchParams.has('k') &&
    PREVIEW_BOT.test(request.headers.get('user-agent') ?? '')
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
