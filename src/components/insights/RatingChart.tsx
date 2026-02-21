import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { RatingPoint } from '../../utils/gameAnalysis'

interface Props {
  history: RatingPoint[]
}

const GAME_TYPE_COLORS: Record<string, string> = {
  rapid: '#60a5fa',   // blue
  blitz: '#f59e0b',   // amber
  bullet: '#f87171',  // red
  daily: '#34d399',   // green
}

const GAME_TYPE_LABELS: Record<string, string> = {
  rapid: 'Rapid',
  blitz: 'Blitz',
  bullet: 'Bullet',
  daily: 'Daily',
}

/** Downsample a series to at most maxPoints by taking evenly-spaced samples */
function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr
  const step = arr.length / maxPoints
  return Array.from({ length: maxPoints }, (_, i) => arr[Math.floor(i * step)])
}

export function RatingChart({ history }: Props) {
  const gameTypes = [...new Set(history.map((p) => p.gameType))]
  const [selected, setSelected] = useState<string>(gameTypes[0] ?? 'rapid')

  const filtered = history.filter((p) => p.gameType === selected)
  const sampled = downsample(filtered, 200)

  const data = sampled.map((p) => ({
    date: new Date(p.date * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    rating: p.rating,
  }))

  if (history.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-500">
        No rating history available
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      {/* Game type selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {gameTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelected(type)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selected === type
                ? 'text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
            style={selected === type ? { backgroundColor: GAME_TYPE_COLORS[type] ?? '#6366f1' } : {}}
          >
            {GAME_TYPE_LABELS[type] ?? type}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            interval="preserveStartEnd"
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
            labelStyle={{ color: '#d1d5db' }}
            itemStyle={{ color: GAME_TYPE_COLORS[selected] ?? '#6366f1' }}
          />
          <Line
            type="monotone"
            dataKey="rating"
            stroke={GAME_TYPE_COLORS[selected] ?? '#6366f1'}
            dot={false}
            strokeWidth={2}
            name={GAME_TYPE_LABELS[selected] ?? selected}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
