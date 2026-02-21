import { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import {
  computeResultCounts,
  computeRatingHistory,
  computeOpeningStats,
  computeCalendarStats,
  computeAccuracyStats,
  computeCastlingStats,
  computeGamePhaseStats,
  computePieceMoveFrequency,
  computeOpponentCountryStats,
  extractOpponentUsernames,
  computeActivityHeatmap,
  computeTacticsStats,
} from '../utils/gameAnalysis'
import { useLoadOpponentCountries } from '../hooks/useLoadOpponentCountries'
import { OverviewCard } from './insights/OverviewCard'
import { RatingChart } from './insights/RatingChart'
import { OpeningsTable } from './insights/OpeningsTable'
import { CalendarCharts } from './insights/CalendarCharts'
import { AccuracyChart } from './insights/AccuracyChart'
import { CastlingCard } from './insights/CastlingCard'
import { GamePhaseChart } from './insights/GamePhaseChart'
import { PieceMovesCard } from './insights/PieceMovesCard'
import { GeographyCard } from './insights/GeographyCard'
import { ActivityHeatmap } from './insights/ActivityHeatmap'
import { TacticsCard } from './insights/TacticsCard'
import { FilterBar } from './insights/FilterBar'

interface Filters {
  gameType: string
  daysBack: number | null
}

export function InsightsDashboard() {
  const { games, username, profile, stats, opponentCountries, countriesLoadingState } = useGameStore()
  const user = username ?? ''

  // Lazily fetch opponent countries in the background
  useLoadOpponentCountries()

  // ── Filters ──────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<Filters>({ gameType: 'all', daysBack: null })

  const availableGameTypes = useMemo(
    () => [...new Set(games.map((g) => g.time_class))].sort(),
    [games],
  )

  const filteredGames = useMemo(() => {
    let result = games
    if (filters.gameType !== 'all') {
      result = result.filter((g) => g.time_class === filters.gameType)
    }
    if (filters.daysBack !== null) {
      const cutoff = Date.now() / 1000 - filters.daysBack * 86400
      result = result.filter((g) => g.end_time >= cutoff)
    }
    return result
  }, [games, filters])

  // ── Derived stats (all use filteredGames) ─────────────────────────────────
  const resultCounts   = useMemo(() => computeResultCounts(filteredGames, user), [filteredGames, user])
  const ratingHistory  = useMemo(() => computeRatingHistory(filteredGames, user), [filteredGames, user])
  const openingsWhite  = useMemo(() => computeOpeningStats(filteredGames, user, 'white'), [filteredGames, user])
  const openingsBlack  = useMemo(() => computeOpeningStats(filteredGames, user, 'black'), [filteredGames, user])
  const calendarStats  = useMemo(() => computeCalendarStats(filteredGames, user), [filteredGames, user])
  const accuracyStats  = useMemo(() => computeAccuracyStats(filteredGames, user), [filteredGames, user])
  const castlingStats  = useMemo(() => computeCastlingStats(filteredGames, user), [filteredGames, user])
  const gamePhaseStats = useMemo(() => computeGamePhaseStats(filteredGames, user), [filteredGames, user])
  const pieceCounts    = useMemo(() => computePieceMoveFrequency(filteredGames, user), [filteredGames, user])
  const activityData   = useMemo(() => computeActivityHeatmap(filteredGames, user), [filteredGames, user])
  const tacticsStats   = useMemo(() => computeTacticsStats(filteredGames, user), [filteredGames, user])

  const countryStats = useMemo(
    () => computeOpponentCountryStats(filteredGames, user, opponentCountries),
    [filteredGames, user, opponentCountries],
  )
  const totalOpponents = useMemo(
    () => extractOpponentUsernames(filteredGames, user).length,
    [filteredGames, user],
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">♟</span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">Chess Insights</h1>
              <p className="text-gray-400 text-sm truncate">@{user}</p>
            </div>
          </div>
          {profile?.title && (
            <span className="bg-yellow-600 text-yellow-100 text-xs font-bold px-2 py-1 rounded shrink-0">
              {profile.title}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Filter bar */}
        <FilterBar
          filters={filters}
          availableGameTypes={availableGameTypes}
          totalGames={games.length}
          filteredGames={filteredGames.length}
          onChange={setFilters}
        />

        {/* Overview */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Overview</h2>
          <OverviewCard resultCounts={resultCounts} stats={stats} totalGames={filteredGames.length} />
        </section>

        {/* Activity heatmap */}
        <section>
          <ActivityHeatmap activity={activityData} />
        </section>

        {/* Rating Trends */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Rating Trends</h2>
          <RatingChart history={ratingHistory} />
        </section>

        {/* Accuracy */}
        {accuracyStats.history.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-300 mb-4">Accuracy</h2>
            <AccuracyChart stats={accuracyStats} />
          </section>
        )}

        {/* Tactics */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Tactics</h2>
          <TacticsCard stats={tacticsStats} />
        </section>

        {/* Game Phase */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Game Phase Analysis</h2>
          <GamePhaseChart phaseStats={gamePhaseStats} />
        </section>

        {/* Openings */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Opening Insights</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OpeningsTable openings={openingsWhite} title="As White" />
            <OpeningsTable openings={openingsBlack} title="As Black" />
          </div>
        </section>

        {/* Calendar */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Calendar Insights</h2>
          <CalendarCharts stats={calendarStats} />
        </section>

        {/* Castling */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Castling Patterns</h2>
          <CastlingCard stats={castlingStats} />
        </section>

        {/* Piece Movement */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Piece Movement</h2>
          <PieceMovesCard counts={pieceCounts} />
        </section>

        {/* Geography */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Opponent Geography</h2>
          <GeographyCard
            stats={countryStats}
            loadingState={countriesLoadingState}
            totalOpponents={totalOpponents}
          />
        </section>
      </main>
    </div>
  )
}
