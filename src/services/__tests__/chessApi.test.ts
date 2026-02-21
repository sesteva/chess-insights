/**
 * Task 1.4: Chess.com API Service Layer Tests
 *
 * Tests for the chess.com Public API wrapper. All fetch calls are mocked.
 * TDD: These tests are written FIRST and must fail before implementation.
 *
 * API base: https://api.chess.com/pub
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchPlayerProfile,
  fetchPlayerStats,
  fetchGameArchives,
  fetchMonthlyGames,
  ChessApiError,
} from '../chessApi'

const BASE_URL = 'https://api.chess.com/pub'

const mockProfile = {
  username: 'hikaru',
  player_id: 15448422,
  title: 'GM',
  status: 'premium',
  name: 'Hikaru Nakamura',
  avatar: 'https://images.chess.com/view/master.png',
  location: 'US',
  country: 'https://api.chess.com/pub/country/US',
  joined: 1254438000,
  last_online: 1723000000,
  followers: 3000000,
  is_streamer: true,
  twitch_url: 'https://twitch.tv/gmhikaru',
  fide: 2802,
}

const mockStats = {
  chess_rapid: {
    last: { rating: 3200, date: 1723000000, rd: 23 },
    best: { rating: 3318, date: 1700000000, game: 'https://chess.com/game/live/12345' },
    record: { win: 500, loss: 100, draw: 50, time_per_move: 15, timeout_percent: 0.1 },
  },
  chess_blitz: {
    last: { rating: 3150, date: 1723000000, rd: 20 },
    best: { rating: 3290, date: 1710000000, game: 'https://chess.com/game/live/67890' },
    record: { win: 10000, loss: 3000, draw: 800, time_per_move: 5, timeout_percent: 0.2 },
  },
  chess_bullet: {
    last: { rating: 3100, date: 1723000000, rd: 25 },
    best: { rating: 3250, date: 1715000000, game: 'https://chess.com/game/live/11111' },
    record: { win: 8000, loss: 3500, draw: 400, time_per_move: 2, timeout_percent: 0.3 },
  },
  puzzle_rush: {
    best: { total_attempts: 200, score: 50 },
    daily: { total_attempts: 10, score: 8 },
  },
}

const mockArchives = {
  archives: [
    'https://api.chess.com/pub/player/hikaru/games/2024/01',
    'https://api.chess.com/pub/player/hikaru/games/2024/02',
    'https://api.chess.com/pub/player/hikaru/games/2024/03',
  ],
}

const mockGames = {
  games: [
    {
      url: 'https://www.chess.com/game/live/123',
      pgn: '[Event "Live Chess"]\n[White "hikaru"]\n[Black "opponent1"]\n[Result "1-0"]\n[WhiteElo "3200"]\n[BlackElo "3100"]\n[ECO "C60"]\n[Opening "Ruy Lopez"]\n[Date "2024.03.15"]\n[Time "10:00:00"]\n[TimeControl "600"]\n1. e4 e5 2. Nf3 Nc6 3. Bb5 *',
      time_control: '600',
      end_time: 1710500000,
      rated: true,
      accuracies: { white: 92.5, black: 78.3 },
      tcn: 'mCZRbs1MlBZT',
      uuid: 'uuid-123',
      initial_setup: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      fen: '1r3r1k/p4p1p/2p3p1/3Pn3/8/5Q2/Pq3PPP/2R2RK1 b - - 0 28',
      time_class: 'rapid',
      rules: 'chess',
      white: { rating: 3200, result: 'win', username: 'hikaru', uuid: 'uuid-w-1' },
      black: { rating: 3100, result: 'resigned', username: 'opponent1', uuid: 'uuid-b-1' },
    },
    {
      url: 'https://www.chess.com/game/live/456',
      pgn: '[Event "Live Chess"]\n[White "opponent2"]\n[Black "hikaru"]\n[Result "0-1"]\n[WhiteElo "3050"]\n[BlackElo "3200"]\n[ECO "D20"]\n[Opening "Queen\'s Gambit"]\n[Date "2024.03.15"]\n[Time "11:30:00"]\n[TimeControl "600"]\n1. d4 d5 2. c4 dxc4 *',
      time_control: '600',
      end_time: 1710506000,
      rated: true,
      accuracies: { white: 71.0, black: 95.1 },
      tcn: 'mCZRbs1MlBZT2',
      uuid: 'uuid-456',
      initial_setup: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      fen: '8/5k2/8/8/8/8/8/4K3 w - - 0 60',
      time_class: 'rapid',
      rules: 'chess',
      white: { rating: 3050, result: 'checkmated', username: 'opponent2', uuid: 'uuid-w-2' },
      black: { rating: 3200, result: 'win', username: 'hikaru', uuid: 'uuid-b-2' },
    },
  ],
}

describe('Chess.com API Service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ─── fetchPlayerProfile ───────────────────────────────────────────────────

  describe('fetchPlayerProfile', () => {
    it('fetches player profile by username (case-insensitive)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      } as Response)

      const profile = await fetchPlayerProfile('HIKARU')
      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/player/hikaru`,
        expect.objectContaining({ headers: expect.any(Object) }),
      )
      expect(profile.username).toBe('hikaru')
      expect(profile.player_id).toBe(15448422)
    })

    it('throws ChessApiError with status 404 for unknown player', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response)

      const error = await fetchPlayerProfile('nonexistentplayer99999').catch((e) => e)
      expect(error).toBeInstanceOf(ChessApiError)
      expect(error.status).toBe(404)
    })

    it('throws ChessApiError on network failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))
      await expect(fetchPlayerProfile('hikaru')).rejects.toThrow(ChessApiError)
    })
  })

  // ─── fetchPlayerStats ─────────────────────────────────────────────────────

  describe('fetchPlayerStats', () => {
    it('fetches player stats including ratings for all game types', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      } as Response)

      const stats = await fetchPlayerStats('hikaru')
      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/player/hikaru/stats`,
        expect.objectContaining({ headers: expect.any(Object) }),
      )
      expect(stats.chess_rapid?.last.rating).toBe(3200)
      expect(stats.chess_blitz?.last.rating).toBe(3150)
      expect(stats.chess_bullet?.last.rating).toBe(3100)
    })

    it('throws ChessApiError on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response)

      await expect(fetchPlayerStats('hikaru')).rejects.toThrow(ChessApiError)
    })
  })

  // ─── fetchGameArchives ────────────────────────────────────────────────────

  describe('fetchGameArchives', () => {
    it('returns array of archive URLs sorted oldest-first', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockArchives,
      } as Response)

      const archives = await fetchGameArchives('hikaru')
      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/player/hikaru/games/archives`,
        expect.objectContaining({ headers: expect.any(Object) }),
      )
      expect(archives).toHaveLength(3)
      expect(archives[0]).toBe('https://api.chess.com/pub/player/hikaru/games/2024/01')
      expect(archives[2]).toBe('https://api.chess.com/pub/player/hikaru/games/2024/03')
    })

    it('returns empty array when player has no archives', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ archives: [] }),
      } as Response)

      const archives = await fetchGameArchives('newplayer')
      expect(archives).toEqual([])
    })

    it('throws ChessApiError on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response)

      await expect(fetchGameArchives('hikaru')).rejects.toThrow(ChessApiError)
    })
  })

  // ─── fetchMonthlyGames ────────────────────────────────────────────────────

  describe('fetchMonthlyGames', () => {
    it('fetches games for a given year/month', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGames,
      } as Response)

      const games = await fetchMonthlyGames('hikaru', 2024, 3)
      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/player/hikaru/games/2024/03`,
        expect.objectContaining({ headers: expect.any(Object) }),
      )
      expect(games).toHaveLength(2)
      expect(games[0].uuid).toBe('uuid-123')
      expect(games[1].uuid).toBe('uuid-456')
    })

    it('pads single-digit month with leading zero in URL', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ games: [] }),
      } as Response)

      await fetchMonthlyGames('hikaru', 2024, 1)
      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/player/hikaru/games/2024/01`,
        expect.any(Object),
      )
    })

    it('returns empty array when no games in month', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ games: [] }),
      } as Response)

      const games = await fetchMonthlyGames('hikaru', 2024, 2)
      expect(games).toEqual([])
    })

    it('throws ChessApiError on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(fetchMonthlyGames('hikaru', 2024, 3)).rejects.toThrow(ChessApiError)
    })
  })

  // ─── ChessApiError ────────────────────────────────────────────────────────

  describe('ChessApiError', () => {
    it('is an instance of Error', () => {
      const err = new ChessApiError('test message', 404)
      expect(err).toBeInstanceOf(Error)
      expect(err.message).toBe('test message')
      expect(err.status).toBe(404)
      expect(err.name).toBe('ChessApiError')
    })
  })
})
