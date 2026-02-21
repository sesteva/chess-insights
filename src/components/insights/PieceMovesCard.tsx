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
import type { PieceMoveCounts } from '../../utils/gameAnalysis'

interface Props {
  counts: PieceMoveCounts
}

const PIECE_CONFIG = [
  { key: 'pawn',   label: 'Pawn',   symbol: '♙', color: '#94a3b8' },
  { key: 'knight', label: 'Knight', symbol: '♘', color: '#60a5fa' },
  { key: 'bishop', label: 'Bishop', symbol: '♗', color: '#34d399' },
  { key: 'rook',   label: 'Rook',   symbol: '♖', color: '#f97316' },
  { key: 'queen',  label: 'Queen',  symbol: '♕', color: '#e879f9' },
  { key: 'king',   label: 'King',   symbol: '♔', color: '#facc15' },
] as const

export function PieceMovesCard({ counts }: Props) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  const data = PIECE_CONFIG.map(({ key, label, symbol }) => ({
    label: `${symbol} ${label}`,
    key,
    count: counts[key],
    pct: total > 0 ? Math.round((counts[key] / total) * 100) : 0,
  }))

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-4">
      <h3 className="text-white font-semibold">Piece Move Frequency</h3>

      {/* Summary badges */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {PIECE_CONFIG.map(({ key, label, symbol, color }) => (
          <div key={key} className="bg-gray-900 rounded-lg p-3 text-center">
            <p className="text-2xl">{symbol}</p>
            <p className="text-white font-bold text-lg mt-1" style={{ color }}>
              {counts[key].toLocaleString()}
            </p>
            <p className="text-gray-400 text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Horizontal bar chart */}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={80}
            tick={{ fill: '#d1d5db', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
            formatter={(value: number, _name: string, entry) => [
              `${value.toLocaleString()} moves (${entry.payload.pct}%)`,
            ]}
            labelFormatter={(label) => label}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((entry) => {
              const cfg = PIECE_CONFIG.find((p) => p.key === entry.key)!
              return <Cell key={entry.key} fill={cfg.color} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
