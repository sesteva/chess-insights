import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLoadPlayerData } from '../useLoadPlayerData'
import { useGameStore } from '../../store/gameStore'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../services/chessApi', () => ({
  fetchPlayerProfile: vi.fn(),
  fetchPlayerStats: vi.fn(),
  fetchGameArchives: vi.fn(),
  fetchMonthlyGames: vi.fn(),
  ChessApiError: class ChessApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.name = 'ChessApiError'
      this.status = status
    }
  },
}))

vi.mock('../../utils/gameCache', () => ({
  getCachedGames: vi.fn().mockResolvedValue(null),
  setCachedGames: vi.fn().mockResolvedValue(undefined),
}))

import {
  fetchPlayerProfile,
  fetchPlayerStats,
  fetchGameArchives,
  fetchMonthlyGames,
} from '../../services/chessApi'
import { getCachedGames } from '../../utils/gameCache'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockProfile = {
  username: 'testplayer',
  player_id: 1,
  status: 'premium',
  joined: 1_000_000,
  last_online: 2_000_000,
  followers: 100,
}

const mockStats = {}

function makeArchiveUrl(year: number, month: string) {
  return `https://api.chess.com/pub/player/testplayer/games/${year}/${month}`
}

function makeGame(endTime: number) {
  return {
    url: `https://chess.com/game/${endTime}`,
    pgn: '',
    time_control: '600',
    end_time: endTime,
    rated: true,
    uuid: `uuid-${endTime}`,
    time_class: 'rapid' as const,
    rules: 'chess',
    white: { rating: 1500, result: 'win', username: 'player1', uuid: 'w1' },
    black: { rating: 1500, result: 'loss', username: 'testplayer', uuid: 'b1' },
  }
}

function makeGames(count: number, baseTime = 1_000_000): ReturnType<typeof makeGame>[] {
  return Array.from({ length: count }, (_, i) => makeGame(baseTime + i))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useLoadPlayerData', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
    vi.clearAllMocks()
    vi.mocked(fetchPlayerProfile).mockResolvedValue(mockProfile as never)
    vi.mocked(fetchPlayerStats).mockResolvedValue(mockStats as never)
    vi.mocked(getCachedGames).mockResolvedValue(null)
  })

  it('only fetches the last 3 archives when more exist', async () => {
    const archives = [
      makeArchiveUrl(2025, '08'),
      makeArchiveUrl(2025, '09'),
      makeArchiveUrl(2025, '10'),
      makeArchiveUrl(2025, '11'),
      makeArchiveUrl(2025, '12'),
    ]
    vi.mocked(fetchGameArchives).mockResolvedValue(archives)
    vi.mocked(fetchMonthlyGames).mockResolvedValue([])

    const { result } = renderHook(() => useLoadPlayerData())
    await result.current.load('testplayer')

    expect(fetchMonthlyGames).toHaveBeenCalledTimes(3)
    expect(fetchMonthlyGames).toHaveBeenCalledWith('testplayer', 2025, 10)
    expect(fetchMonthlyGames).toHaveBeenCalledWith('testplayer', 2025, 11)
    expect(fetchMonthlyGames).toHaveBeenCalledWith('testplayer', 2025, 12)
    expect(fetchMonthlyGames).not.toHaveBeenCalledWith('testplayer', 2025, 8)
    expect(fetchMonthlyGames).not.toHaveBeenCalledWith('testplayer', 2025, 9)
  })

  it('returns all games when total is 30 or fewer', async () => {
    const archives = [
      makeArchiveUrl(2025, '10'),
      makeArchiveUrl(2025, '11'),
      makeArchiveUrl(2025, '12'),
    ]
    vi.mocked(fetchGameArchives).mockResolvedValue(archives)
    // 5 games per month = 15 total
    vi.mocked(fetchMonthlyGames).mockResolvedValue(makeGames(5))

    const { result } = renderHook(() => useLoadPlayerData())
    await result.current.load('testplayer')

    await waitFor(() => {
      expect(useGameStore.getState().games).toHaveLength(15)
    })
  })

  it('caps at the 200 most recent games when total exceeds 200', async () => {
    const archives = [
      makeArchiveUrl(2025, '10'),
      makeArchiveUrl(2025, '11'),
      makeArchiveUrl(2025, '12'),
    ]
    vi.mocked(fetchGameArchives).mockResolvedValue(archives)

    // 100 games per month: oldest first (end_times 1..100, 101..200, 201..300)
    vi.mocked(fetchMonthlyGames)
      .mockResolvedValueOnce(makeGames(100, 1))    // end_times 1–100
      .mockResolvedValueOnce(makeGames(100, 101))  // end_times 101–200
      .mockResolvedValueOnce(makeGames(100, 201))  // end_times 201–300

    const { result } = renderHook(() => useLoadPlayerData())
    await result.current.load('testplayer')

    const games = useGameStore.getState().games
    expect(games).toHaveLength(200)

    // Should be the 200 newest: end_times 101–300
    const endTimes = games.map((g) => g.end_time).sort((a, b) => a - b)
    expect(endTimes[0]).toBe(101)
    expect(endTimes[199]).toBe(300)
  })

  it('sets totalMonths based on sliced archive count, not full archive list', async () => {
    const archives = [
      makeArchiveUrl(2025, '08'),
      makeArchiveUrl(2025, '09'),
      makeArchiveUrl(2025, '10'),
      makeArchiveUrl(2025, '11'),
      makeArchiveUrl(2025, '12'),
    ]
    vi.mocked(fetchGameArchives).mockResolvedValue(archives)
    vi.mocked(fetchMonthlyGames).mockResolvedValue([])

    const { result } = renderHook(() => useLoadPlayerData())
    await result.current.load('testplayer')

    await waitFor(() => {
      expect(useGameStore.getState().loadingState).toBe('success')
    })

    // totalMonths should be 3 (sliced), not 5 (full list)
    expect(useGameStore.getState().progress.totalMonths).toBe(3)
  })

  it('works correctly when fewer than 3 archives exist', async () => {
    const archives = [makeArchiveUrl(2025, '12')]
    vi.mocked(fetchGameArchives).mockResolvedValue(archives)
    vi.mocked(fetchMonthlyGames).mockResolvedValue(makeGames(5))

    const { result } = renderHook(() => useLoadPlayerData())
    await result.current.load('testplayer')

    await waitFor(() => {
      expect(useGameStore.getState().loadingState).toBe('success')
    })

    expect(fetchMonthlyGames).toHaveBeenCalledTimes(1)
    expect(useGameStore.getState().games).toHaveLength(5)
  })

  it('respects window.__CHESS_TEST__.gameLimit override', async () => {
    ;(window as any).__CHESS_TEST__ = { gameLimit: 5 }

    const archives = [makeArchiveUrl(2025, '12')]
    vi.mocked(fetchGameArchives).mockResolvedValue(archives)
    vi.mocked(fetchMonthlyGames).mockResolvedValue(makeGames(10)) // 10 games, limit should cap at 5

    const { result } = renderHook(() => useLoadPlayerData())
    await result.current.load('testplayer')

    await waitFor(() => {
      expect(useGameStore.getState().games).toHaveLength(5)
    })

    delete (window as any).__CHESS_TEST__
  })

  it('respects window.__CHESS_TEST__.monthsLimit override', async () => {
    ;(window as any).__CHESS_TEST__ = { monthsLimit: 1 }

    const archives = [
      makeArchiveUrl(2025, '10'),
      makeArchiveUrl(2025, '11'),
      makeArchiveUrl(2025, '12'),
    ]
    vi.mocked(fetchGameArchives).mockResolvedValue(archives)
    vi.mocked(fetchMonthlyGames).mockResolvedValue([])

    const { result } = renderHook(() => useLoadPlayerData())
    await result.current.load('testplayer')

    await waitFor(() => {
      expect(useGameStore.getState().loadingState).toBe('success')
    })

    expect(fetchMonthlyGames).toHaveBeenCalledTimes(1)
    expect(fetchMonthlyGames).toHaveBeenCalledWith('testplayer', 2025, 12)

    delete (window as any).__CHESS_TEST__
  })
})
