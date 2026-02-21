import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { AccuracyStats } from '../../utils/gameAnalysis'
import { computeAccuracyDistribution } from '../../utils/gameAnalysis'

interface Props {
  stats: AccuracyStats
}

const GAME_TYPE_LABELS: Record<string, string> = {
  rapid: 'Rapid',
  blitz: 'Blitz',
  bullet: 'Bullet',
  daily: 'Daily',
}

/** Compute a rolling average over the last N items */
function rollingAverage(data: number[], window: number): number[] {
  return data.map((_, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1)
    return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 10) / 10
  })
}

/** Color a histogram bar based on accuracy range */
function bucketColor(min: number): string {
  if (min >= 80) return '#34d399'  // green
  if (min >= 60) return '#60a5fa'  // blue
  if (min >= 40) return '#f97316'  // orange
  return '#f87171'                 // red
}

export function AccuracyChart({ stats }: Props) {
  const { average, byGameType, history } = stats

  // Build smoothed chart data (rolling average of 20)
  const rawAccuracies = history.map((h) => h.accuracy)
  const smoothed = rollingAverage(rawAccuracies, 20)

  const chartData = history.map((h, i) => ({
    date: new Date(h.date * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    accuracy: h.accuracy,
    smoothed: smoothed[i],
  }))

  const distribution = computeAccuracyDistribution(history)

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-400">{average ?? '—'}</p>
          <p className="text-gray-400 text-sm mt-1">Avg Accuracy</p>
        </div>
        {Object.entries(byGameType).map(([type, acc]) => (
          <div key={type} className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-purple-300">{acc}</p>
            <p className="text-gray-400 text-sm mt-1">{GAME_TYPE_LABELS[type] ?? type}</p>
          </div>
        ))}
      </div>

      {/* Accuracy distribution histogram */}
      {history.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4">Accuracy Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={distribution} margin={{ top: 4, right: 10, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey="bucket"
                tick={{ fill: '#9ca3af', fontSize: 9 }}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                formatter={(value: number) => [`${value} games`, 'Games']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distribution.map((entry) => (
                  <Cell key={entry.bucket} fill={bucketColor(entry.min)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Accuracy over time */}
      {chartData.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4">Accuracy Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                interval="preserveStartEnd"
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                formatter={(value: number, name: string) => [
                  `${value}%`,
                  name === 'smoothed' ? 'Rolling avg' : 'Accuracy',
                ]}
              />
              <Area
                type="monotone"
                dataKey="accuracy"
                stroke="#a78bfa"
                strokeWidth={1}
                strokeOpacity={0.3}
                fill="none"
                dot={false}
                name="accuracy"
              />
              <Area
                type="monotone"
                dataKey="smoothed"
                stroke="#a78bfa"
                strokeWidth={2}
                fill="url(#accuracyGrad)"
                dot={false}
                name="smoothed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
