interface Filters {
  gameType: string   // 'all' | 'rapid' | 'blitz' | 'bullet' | 'daily'
  daysBack: number | null  // null = all time
}

interface Props {
  filters: Filters
  availableGameTypes: string[]
  totalGames: number
  filteredGames: number
  onChange: (filters: Filters) => void
}

const GAME_TYPE_LABELS: Record<string, string> = {
  all: 'All',
  rapid: 'Rapid',
  blitz: 'Blitz',
  bullet: 'Bullet',
  daily: 'Daily',
}

const DATE_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: 'All time', value: null },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '1 year', value: 365 },
]

export function FilterBar({ filters, availableGameTypes, totalGames, filteredGames, onChange }: Props) {
  const gameTypes = ['all', ...availableGameTypes]

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex flex-wrap gap-4 items-center">
      {/* Game type pills */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-gray-500 text-xs mr-1">Type:</span>
        {gameTypes.map((type) => (
          <button
            key={type}
            onClick={() => onChange({ ...filters, gameType: type })}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.gameType === type
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {GAME_TYPE_LABELS[type] ?? type}
          </button>
        ))}
      </div>

      {/* Date range pills */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-gray-500 text-xs mr-1">Period:</span>
        {DATE_OPTIONS.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => onChange({ ...filters, daysBack: value })}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.daysBack === value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Game count indicator */}
      <div className="ml-auto text-xs text-gray-500">
        {filteredGames < totalGames ? (
          <span>
            <span className="text-white font-semibold">{filteredGames.toLocaleString()}</span>
            {' / '}
            {totalGames.toLocaleString()} games
          </span>
        ) : (
          <span>
            <span className="text-white font-semibold">{totalGames.toLocaleString()}</span> games
          </span>
        )}
      </div>
    </div>
  )
}
