'use client'

// Pull-to-refresh for a scrolling panel. The app shell fills the screen (h-dvh) and scrolls inside
// panels, so the browser's own pull-to-refresh never fires — this adds it back on touch screens.
// Renders the scroll container itself; desktop (no touch) is unaffected.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const THRESHOLD = 70   // px of (damped) pull needed to refresh
const MAX_PULL = 110

export default function PullToRefresh({ onRefresh, className, children }: {
  onRefresh: () => Promise<unknown>
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const start = useRef<number | null>(null)
  const pullRef = useRef(0)
  const busy = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onStart = (e: TouchEvent) => {
      start.current = el.scrollTop <= 0 && !busy.current ? e.touches[0].clientY : null
    }
    const onMove = (e: TouchEvent) => {
      if (start.current == null) return
      const dy = e.touches[0].clientY - start.current
      if (dy <= 0 || el.scrollTop > 0) { pullRef.current = 0; setPull(0); return }
      e.preventDefault()   // we're handling this drag — don't rubber-band the panel
      setDragging(true)
      const d = Math.min(MAX_PULL, dy * 0.5)
      pullRef.current = d
      setPull(d)
    }
    const onEnd = async () => {
      if (start.current == null) return
      start.current = null
      setDragging(false)
      if (pullRef.current < THRESHOLD) { pullRef.current = 0; setPull(0); return }
      busy.current = true
      setRefreshing(true)
      setPull(THRESHOLD * 0.7)
      try {
        await Promise.all([onRefresh(), new Promise((r) => setTimeout(r, 500))])
      } finally {
        busy.current = false
        pullRef.current = 0
        setRefreshing(false)
        setPull(0)
      }
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [onRefresh])

  const ready = pull >= THRESHOLD
  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Indicator — sits in the gap the pull opens above the content */}
      <div
        className="flex items-end justify-center overflow-hidden text-slate-400"
        style={{ height: pull, transition: dragging ? 'none' : 'height 200ms ease' }}
        aria-hidden={!refreshing}
      >
        <div className="pb-2 flex items-center gap-1.5 text-xs font-medium">
          {refreshing
            ? <><Loader2 size={15} className="animate-spin" />Refreshing…</>
            : <><ArrowDown size={15} className={cn('transition-transform', ready && 'rotate-180')} />{ready ? 'Release to refresh' : 'Pull to refresh'}</>}
        </div>
      </div>
      {children}
    </div>
  )
}
