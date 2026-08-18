'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { fmtTimeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function RefreshButton() {
  const refresh = useAppStore((s) => s.refresh)
  const isRefreshing = useAppStore((s) => s.isRefreshing)
  const lastRefreshed = useAppStore((s) => s.lastRefreshed)
  const refreshError = useAppStore((s) => s.refreshError)

  const label = isRefreshing
    ? 'Refreshing…'
    : lastRefreshed
    ? `Refresh · ${fmtTimeAgo(lastRefreshed)}`
    : 'Refresh'

  return (
    <div className="flex flex-col items-start gap-0.5 shrink-0">
      <Button
        size="sm"
        variant="outline"
        onClick={refresh}
        disabled={isRefreshing}
        className="h-7 text-xs gap-1.5"
      >
        <RefreshCw size={12} className={cn(isRefreshing && 'animate-spin')} />
        {label}
      </Button>
      {refreshError && (
        <span className="text-[10px] text-amber-600 leading-none">{refreshError}</span>
      )}
    </div>
  )
}
