import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { GameResultCounts } from '../../utils/gameAnalysis'

interface Props {
  phaseStats: Record<'opening' | 'middlegame' | 'endgame', GameResultCounts>
}

export function GamePhaseChart({ phaseStats }: Props) {
  const data = [
    {
      phase: 'Opening',
      Wins: phaseStats.opening.wins,
      Draws: phaseStats.opening.draws,
      Losses: phaseStats.opening.losses,
      total: phaseStats.opening.total,
    },
    {
      phase: 'Middlegame',
      Wins: phaseStats.middlegame.wins,
      Draws: phaseStats.middlegame.draws,
      Losses: phaseStats.middlegame.losses,
      total: phaseStats.middlegame.total,
    },
    {
      phase: 'Endgame',
      Wins: phaseStats.endgame.wins,
      Draws: phaseStats.endgame.draws,
      Losses: phaseStats.endgame.losses,
      total: phaseStats.endgame.total,
    },
  ]

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="grid grid-cols-3 gap-4 mb-4">
        {data.map((d) => (
          <div key={d.phase} className="text-center">
            <p className="text-gray-400 text-sm">{d.phase}</p>
            <p className="text-white font-semibold">{d.total} games</p>
            <p className="text-green-400 text-sm">
              {d.total > 0 ? Math.round((d.Wins / d.total) * 100) : 0}% win rate
            </p>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis dataKey="phase" tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
          />
          <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
          <Bar dataKey="Wins" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Draws" stackId="a" fill="#eab308" />
          <Bar dataKey="Losses" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
