import type { GameResultCounts } from '../../utils/gameAnalysis'
import type { PlayerStats } from '../../services/chessApi'

interface Props {
  resultCounts: GameResultCounts
  stats: PlayerStats | null
  totalGames: number
}

const GAME_TYPE_LABELS: Record<string, string> = {
  chess_rapid: 'Rapid',
  chess_blitz: 'Blitz',
  chess_bullet: 'Bullet',
  chess_daily: 'Daily',
}

export function OverviewCard({ resultCounts, stats, totalGames }: Props) {
  const { wins, losses, draws, winPct } = resultCounts

  return (
    <div className="space-y-4">
      {/* Result summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Games', value: totalGames, color: 'text-white' },
          { label: 'Wins', value: wins, color: 'text-green-400' },
          { label: 'Losses', value: losses, color: 'text-red-400' },
          { label: 'Draws', value: draws, color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-4 text-center">
            <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
            <p className="text-gray-400 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Win rate bar */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-green-400">Wins {winPct}%</span>
          <span className="text-yellow-400">Draws {resultCounts.drawPct}%</span>
          <span className="text-red-400">Losses {resultCounts.lossPct}%</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden">
          <div className="bg-green-500" style={{ width: `${winPct}%` }} />
          <div className="bg-yellow-500" style={{ width: `${resultCounts.drawPct}%` }} />
          <div className="bg-red-500" style={{ width: `${resultCounts.lossPct}%` }} />
        </div>
      </div>

      {/* Ratings by game type */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(GAME_TYPE_LABELS).map(([key, label]) => {
            const typeStats = stats[key as keyof PlayerStats] as { last?: { rating: number } } | undefined
            if (!typeStats?.last) return null
            return (
              <div key={key} className="bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">{typeStats.last.rating}</p>
                <p className="text-gray-400 text-sm mt-1">{label}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
