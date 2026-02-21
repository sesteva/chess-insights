import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { CalendarStats } from '../../utils/gameAnalysis'

interface Props {
  stats: CalendarStats
}

export function CalendarCharts({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Hour of day */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-4">Games by Hour of Day</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.hourOfDay} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}h`}
            />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              formatter={(value: number, name: string) => [value, name === 'games' ? 'Games' : 'Win %']}
              labelFormatter={(label: number) => `${label}:00`}
            />
            <Bar dataKey="games" radius={[4, 4, 0, 0]}>
              {stats.hourOfDay.map((entry) => (
                <Cell
                  key={entry.hour}
                  fill={entry.games > 0 ? '#60a5fa' : '#374151'}
                  fillOpacity={0.7 + (entry.winPct / 100) * 0.3}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Day of week */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-4">Games by Day of Week</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.dayOfWeek} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={false}
            />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              formatter={(value: number, name: string) => [value, name === 'games' ? 'Games' : 'Win %']}
            />
            <Bar dataKey="games" radius={[4, 4, 0, 0]}>
              {stats.dayOfWeek.map((entry) => (
                <Cell
                  key={entry.day}
                  fill="#818cf8"
                  fillOpacity={0.5 + (entry.winPct / 100) * 0.5}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(to right, rgba(129,140,248,0.5), rgba(129,140,248,1))' }} />
          <span>Opacity reflects win rate</span>
        </div>
      </div>
    </div>
  )
}
