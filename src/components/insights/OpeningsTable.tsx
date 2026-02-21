import type { OpeningStats } from '../../utils/gameAnalysis'

interface Props {
  openings: OpeningStats[]
  title: string
}

export function OpeningsTable({ openings, title }: Props) {
  if (openings.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-3">{title}</h3>
        <p className="text-gray-500 text-sm text-center py-4">No opening data available</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {openings.map((o) => (
          <div key={o.eco} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="min-w-0">
                <span className="text-xs text-gray-500 font-mono mr-2">{o.eco}</span>
                <span className="text-sm text-gray-200 truncate">{o.name}</span>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0 text-xs">
                <span className="text-gray-400">{o.count} games</span>
                <span className="text-green-400 font-medium">{o.winPct}%</span>
              </div>
            </div>
            {/* W/L/D bar */}
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-700">
              <div className="bg-green-500" style={{ width: `${Math.round((o.wins / o.count) * 100)}%` }} />
              <div className="bg-yellow-500" style={{ width: `${Math.round((o.draws / o.count) * 100)}%` }} />
              <div className="bg-red-500" style={{ width: `${Math.round((o.losses / o.count) * 100)}%` }} />
            </div>
            <div className="flex gap-3 mt-1 text-xs text-gray-500">
              <span className="text-green-400">{o.wins}W</span>
              <span className="text-yellow-400">{o.draws}D</span>
              <span className="text-red-400">{o.losses}L</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
