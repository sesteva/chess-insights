import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { CastlingStats } from '../../utils/gameAnalysis'

interface Props {
  stats: CastlingStats
}

export function CastlingCard({ stats }: Props) {
  const pieData = [
    { name: 'Kingside (O-O)', value: stats.counts.kingside, winPct: stats.kingsideWinPct, color: '#60a5fa' },
    { name: 'Queenside (O-O-O)', value: stats.counts.queenside, winPct: stats.queensideWinPct, color: '#f59e0b' },
    { name: 'No Castling', value: stats.counts.none, winPct: stats.noCastleWinPct, color: '#6b7280' },
  ].filter((d) => d.value > 0)

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* Pie chart */}
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              formatter={(value: number, _name: string, props: { payload?: { winPct: number } }) => [
                `${value} games (${props.payload?.winPct ?? 0}% win)`,
                '',
              ]}
            />
            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>

        {/* Stats table */}
        <div className="space-y-3">
          {[
            { label: 'Kingside (O-O)', pct: stats.kingsidePct, winPct: stats.kingsideWinPct, count: stats.counts.kingside, color: 'text-blue-400' },
            { label: 'Queenside (O-O-O)', pct: stats.queensidePct, winPct: stats.queensideWinPct, count: stats.counts.queenside, color: 'text-yellow-400' },
            { label: 'No Castling', pct: stats.noCastlePct, winPct: stats.noCastleWinPct, count: stats.counts.none, color: 'text-gray-400' },
          ].map(({ label, pct, winPct, count, color }) => (
            <div key={label} className="flex items-center justify-between">
              <div>
                <p className={`font-medium text-sm ${color}`}>{label}</p>
                <p className="text-gray-500 text-xs">{count} games · {pct}% of total</p>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-semibold">{winPct}%</p>
                <p className="text-gray-500 text-xs">win rate</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
