import { useGameStore } from '../store/gameStore'

export function LoadingScreen() {
  const { progress, username } = useGameStore()
  const { totalMonths, fetchedMonths, totalGames } = progress

  const pct = totalMonths > 0 ? Math.round((fetchedMonths / totalMonths) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-6 animate-pulse">♟</div>
        <h2 className="text-white text-xl font-semibold mb-2">
          Loading {username ? `@${username}` : 'player'}&apos;s games…
        </h2>
        {totalMonths > 0 && (
          <p className="text-gray-400 text-sm mb-4">
            {fetchedMonths} of {totalMonths} months loaded · {totalGames} games
          </p>
        )}
        {/* Progress bar */}
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: totalMonths > 0 ? `${pct}%` : '100%' }}
          />
        </div>
      </div>
    </div>
  )
}
