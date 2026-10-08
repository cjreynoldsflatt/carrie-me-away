/* eslint-disable @next/next/no-img-element -- ImageResponse (Satori) renders plain <img>, not next/image */
// GET /api/og/[id]/[key] — 1200×630 link-preview image for a shared listing (public, signed key).
import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { isValidShareKey } from '@/lib/share'
import { loadSharedListing } from '@/lib/shared-listing'
import { fmtPrice, fmtYield } from '@/lib/format'

const gradeOf = (s: number) => s >= 97 ? 'A+' : s >= 88 ? 'A' : s >= 76 ? 'B+' : s >= 60 ? 'B' : s >= 40 ? 'C' : 'D'
const gradeHex = (s: number) =>
  s >= 97 ? '#059669' : s >= 88 ? '#0891b2' : s >= 76 ? '#2563eb' : s >= 60 ? '#fb923c' : s >= 40 ? '#ea580c' : '#dc2626'

// The renderer's built-in font has no bold weights — load Inter (woff) from jsDelivr
const FONT_URL = (w: number) => `https://cdn.jsdelivr.net/npm/@fontsource/inter@5/files/inter-latin-${w}-normal.woff`
async function loadFonts() {
  const weights = [400, 600, 800] as const
  const data = await Promise.all(weights.map((w) => fetch(FONT_URL(w)).then((r) => r.arrayBuffer()).catch(() => null)))
  return weights.flatMap((weight, i) => data[i] ? [{ name: 'Inter', data: data[i]!, weight, style: 'normal' as const }] : [])
}

// Photos come from Redfin's CDN (often WebP, which the renderer can't draw) — re-encode as JPEG
async function photoDataUri(url: string | undefined): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const jpg = await sharp(Buffer.from(await res.arrayBuffer())).resize(560, 630, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer()
    return `data:image/jpeg;base64,${jpg.toString('base64')}`
  } catch {
    return null
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
  const { id, key } = await params
  if (!isValidShareKey(id, key)) return new Response('Not found', { status: 404 })
  const data = await loadSharedListing(id)
  if (!data) return new Response('Not found', { status: 404 })

  const { listing: l, summary } = data
  const { conservative: c, realistic: r } = summary
  const [photo, fonts] = await Promise.all([photoDataUri(l.photoUrl), loadFonts()])
  const logo = new URL('/cma-logo.png', req.url).toString()
  const specs = [`${l.beds} bd`, `${l.baths} ba`, l.sqft ? `${l.sqft.toLocaleString()} sqft` : null, l.propertyType].filter(Boolean).join('  ·  ')

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#ffffff', fontFamily: 'Inter' }}>
        {photo
          ? <img src={photo} width={560} height={630} style={{ objectFit: 'cover' }} alt="" />
          : <div style={{ width: 560, height: 630, background: '#e2e8f0', display: 'flex' }} />}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '48px 52px', color: '#0f172a' }}>
          <img src={logo} height={34} width={260} style={{ objectFit: 'contain', objectPosition: 'left' }} alt="" />
          <div style={{ fontSize: 76, fontWeight: 800, marginTop: 44, letterSpacing: -2 }}>{fmtPrice(l.price)}</div>
          <div style={{ fontSize: 32, fontWeight: 600, marginTop: 6 }}>{l.address}</div>
          <div style={{ fontSize: 26, color: '#64748b', marginTop: 4 }}>{l.city}</div>
          <div style={{ fontSize: 24, color: '#475569', marginTop: 18 }}>{specs}</div>
          <div style={{ display: 'flex', marginTop: 'auto', gap: 14 }}>
            {[
              { label: 'Est. rent', value: `$${summary.consRent.toLocaleString()}/mo` },
              { label: 'Net yield', value: `${fmtYield(c.netCashYield).replace('%', '')}–${fmtYield(r.netCashYield)}` },
            ].map((s) => (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column', background: '#f1f5f9', borderRadius: 16, padding: '14px 18px' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, whiteSpace: 'nowrap' }}>{s.value}</div>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: '0 20px', color: '#fff', fontSize: 30, fontWeight: 800, whiteSpace: 'nowrap', backgroundImage: `linear-gradient(90deg, ${gradeHex(c.investmentScore)}, ${gradeHex(r.investmentScore)})` }}>
              {gradeOf(c.investmentScore) === gradeOf(r.investmentScore) ? gradeOf(c.investmentScore) : `${gradeOf(c.investmentScore)} → ${gradeOf(r.investmentScore)}`}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts, headers: { 'Cache-Control': 'public, max-age=3600' } },
  )
}
