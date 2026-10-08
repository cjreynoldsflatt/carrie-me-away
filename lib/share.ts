// Signed public share links for a single listing (server only).
// The key is an HMAC of the listing ID, so a link opens only that listing and
// can't be forged or guessed from another listing's ID.
import { createHmac, timingSafeEqual } from 'crypto'

export function shareKey(listingId: string): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return createHmac('sha256', `share:${secret}`).update(listingId).digest('base64url').slice(0, 22)
}

export function isValidShareKey(listingId: string, key: string): boolean {
  const expected = Buffer.from(shareKey(listingId))
  const given = Buffer.from(key)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

// The read-only Realtor Version of the whole finder uses one key, derived like a listing key
// but from a reserved scope so it can never collide with a listing ID.
const REALTOR_SCOPE = '__realtor_view__'
export const realtorKey = () => shareKey(REALTOR_SCOPE)
export const isValidRealtorKey = (key: string) => isValidShareKey(REALTOR_SCOPE, key)
