/**
 * Hook that orchestrates fetching all player data from the chess.com API.
 * Fetches profile, stats, then game archives month by month.
 * Uses IndexedDB to cache completed months and avoid redundant network requests.
 */
import { useCallback } from 'react'
import { useGameStore } from '../store/gameStore'
import {
  fetchPlayerProfile,
  fetchPlayerStats,
  fetchGameArchives,
  fetchMonthlyGames,
  ChessApiError,
  type ChessGame,
} from '../services/chessApi'
import { getCachedGames, setCachedGames } from '../utils/gameCache'

export function useLoadPlayerData() {
  const {
    setUsername,
    setProfile,
    setStats,
    appendGames,
    setLoadingState,
    setError,
    setProgress,
    reset,
  } = useGameStore()

  const load = useCallback(async (username: string) => {
    reset()
    setUsername(username)
    setLoadingState('loading')
    setError(null)

    const testCfg = (window as any).__CHESS_TEST__ ?? {}
    const monthsLimit: number = testCfg.monthsLimit ?? 3
    const gameLimit: number   = testCfg.gameLimit   ?? 30

    try {
      // 1. Fetch profile and stats in parallel
      const [profile, stats] = await Promise.all([
        fetchPlayerProfile(username),
        fetchPlayerStats(username),
      ])
      setProfile(profile)
      setStats(stats)

      // 2. Fetch archive list (last 3 months only)
      const archives = await fetchGameArchives(username)
      const recentArchives = archives.slice(-monthsLimit)
      setProgress({ totalMonths: recentArchives.length, fetchedMonths: 0, totalGames: 0 })

      const collectedGames: ChessGame[] = []
      for (let i = 0; i < recentArchives.length; i++) {
        const archiveUrl = recentArchives[i]
        // Extract year and month from archive URL: .../games/2024/03
        const match = archiveUrl.match(/\/games\/(\d{4})\/(\d{2})$/)
        if (!match) continue

        const year = parseInt(match[1], 10)
        const month = parseInt(match[2], 10)

        // Try cache first
        let games = await getCachedGames(username, year, month)
        if (!games) {
          games = await fetchMonthlyGames(username, year, month)
          await setCachedGames(username, year, month, games)
        }

        collectedGames.push(...games)
        setProgress({ fetchedMonths: i + 1, totalGames: collectedGames.length })
      }

      const finalGames = collectedGames.length > gameLimit
        ? [...collectedGames].sort((a, b) => b.end_time - a.end_time).slice(0, gameLimit)
        : collectedGames

      appendGames(finalGames)
      setProgress({ totalGames: finalGames.length })
      setLoadingState('success')
    } catch (err) {
      const message =
        err instanceof ChessApiError
          ? err.status === 404
            ? `Player "${username}" not found on chess.com`
            : `Failed to load data: ${err.message}`
          : 'An unexpected error occurred'
      setError(message)
      setLoadingState('error')
    }
  }, [reset, setUsername, setLoadingState, setError, setProfile, setStats, setProgress, appendGames])

  return { load }
}
