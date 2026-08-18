export function fmtPrice(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `$${Math.round(n / 1000)}K`
  return `$${n}`
}

export function fmtRent(n: number): string {
  return `$${n.toLocaleString()}/mo`
}

export function fmtYield(n: number): string {
  return `${(n * 100).toFixed(2)}%`
}

export function fmtCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

export function fmtPayback(years: number): string {
  if (!isFinite(years) || years <= 0) return '—'
  return `${years.toFixed(1)} yrs`
}

export function fmtDom(days: number): string {
  return days === 1 ? '1 day' : `${days} days`
}

export function fmtTimeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
