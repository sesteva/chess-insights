import type { TacticsStats } from '../../utils/gameAnalysis'

interface Props {
  stats: TacticsStats | null
  loading: boolean
}

export function TacticsCard({ stats, loading }: Props) {
  if (loading) {
    return (
      <div role="status" aria-label="Loading tactics analysis" className="bg-gray-800 rounded-xl p-8 flex items-center justify-center gap-3 text-gray-400">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span>Analysing tactics…</span>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
        No data available.
      </div>
    )
  }

  const { gamesAnalyzed, missedMates, matesPlayed } = stats
  const totalMateOpportunities = missedMates + matesPlayed
  const mateFoundPct =
    totalMateOpportunities > 0 ? Math.round((matesPlayed / totalMateOpportunities) * 100) : null

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{gamesAnalyzed}</p>
          <p className="text-gray-400 text-sm mt-1">Games Analysed</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{matesPlayed}</p>
          <p className="text-gray-400 text-sm mt-1">Mates Played</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{missedMates}</p>
          <p className="text-gray-400 text-sm mt-1">Missed Mates</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-400">
            {mateFoundPct !== null ? `${mateFoundPct}%` : '—'}
          </p>
          <p className="text-gray-400 text-sm mt-1">Mate Conversion</p>
        </div>
      </div>

      {/* Visual progress bar */}
      {totalMateOpportunities > 0 && (
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Mate-in-1 Opportunities</span>
            <span>{totalMateOpportunities} found</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-500 h-3 rounded-full transition-all"
              style={{ width: `${mateFoundPct ?? 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span className="text-green-400">{matesPlayed} played <span aria-hidden="true">✓</span></span>
            <span className="text-red-400">{missedMates} missed <span aria-hidden="true">✗</span></span>
          </div>
        </div>
      )}

      {totalMateOpportunities === 0 && gamesAnalyzed > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 text-center text-gray-500 text-sm">
          No mate-in-1 opportunities detected in the analysed games.
        </div>
      )}

      <p className="text-gray-600 text-xs text-center">
        Analysis based on the {gamesAnalyzed} most recent games. Detects positions with a forced checkmate in one move.
      </p>
    </div>
  )
}
