/**
 * Task 2.3 / 2.4: Game Analysis Utilities Tests
 *
 * Tests for pure functions that derive insights from raw ChessGame arrays.
 * TDD: written alongside implementation to verify each analysis function.
 */

import { describe, it, expect } from 'vitest'
import type { ChessGame } from '../../services/chessApi'
import {
  playedAsWhite,
  getResult,
  extractOpening,
  computeResultCounts,
  computeRatingHistory,
  computeOpeningStats,
  computeCalendarStats,
  computeAccuracyStats,
  detectCastling,
  computeCastlingStats,
  classifyGamePhase,
  computeGamePhaseStats,
  computePieceMoveFrequency,
  computeAccuracyDistribution,
  extractOpponentUsernames,
  computeOpponentCountryStats,
  computeActivityHeatmap,
  computeTacticsStats,
} from '../gameAnalysis'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeGame(overrides: Partial<ChessGame> = {}): ChessGame {
  return {
    url: 'https://chess.com/game/live/1',
    pgn: '[Event "Live Chess"]\n[White "alice"]\n[Black "bob"]\n[Result "1-0"]\n[WhiteElo "1500"]\n[BlackElo "1480"]\n[ECO "C60"]\n[Opening "Ruy Lopez"]\n[Date "2024.03.15"]\n[Time "10:00:00"]\n[TimeControl "600"]\n1. e4 e5 2. Nf3 Nc6 3. Bb5 *',
    time_control: '600',
    end_time: 1710500400, // 2024-03-15 10:00 UTC (Friday)
    rated: true,
    tcn: 'abc',
    uuid: 'game-1',
    initial_setup: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    time_class: 'rapid',
    rules: 'chess',
    white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-1' },
    black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-1' },
    ...overrides,
  }
}

// ─── playedAsWhite ─────────────────────────────────────────────────────────────

describe('playedAsWhite', () => {
  it('returns true when username matches white player (case-insensitive)', () => {
    const game = makeGame()
    expect(playedAsWhite(game, 'alice')).toBe(true)
    expect(playedAsWhite(game, 'ALICE')).toBe(true)
  })

  it('returns false when username matches black player', () => {
    const game = makeGame()
    expect(playedAsWhite(game, 'bob')).toBe(false)
  })
})

// ─── getResult ────────────────────────────────────────────────────────────────

describe('getResult', () => {
  it('returns "win" when the player wins', () => {
    const game = makeGame({ white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-1' } })
    expect(getResult(game, 'alice')).toBe('win')
  })

  it('returns "loss" when the player loses (resigned)', () => {
    const game = makeGame({ black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-1' } })
    expect(getResult(game, 'bob')).toBe('loss')
  })

  it('returns "loss" for checkmated player', () => {
    const game = makeGame({ black: { rating: 1480, result: 'checkmated', username: 'bob', uuid: 'b-1' } })
    expect(getResult(game, 'bob')).toBe('loss')
  })

  it('returns "draw" for agreed draw', () => {
    const game = makeGame({
      white: { rating: 1500, result: 'agreed', username: 'alice', uuid: 'w-1' },
      black: { rating: 1480, result: 'agreed', username: 'bob', uuid: 'b-1' },
    })
    expect(getResult(game, 'alice')).toBe('draw')
  })

  it('returns "draw" for stalemate', () => {
    const game = makeGame({
      white: { rating: 1500, result: 'stalemate', username: 'alice', uuid: 'w-1' },
      black: { rating: 1480, result: 'stalemate', username: 'bob', uuid: 'b-1' },
    })
    expect(getResult(game, 'bob')).toBe('draw')
  })
})

// ─── extractOpening ───────────────────────────────────────────────────────────

describe('extractOpening', () => {
  it('extracts ECO code and opening name from PGN headers', () => {
    const pgn = '[ECO "C60"]\n[Opening "Ruy Lopez"]\n1. e4 e5 *'
    const { eco, name } = extractOpening(pgn)
    expect(eco).toBe('C60')
    expect(name).toBe('Ruy Lopez')
  })

  it('returns "Unknown" for missing ECO', () => {
    const pgn = '[Opening "Ruy Lopez"]\n1. e4 e5 *'
    expect(extractOpening(pgn).eco).toBe('Unknown')
  })

  it('returns "Unknown Opening" for missing opening name', () => {
    const pgn = '[ECO "C60"]\n1. e4 e5 *'
    expect(extractOpening(pgn).name).toBe('Unknown Opening')
  })

  it('extracts opening name from ECOUrl when Opening tag is absent', () => {
    const pgn = '[ECO "D02"]\n[ECOUrl "https://www.chess.com/openings/Queens-Pawn-Game-2.Nf3-Nf6-3.Bf4"]\n1. d4 Nf6 *'
    expect(extractOpening(pgn).name).toBe('Queens Pawn Game')
  })

  it('extracts simple opening name from ECOUrl without moves', () => {
    const pgn = '[ECO "B10"]\n[ECOUrl "https://www.chess.com/openings/Caro-Kann-Defense"]\n1. e4 c6 *'
    expect(extractOpening(pgn).name).toBe('Caro Kann Defense')
  })

  it('prefers Opening tag over ECOUrl when both are present', () => {
    const pgn = '[ECO "C60"]\n[Opening "Ruy Lopez"]\n[ECOUrl "https://www.chess.com/openings/Ruy-Lopez-Opening"]\n1. e4 e5 *'
    expect(extractOpening(pgn).name).toBe('Ruy Lopez')
  })
})

// ─── computeResultCounts ─────────────────────────────────────────────────────

describe('computeResultCounts', () => {
  it('correctly counts wins, losses, and draws', () => {
    const games = [
      makeGame({ white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-1' } }),
      makeGame({
        white: { rating: 1480, result: 'win', username: 'bob', uuid: 'w-2' },
        black: { rating: 1500, result: 'checkmated', username: 'alice', uuid: 'b-2' },
      }),
      makeGame({
        white: { rating: 1500, result: 'agreed', username: 'alice', uuid: 'w-3' },
        black: { rating: 1480, result: 'agreed', username: 'carol', uuid: 'b-3' },
      }),
    ]
    const counts = computeResultCounts(games, 'alice')
    expect(counts.wins).toBe(1)
    expect(counts.losses).toBe(1)
    expect(counts.draws).toBe(1)
    expect(counts.total).toBe(3)
    expect(counts.winPct).toBe(33)
  })

  it('handles empty games array', () => {
    const counts = computeResultCounts([], 'alice')
    expect(counts.total).toBe(0)
    expect(counts.winPct).toBe(0)
  })
})

// ─── computeRatingHistory ────────────────────────────────────────────────────

describe('computeRatingHistory', () => {
  it('extracts rating points sorted by date', () => {
    const games = [
      makeGame({ end_time: 1710600000, white: { rating: 1510, result: 'win', username: 'alice', uuid: 'w-1' } }),
      makeGame({ end_time: 1710500000, white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-2' } }),
    ]
    const history = computeRatingHistory(games, 'alice')
    expect(history).toHaveLength(2)
    expect(history[0].rating).toBe(1500)  // older game first
    expect(history[1].rating).toBe(1510)
  })

  it('uses black rating when player is black', () => {
    const game = makeGame({
      white: { rating: 1600, result: 'win', username: 'alice', uuid: 'w-1' },
      black: { rating: 1550, result: 'resigned', username: 'bob', uuid: 'b-1' },
    })
    const history = computeRatingHistory([game], 'bob')
    expect(history[0].rating).toBe(1550)
  })
})

// ─── computeOpeningStats ─────────────────────────────────────────────────────

describe('computeOpeningStats', () => {
  it('aggregates opening stats for white games only', () => {
    const games = [
      makeGame(), // alice as white, C60, win
      makeGame({ uuid: 'g2', pgn: '[ECO "C60"]\n[Opening "Ruy Lopez"]\n[White "alice"]\n[Black "bob"]\n1. e4 e5 2. Nf3 *', white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-2' }, black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-2' } }),
      makeGame({ uuid: 'g3', white: { rating: 1480, result: 'win', username: 'bob', uuid: 'w-3' }, black: { rating: 1500, result: 'checkmated', username: 'alice', uuid: 'b-3' } }), // alice as black, should not count
    ]
    const stats = computeOpeningStats(games, 'alice', 'white')
    expect(stats).toHaveLength(1)
    expect(stats[0].eco).toBe('C60')
    expect(stats[0].count).toBe(2)
    expect(stats[0].wins).toBe(2)
  })

  it('sorts by count descending', () => {
    const e4 = makeGame()
    const d4 = makeGame({ uuid: 'g-d4', pgn: '[ECO "D20"]\n[Opening "Queen\'s Gambit"]\n[White "alice"]\n[Black "bob"]\n1. d4 d5 *', white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-d4' }, black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-d4' } })
    const d4b = makeGame({ uuid: 'g-d4b', pgn: '[ECO "D20"]\n[Opening "Queen\'s Gambit"]\n[White "alice"]\n[Black "bob"]\n1. d4 d5 *', white: { rating: 1500, result: 'loss', username: 'alice', uuid: 'w-d4b' }, black: { rating: 1480, result: 'win', username: 'bob', uuid: 'b-d4b' } })
    const stats = computeOpeningStats([e4, d4, d4b], 'alice', 'white')
    expect(stats[0].eco).toBe('D20') // played 2 times
    expect(stats[1].eco).toBe('C60') // played 1 time
  })
})

// ─── detectCastling ──────────────────────────────────────────────────────────

describe('detectCastling', () => {
  it('detects kingside castling (O-O)', () => {
    const pgn = '[White "alice"]\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O *'
    expect(detectCastling(pgn)).toBe('kingside')
  })

  it('detects queenside castling (O-O-O)', () => {
    const pgn = '[White "alice"]\n1. d4 d5 2. c4 c6 3. Nc3 Nf6 4. O-O-O *'
    expect(detectCastling(pgn)).toBe('queenside')
  })

  it('prefers queenside when both patterns present (O-O-O before O-O check)', () => {
    const pgn = '[White "alice"]\n1. e4 e5 2. O-O-O *' // Queenside should win
    expect(detectCastling(pgn)).toBe('queenside')
  })

  it('returns "none" when no castling in game', () => {
    const pgn = '[White "alice"]\n1. e4 e5 2. Nf3 *'
    expect(detectCastling(pgn)).toBe('none')
  })
})

// ─── classifyGamePhase ───────────────────────────────────────────────────────

describe('classifyGamePhase', () => {
  it('classifies short games as opening phase', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 *'
    expect(classifyGamePhase(pgn)).toBe('opening')
  })

  it('classifies medium-length games as middlegame', () => {
    const moves = Array.from({ length: 25 }, (_, i) => `${i + 1}. e4 e5`).join(' ')
    expect(classifyGamePhase(moves)).toBe('middlegame')
  })

  it('classifies long games as endgame', () => {
    const moves = Array.from({ length: 45 }, (_, i) => `${i + 1}. e4 e5`).join(' ')
    expect(classifyGamePhase(moves)).toBe('endgame')
  })
})

// ─── computeCalendarStats ────────────────────────────────────────────────────

describe('computeCalendarStats', () => {
  it('counts games by hour of day', () => {
    // end_time: 1710500400 = 2024-03-15 10:00:20 UTC
    const games = [makeGame({ end_time: 1710500400 })]
    const stats = computeCalendarStats(games, 'alice')
    const hour10 = stats.hourOfDay.find((h) => h.hour === new Date(1710500400 * 1000).getHours())
    expect(hour10?.games).toBe(1)
    expect(stats.hourOfDay).toHaveLength(24)
  })

  it('counts games by day of week', () => {
    const games = [makeGame({ end_time: 1710500400 })]
    const stats = computeCalendarStats(games, 'alice')
    expect(stats.dayOfWeek).toHaveLength(7)
    const totalGames = stats.dayOfWeek.reduce((sum, d) => sum + d.games, 0)
    expect(totalGames).toBe(1)
  })
})

// ─── computeAccuracyStats ────────────────────────────────────────────────────

describe('computeAccuracyStats', () => {
  it('computes average accuracy from analyzed games', () => {
    const games = [
      makeGame({ accuracies: { white: 90, black: 80 } }),
      makeGame({ uuid: 'g2', accuracies: { white: 80, black: 70 }, white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-2' }, black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-2' } }),
    ]
    const stats = computeAccuracyStats(games, 'alice')
    expect(stats.average).toBe(85)
  })

  it('returns null average when no games have accuracies', () => {
    const game = makeGame()
    delete (game as Partial<ChessGame>).accuracies
    const stats = computeAccuracyStats([game], 'alice')
    expect(stats.average).toBeNull()
  })

  it('skips games without accuracy data', () => {
    const withAccuracy = makeGame({ accuracies: { white: 90, black: 80 } })
    const withoutAccuracy = makeGame({ uuid: 'g2' })
    delete (withoutAccuracy as Partial<ChessGame>).accuracies
    const stats = computeAccuracyStats([withAccuracy, withoutAccuracy], 'alice')
    expect(stats.history).toHaveLength(1)
    expect(stats.average).toBe(90)
  })
})

// ─── computeCastlingStats ────────────────────────────────────────────────────

describe('computeCastlingStats', () => {
  it('counts kingside, queenside, and no-castle games', () => {
    const kingsideGame = makeGame({ pgn: '[White "alice"]\n1. e4 e5 2. O-O *' })
    const queensideGame = makeGame({ uuid: 'g2', pgn: '[White "alice"]\n1. d4 d5 2. O-O-O *', white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-2' }, black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-2' } })
    const noCastleGame = makeGame({ uuid: 'g3', pgn: '[White "alice"]\n1. e4 e5 *', white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-3' }, black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-3' } })

    const stats = computeCastlingStats([kingsideGame, queensideGame, noCastleGame], 'alice')
    expect(stats.counts.kingside).toBe(1)
    expect(stats.counts.queenside).toBe(1)
    expect(stats.counts.none).toBe(1)
  })

  it('computes win rates per castling type', () => {
    const winKingside = makeGame({ pgn: '[White "alice"]\n1. e4 O-O *', white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-1' }, black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-1' } })
    const lossKingside = makeGame({ uuid: 'g2', pgn: '[White "alice"]\n1. e4 O-O *', white: { rating: 1500, result: 'checkmated', username: 'alice', uuid: 'w-2' }, black: { rating: 1480, result: 'win', username: 'bob', uuid: 'b-2' } })

    const stats = computeCastlingStats([winKingside, lossKingside], 'alice')
    expect(stats.kingsideWinPct).toBe(50)
  })
})

// ─── computePieceMoveFrequency ────────────────────────────────────────────────

describe('computePieceMoveFrequency', () => {
  it('counts pawn, knight, bishop, rook moves for white player', () => {
    // 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Re1 d6
    const game = makeGame({
      pgn: '[White "alice"]\n[Black "bob"]\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Re1 d6 *',
    })
    const counts = computePieceMoveFrequency([game], 'alice')
    expect(counts.pawn).toBe(1)   // e4
    expect(counts.knight).toBe(1) // Nf3
    expect(counts.bishop).toBe(1) // Bb5
    expect(counts.rook).toBe(1)   // Re1
    expect(counts.queen).toBe(0)
    expect(counts.king).toBe(0)
  })

  it('counts castling as king move', () => {
    const game = makeGame({
      pgn: '[White "alice"]\n[Black "bob"]\n1. e4 e5 2. Nf3 Nc6 3. O-O Nf6 *',
    })
    const counts = computePieceMoveFrequency([game], 'alice')
    expect(counts.king).toBe(1) // O-O
    expect(counts.knight).toBe(1) // Nf3
  })

  it('counts black player moves correctly', () => {
    // black (bob): e5 (pawn), Nc6 (knight), a6 (pawn)
    const game = makeGame({
      pgn: '[White "alice"]\n[Black "bob"]\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *',
    })
    const counts = computePieceMoveFrequency([game], 'bob')
    expect(counts.pawn).toBe(2)   // e5, a6
    expect(counts.knight).toBe(1) // Nc6
    expect(counts.bishop).toBe(0) // Bb5 is alice's
  })

  it('ignores comments and NAGs in PGN', () => {
    const game = makeGame({
      pgn: '[White "alice"]\n[Black "bob"]\n1. e4 { [%clk 0:10:00] } e5 2. Nf3 $1 Nc6 *',
    })
    const counts = computePieceMoveFrequency([game], 'alice')
    expect(counts.pawn).toBe(1)   // e4
    expect(counts.knight).toBe(1) // Nf3
  })

  it('accumulates across multiple games', () => {
    const g1 = makeGame({ pgn: '[White "alice"]\n[Black "bob"]\n1. e4 e5 *' })
    const g2 = makeGame({ uuid: 'g2', pgn: '[White "alice"]\n[Black "bob"]\n1. d4 d5 *' })
    const counts = computePieceMoveFrequency([g1, g2], 'alice')
    expect(counts.pawn).toBe(2) // e4, d4
  })
})

// ─── computeAccuracyDistribution ─────────────────────────────────────────────

describe('computeAccuracyDistribution', () => {
  it('returns 10 buckets from 0 to 100', () => {
    const dist = computeAccuracyDistribution([])
    expect(dist).toHaveLength(10)
    expect(dist[0].min).toBe(0)
    expect(dist[9].max).toBe(100)
  })

  it('places games in correct buckets', () => {
    const history = [
      { accuracy: 95 },  // bucket 9 (90-100)
      { accuracy: 72 },  // bucket 7 (70-80)
      { accuracy: 55 },  // bucket 5 (50-60)
      { accuracy: 100 }, // bucket 9 (edge: clamped to last bucket)
    ]
    const dist = computeAccuracyDistribution(history)
    expect(dist[9].count).toBe(2) // 95 and 100
    expect(dist[7].count).toBe(1) // 72
    expect(dist[5].count).toBe(1) // 55
    expect(dist[0].count).toBe(0)
  })

  it('has correct bucket labels', () => {
    const dist = computeAccuracyDistribution([])
    expect(dist[0].bucket).toBe('0–10')
    expect(dist[5].bucket).toBe('50–60')
    expect(dist[9].bucket).toBe('90–100')
  })
})

// ─── extractOpponentUsernames ─────────────────────────────────────────────────

describe('extractOpponentUsernames', () => {
  it('extracts unique opponent usernames', () => {
    const games = [
      makeGame(), // alice vs bob
      makeGame({ uuid: 'g2', white: { rating: 1480, result: 'win', username: 'bob', uuid: 'w-2' }, black: { rating: 1500, result: 'checkmated', username: 'alice', uuid: 'b-2' } }), // alice vs bob again
      makeGame({ uuid: 'g3', white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-3' }, black: { rating: 1480, result: 'resigned', username: 'carol', uuid: 'b-3' } }),
    ]
    const opponents = extractOpponentUsernames(games, 'alice')
    expect(opponents).toHaveLength(2) // bob and carol (deduplicated)
    expect(opponents).toContain('bob')
    expect(opponents).toContain('carol')
  })

  it('normalises usernames to lowercase', () => {
    const game = makeGame({ black: { rating: 1480, result: 'resigned', username: 'BOB', uuid: 'b-1' } })
    const opponents = extractOpponentUsernames([game], 'alice')
    expect(opponents).toContain('bob')
  })
})

// ─── computeOpponentCountryStats ─────────────────────────────────────────────

describe('computeOpponentCountryStats', () => {
  it('tallies countries from countryMap', () => {
    const games = [
      makeGame({ black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-1' } }),
      makeGame({ uuid: 'g2', white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-2' }, black: { rating: 1480, result: 'resigned', username: 'carol', uuid: 'b-2' } }),
    ]
    const countryMap = { bob: 'US', carol: 'DE' }
    const stats = computeOpponentCountryStats(games, 'alice', countryMap)
    expect(stats).toHaveLength(2)
    expect(stats.find((s) => s.country === 'US')?.count).toBe(1)
    expect(stats.find((s) => s.country === 'DE')?.count).toBe(1)
  })

  it('sorts by count descending', () => {
    const games = [
      makeGame({ black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-1' } }),
      makeGame({ uuid: 'g2', white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-2' }, black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-2' } }),
      makeGame({ uuid: 'g3', white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-3' }, black: { rating: 1480, result: 'resigned', username: 'carol', uuid: 'b-3' } }),
    ]
    const countryMap = { bob: 'US', carol: 'DE' }
    const stats = computeOpponentCountryStats(games, 'alice', countryMap)
    expect(stats[0].country).toBe('US') // 2 games
    expect(stats[1].country).toBe('DE') // 1 game
  })

  it('skips opponents not in countryMap', () => {
    const games = [makeGame({ black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-1' } })]
    const stats = computeOpponentCountryStats(games, 'alice', {})
    expect(stats).toHaveLength(0)
  })
})

// ─── computeActivityHeatmap ──────────────────────────────────────────────────

describe('computeActivityHeatmap', () => {
  it('groups games by calendar day', () => {
    // Two games on same day, one on another
    const games = [
      makeGame({ end_time: 1710500400 }), // 2024-03-15
      makeGame({ uuid: 'g2', end_time: 1710500400 }), // same day
      makeGame({ uuid: 'g3', end_time: 1710586800 }), // 2024-03-16
    ]
    const heatmap = computeActivityHeatmap(games, 'alice')
    const day15 = heatmap.find((d) => d.date === new Date(1710500400 * 1000).toISOString().slice(0, 10))
    const day16 = heatmap.find((d) => d.date === new Date(1710586800 * 1000).toISOString().slice(0, 10))
    expect(day15?.count).toBe(2)
    expect(day16?.count).toBe(1)
  })

  it('counts wins, losses, draws per day', () => {
    const winGame = makeGame({ end_time: 1710500400, white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-1' }, black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-1' } })
    const lossGame = makeGame({ uuid: 'g2', end_time: 1710500400, white: { rating: 1500, result: 'checkmated', username: 'alice', uuid: 'w-2' }, black: { rating: 1480, result: 'win', username: 'bob', uuid: 'b-2' } })
    const heatmap = computeActivityHeatmap([winGame, lossGame], 'alice')
    const day = heatmap[0]
    expect(day.wins).toBe(1)
    expect(day.losses).toBe(1)
    expect(day.count).toBe(2)
  })

  it('returns empty array for no games', () => {
    expect(computeActivityHeatmap([], 'alice')).toHaveLength(0)
  })

  it('sorts by date ascending', () => {
    const games = [
      makeGame({ uuid: 'g2', end_time: 1710586800 }),
      makeGame({ end_time: 1710500400 }),
    ]
    const heatmap = computeActivityHeatmap(games, 'alice')
    expect(heatmap[0].date < heatmap[1].date).toBe(true)
  })
})

// ─── computeTacticsStats ─────────────────────────────────────────────────────

describe('computeTacticsStats', () => {
  // Fool's mate: quickest checkmate — White gets mated in 2 moves
  // Black delivers checkmate: 1. f3 e5 2. g4 Qh4#
  const FOOLS_MATE_PGN = '1. f3 e5 2. g4 Qh4#'

  it('detects a played mate (matesPlayed)', () => {
    // Alice is black and delivers Qh4#
    const game = makeGame({
      pgn: FOOLS_MATE_PGN,
      white: { rating: 1500, result: 'checkmated', username: 'carol', uuid: 'w-1' },
      black: { rating: 1480, result: 'win', username: 'alice', uuid: 'b-1' },
    })
    const stats = computeTacticsStats([game], 'alice')
    expect(stats.matesPlayed).toBeGreaterThanOrEqual(1)
    expect(stats.gamesAnalyzed).toBe(1)
  })

  it('returns zero counts for a normal game with no tactics', () => {
    // Short game that ends with resignation, no mate-in-1 positions
    const game = makeGame({
      pgn: '1. e4 e5 2. Nf3 Nc6 *',
      white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-1' },
      black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-1' },
    })
    const stats = computeTacticsStats([game], 'alice')
    expect(stats.gamesAnalyzed).toBe(1)
    expect(stats.missedMates + stats.matesPlayed).toBe(0)
  })

  it('handles empty games array', () => {
    const stats = computeTacticsStats([], 'alice')
    expect(stats.gamesAnalyzed).toBe(0)
    expect(stats.missedMates).toBe(0)
    expect(stats.matesPlayed).toBe(0)
  })
})

// ─── computeGamePhaseStats ───────────────────────────────────────────────────

describe('computeGamePhaseStats', () => {
  it('assigns games to correct phase based on move count', () => {
    const shortGame = makeGame({ pgn: '[White "alice"]\n1. e4 e5 2. Nf3 Nc6 *', white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-1' }, black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-1' } })
    const longGame = makeGame({
      uuid: 'g2',
      pgn: Array.from({ length: 45 }, (_, i) => `${i + 1}. e4 e5`).join(' '),
      white: { rating: 1500, result: 'win', username: 'alice', uuid: 'w-2' },
      black: { rating: 1480, result: 'resigned', username: 'bob', uuid: 'b-2' },
    })

    const stats = computeGamePhaseStats([shortGame, longGame], 'alice')
    expect(stats.opening.wins).toBe(1)
    expect(stats.endgame.wins).toBe(1)
    expect(stats.middlegame.wins).toBe(0)
  })
})
