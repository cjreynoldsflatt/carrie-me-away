'use client'

// Where the annual expenses go — donut + legend at the top of the Annual Expenses card.
// Colors follow the category (fixed order), never its size, so a slice keeps its color
// when the numbers change; small items fold into "Other".
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { fmtCurrency } from '@/lib/format'

export interface ExpenseSlice { key: string; label: string; value: number }

const COLORS: Record<string, string> = {
  tax: '#2a78d6',          // blue
  maintenance: '#eb6834',  // orange
  capex: '#1baf7a',        // aqua
  vacancy: '#eda100',      // yellow
  management: '#e87ba4',   // magenta
  insurance: '#008300',    // green
  hoa: '#4a3aa7',          // violet
  other: '#94a3b8',        // neutral gray for the catch-all
}

export default function ExpenseDonut({ slices }: { slices: ExpenseSlice[] }) {
  const data = slices.filter((s) => s.value > 0)
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total <= 0) return null

  return (
    <div className="flex items-center gap-4 pb-3 mb-2 border-b border-slate-100">
      <div className="relative shrink-0" style={{ width: 128, height: 128 }}>
          <PieChart width={128} height={128} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={62}
              startAngle={90}
              endAngle={-270}
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d) => <Cell key={d.key} fill={COLORS[d.key] ?? COLORS.other} />)}
            </Pie>
            <Tooltip
              formatter={(v) => [`${fmtCurrency(Number(v))}/yr · ${Math.round((Number(v) / total) * 100)}%`, '']}
              separator=""
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', padding: '4px 8px' }}
              itemStyle={{ color: '#334155' }}
            />
          </PieChart>
        {/* Total in the hole */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Total</div>
          <div className="text-sm font-bold text-slate-800 tabular-nums">{fmtCurrency(total)}</div>
          <div className="text-[10px] text-slate-400">per year</div>
        </div>
      </div>
      <ul className="flex-1 min-w-0 space-y-0.5 text-xs">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[d.key] ?? COLORS.other }} />
            <span className="text-slate-600 truncate">{d.label}</span>
            <span className="ml-auto text-slate-700 tabular-nums">{fmtCurrency(d.value)}</span>
            <span className="w-8 text-right text-slate-400 tabular-nums">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
