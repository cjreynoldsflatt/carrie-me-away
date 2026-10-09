// Letter grades from investment scores, and the conservative → realistic grade pair
// used by the list filter pills and map pins.
export const GRADE_ORDER = ['A+', 'A', 'B+', 'B', 'C', 'D'] as const
export type Grade = (typeof GRADE_ORDER)[number]

export function scoreToGrade(score: number): Grade {
  if (score >= 97) return 'A+'
  if (score >= 88) return 'A'
  if (score >= 76) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}

export const GRADE_HEX: Record<Grade, string> = {
  'A+': '#047857', A: '#22c55e', 'B+': '#1d4ed8', B: '#60a5fa', C: '#f97316', D: '#dc2626',
}

/** Filter key for a listing's grade pair: "B→B+", or just "B" when both scenarios agree. */
export function gradePairKey(l: { investmentScore: number; realisticScore?: number }): string {
  const c = scoreToGrade(l.investmentScore)
  const r = scoreToGrade(l.realisticScore ?? l.investmentScore)
  return c === r ? c : `${c}→${r}`
}

/** Sort pair keys best-first: by conservative grade, then realistic grade. */
export function compareGradePairs(a: string, b: string): number {
  const [ac, ar = ac] = a.split('→') as Grade[]
  const [bc, br = bc] = b.split('→') as Grade[]
  return GRADE_ORDER.indexOf(ac) - GRADE_ORDER.indexOf(bc) || GRADE_ORDER.indexOf(ar) - GRADE_ORDER.indexOf(br)
}
