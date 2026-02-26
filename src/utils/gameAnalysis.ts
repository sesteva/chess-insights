/**
 * Game analysis utilities — pure functions that derive insights from raw game data.
 * All functions are synchronous and take arrays of ChessGame as input.
 */

import { Chess } from 'chess.js'
import type { ChessGame } from '../services/chessApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PieceMoveCounts {
  pawn: number
  knight: number
  bishop: number
  rook: number
  queen: number
  king: number
}

export interface AccuracyBucket {
  bucket: string  // "0–10", "10–20", etc.
  min: number
  max: number
  count: number
}

export type GameResult = 'win' | 'loss' | 'draw'

export interface GameResultCounts {
  wins: number
  losses: number
  draws: number
  total: number
  winPct: number
  lossPct: number
  drawPct: number
}

export interface OpeningStats {
  eco: string
  name: string
  count: number
  wins: number
  losses: number
  draws: number
  winPct: number
}

export interface RatingPoint {
  date: number // Unix timestamp
  rating: number
  gameType: string
}

export interface CalendarStats {
  hourOfDay: Array<{ hour: number; games: number; wins: number; winPct: number }>
  dayOfWeek: Array<{ day: number; label: string; games: number; wins: number; winPct: number }>
}

export interface AccuracyStats {
  average: number | null
  byGameType: Record<string, number>
  history: Array<{ date: number; accuracy: number; gameType: string }>
}

export interface CastlingStats {
  kingsidePct: number
  queensidePct: number
  noCastlePct: number
  kingsideWinPct: number
  queensideWinPct: number
  noCastleWinPct: number
  counts: { kingside: number; queenside: number; none: number }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Determine if the given username played as white in a game */
export function playedAsWhite(game: ChessGame, username: string): boolean {
  return game.white.username.toLowerCase() === username.toLowerCase()
}

/** Get the result (win/loss/draw) for the username in a game */
export function getResult(game: ChessGame, username: string): GameResult {
  const asWhite = playedAsWhite(game, username)
  const result = asWhite ? game.white.result : game.black.result
  if (result === 'win') return 'win'
  const draws = ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient']
  if (draws.includes(result)) return 'draw'
  return 'loss'
}

/** Derive a human-readable opening name from a Chess.com ECOUrl.
 *  e.g. "https://www.chess.com/openings/Queens-Pawn-Game-2.Nf3-Nf6" → "Queens Pawn Game"
 */
function parseOpeningNameFromUrl(url: string): string {
  const path = url.split('/openings/')[1]
  if (!path) return 'Unknown Opening'
  // Split on hyphens; stop when we hit a move-number token like "2.Nf3"
  const nameParts: string[] = []
  for (const part of path.split('-')) {
    if (/^\d+\./.test(part)) break
    nameParts.push(part)
  }
  return nameParts.join(' ') || 'Unknown Opening'
}

/** Extract ECO code and opening name from a PGN string */
export function extractOpening(pgn: string): { eco: string; name: string } {
  const ecoMatch = pgn.match(/\[ECO "([^"]+)"\]/)
  const openingMatch = pgn.match(/\[Opening "([^"]+)"\]/)
  const ecoUrlMatch = pgn.match(/\[ECOUrl "([^"]+)"\]/)

  let name = 'Unknown Opening'
  if (openingMatch?.[1]) {
    name = openingMatch[1]
  } else if (ecoUrlMatch?.[1]) {
    name = parseOpeningNameFromUrl(ecoUrlMatch[1])
  }

  return {
    eco: ecoMatch?.[1] ?? 'Unknown',
    name,
  }
}

/** Compute win percentage safely */
function winPct(wins: number, total: number): number {
  if (total === 0) return 0
  return Math.round((wins / total) * 100)
}

function makeResultCounts(wins: number, losses: number, draws: number): GameResultCounts {
  const total = wins + losses + draws
  return {
    wins,
    losses,
    draws,
    total,
    winPct: winPct(wins, total),
    lossPct: winPct(losses, total),
    drawPct: winPct(draws, total),
  }
}

// ─── Analysis functions ───────────────────────────────────────────────────────

/** Overall win/loss/draw counts for a username */
export function computeResultCounts(
  games: ChessGame[],
  username: string,
): GameResultCounts {
  let wins = 0, losses = 0, draws = 0
  for (const game of games) {
    const r = getResult(game, username)
    if (r === 'win') wins++
    else if (r === 'loss') losses++
    else draws++
  }
  return makeResultCounts(wins, losses, draws)
}

/** Rating over time per game type */
export function computeRatingHistory(
  games: ChessGame[],
  username: string,
): RatingPoint[] {
  const points: RatingPoint[] = []
  for (const game of games) {
    const asWhite = playedAsWhite(game, username)
    const rating = asWhite ? game.white.rating : game.black.rating
    points.push({ date: game.end_time, rating, gameType: game.time_class })
  }
  // Sort oldest first
  return points.sort((a, b) => a.date - b.date)
}

/** Top N openings as White or Black with win/loss/draw stats */
export function computeOpeningStats(
  games: ChessGame[],
  username: string,
  color: 'white' | 'black',
  topN = 10,
): OpeningStats[] {
  const map = new Map<string, { eco: string; name: string; wins: number; losses: number; draws: number }>()

  for (const game of games) {
    const asWhite = playedAsWhite(game, username)
    if ((color === 'white') !== asWhite) continue

    const { eco, name } = extractOpening(game.pgn)
    const key = eco

    const existing = map.get(key) ?? { eco, name, wins: 0, losses: 0, draws: 0 }
    const r = getResult(game, username)
    if (r === 'win') existing.wins++
    else if (r === 'loss') existing.losses++
    else existing.draws++
    map.set(key, existing)
  }

  return Array.from(map.values())
    .map((o) => ({
      ...o,
      count: o.wins + o.losses + o.draws,
      winPct: winPct(o.wins, o.wins + o.losses + o.draws),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

/** Calendar stats: games/wins by hour of day and day of week */
export function computeCalendarStats(
  games: ChessGame[],
  username: string,
): CalendarStats {
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const hourMap = new Map<number, { games: number; wins: number }>()
  const dayMap = new Map<number, { games: number; wins: number }>()

  for (let h = 0; h < 24; h++) hourMap.set(h, { games: 0, wins: 0 })
  for (let d = 0; d < 7; d++) dayMap.set(d, { games: 0, wins: 0 })

  for (const game of games) {
    const date = new Date(game.end_time * 1000)
    const hour = date.getHours()
    const day = date.getDay()
    const isWin = getResult(game, username) === 'win'

    const hEntry = hourMap.get(hour)!
    hEntry.games++
    if (isWin) hEntry.wins++

    const dEntry = dayMap.get(day)!
    dEntry.games++
    if (isWin) dEntry.wins++
  }

  return {
    hourOfDay: Array.from(hourMap.entries()).map(([hour, { games, wins }]) => ({
      hour,
      games,
      wins,
      winPct: winPct(wins, games),
    })),
    dayOfWeek: Array.from(dayMap.entries()).map(([day, { games, wins }]) => ({
      day,
      label: DAY_LABELS[day],
      games,
      wins,
      winPct: winPct(wins, games),
    })),
  }
}

/** Accuracy stats from chess.com's analyzed games */
export function computeAccuracyStats(
  games: ChessGame[],
  username: string,
): AccuracyStats {
  const history: Array<{ date: number; accuracy: number; gameType: string }> = []
  const byTypeSum = new Map<string, { sum: number; count: number }>()

  for (const game of games) {
    if (!game.accuracies) continue
    const asWhite = playedAsWhite(game, username)
    const accuracy = asWhite ? game.accuracies.white : game.accuracies.black

    history.push({ date: game.end_time, accuracy, gameType: game.time_class })

    const entry = byTypeSum.get(game.time_class) ?? { sum: 0, count: 0 }
    entry.sum += accuracy
    entry.count++
    byTypeSum.set(game.time_class, entry)
  }

  const byGameType: Record<string, number> = {}
  for (const [type, { sum, count }] of byTypeSum.entries()) {
    byGameType[type] = Math.round((sum / count) * 10) / 10
  }

  const allAccuracies = history.map((h) => h.accuracy)
  const average =
    allAccuracies.length > 0
      ? Math.round((allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length) * 10) / 10
      : null

  return {
    average,
    byGameType,
    history: history.sort((a, b) => a.date - b.date),
  }
}

/** Detect castling type from PGN moves string */
export function detectCastling(pgn: string): 'kingside' | 'queenside' | 'none' {
  // Extract moves section (after the headers)
  const movesSection = pgn.replace(/\[[^\]]*\]\s*/g, '').trim()
  // O-O-O is queenside (check before O-O to avoid partial match)
  if (/\bO-O-O\b/.test(movesSection)) return 'queenside'
  if (/\bO-O\b/.test(movesSection)) return 'kingside'
  return 'none'
}

/** Castling stats: frequency and win rates by castling type */
export function computeCastlingStats(
  games: ChessGame[],
  username: string,
): CastlingStats {
  const counts = { kingside: 0, queenside: 0, none: 0 }
  const wins = { kingside: 0, queenside: 0, none: 0 }

  for (const game of games) {
    const castling = detectCastling(game.pgn)
    const isWin = getResult(game, username) === 'win'
    counts[castling]++
    if (isWin) wins[castling]++
  }

  const total = games.length

  return {
    kingsidePct: Math.round((counts.kingside / total) * 100) || 0,
    queensidePct: Math.round((counts.queenside / total) * 100) || 0,
    noCastlePct: Math.round((counts.none / total) * 100) || 0,
    kingsideWinPct: winPct(wins.kingside, counts.kingside),
    queensideWinPct: winPct(wins.queenside, counts.queenside),
    noCastleWinPct: winPct(wins.none, counts.none),
    counts,
  }
}

/** Classify game phase by move count: opening <12 moves, middlegame <40, endgame 40+ */
export function classifyGamePhase(pgn: string): 'opening' | 'middlegame' | 'endgame' {
  // Count move numbers from the PGN (e.g., "1." "2." etc.)
  const moveNumbers = pgn.match(/\d+\./g)
  const moveCount = moveNumbers ? moveNumbers.length : 0
  if (moveCount < 12) return 'opening'
  if (moveCount < 40) return 'middlegame'
  return 'endgame'
}

/**
 * Parse the moves section from a PGN string.
 * Strips headers, comments, variations, NAGs, and result markers.
 * Returns an array of tokens alternating white/black moves (index 0 = white's first move).
 */
function parsePgnMoveTokens(pgn: string): string[] {
  return pgn
    // Remove header tags
    .replace(/\[[^\]]*\]\s*/g, '')
    // Remove block comments { ... }
    .replace(/\{[^}]*\}/g, '')
    // Remove variation parentheses (non-nested) — chess.com PGN rarely nests
    .replace(/\([^)]*\)/g, '')
    // Remove NAGs ($18, $1, etc.)
    .replace(/\$\d+/g, '')
    // Remove result marker
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    // Skip move-number tokens: "1." or "1..." (both match /^\d+\./)
    .filter((t) => !/^\d+\./.test(t))
}

/** Identify the piece type from a single move notation token */
function classifyMove(move: string): keyof PieceMoveCounts | null {
  if (move.startsWith('O')) return 'king'   // O-O or O-O-O (castling)
  if (move.startsWith('N')) return 'knight'
  if (move.startsWith('B')) return 'bishop'
  if (move.startsWith('R')) return 'rook'
  if (move.startsWith('Q')) return 'queen'
  if (/^[a-h]/.test(move)) return 'pawn'
  return null
}

/** Count piece moves per piece type for a given player across all games */
export function computePieceMoveFrequency(
  games: ChessGame[],
  username: string,
): PieceMoveCounts {
  const counts: PieceMoveCounts = { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0, king: 0 }

  for (const game of games) {
    const asWhite = playedAsWhite(game, username)
    const tokens = parsePgnMoveTokens(game.pgn)
    // Tokens alternate: white(0), black(1), white(2), black(3), ...
    for (let i = asWhite ? 0 : 1; i < tokens.length; i += 2) {
      const piece = classifyMove(tokens[i])
      if (piece) counts[piece]++
    }
  }

  return counts
}

/** Accuracy distribution: count of games per 10-point accuracy bucket */
export function computeAccuracyDistribution(
  history: Array<{ accuracy: number }>,
): AccuracyBucket[] {
  const buckets: AccuracyBucket[] = Array.from({ length: 10 }, (_, i) => ({
    bucket: `${i * 10}–${(i + 1) * 10}`,
    min: i * 10,
    max: (i + 1) * 10,
    count: 0,
  }))

  for (const { accuracy } of history) {
    const idx = Math.min(Math.floor(accuracy / 10), 9)
    buckets[idx].count++
  }

  return buckets
}

/** Win/loss/draw by game phase */
export function computeGamePhaseStats(
  games: ChessGame[],
  username: string,
): Record<'opening' | 'middlegame' | 'endgame', GameResultCounts> {
  const phaseData = {
    opening: { wins: 0, losses: 0, draws: 0 },
    middlegame: { wins: 0, losses: 0, draws: 0 },
    endgame: { wins: 0, losses: 0, draws: 0 },
  }

  for (const game of games) {
    const phase = classifyGamePhase(game.pgn)
    const r = getResult(game, username)
    if (r === 'win') phaseData[phase].wins++
    else if (r === 'loss') phaseData[phase].losses++
    else phaseData[phase].draws++
  }

  return {
    opening: makeResultCounts(phaseData.opening.wins, phaseData.opening.losses, phaseData.opening.draws),
    middlegame: makeResultCounts(phaseData.middlegame.wins, phaseData.middlegame.losses, phaseData.middlegame.draws),
    endgame: makeResultCounts(phaseData.endgame.wins, phaseData.endgame.losses, phaseData.endgame.draws),
  }
}

// ─── Activity heatmap ─────────────────────────────────────────────────────────

export interface DayActivity {
  date: string  // "YYYY-MM-DD"
  count: number
  wins: number
  losses: number
  draws: number
}

/** Count games played per calendar day (for the GitHub-style heatmap) */
export function computeActivityHeatmap(
  games: ChessGame[],
  username: string,
): DayActivity[] {
  const dayMap = new Map<string, DayActivity>()

  for (const game of games) {
    const date = new Date(game.end_time * 1000).toISOString().slice(0, 10)
    const result = getResult(game, username)
    const entry = dayMap.get(date) ?? { date, count: 0, wins: 0, losses: 0, draws: 0 }
    entry.count++
    if (result === 'win') entry.wins++
    else if (result === 'loss') entry.losses++
    else entry.draws++
    dayMap.set(date, entry)
  }

  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// ─── Tactics ─────────────────────────────────────────────────────────────────

export interface TacticsStats {
  gamesAnalyzed: number
  missedMates: number  // had mate-in-1 but didn't play it
  matesPlayed: number  // correctly played a mating move
}

/** Return unique opponent usernames (lowercase) across all games */
export function extractOpponentUsernames(games: ChessGame[], username: string): string[] {
  const opponents = new Set<string>()
  for (const game of games) {
    const asWhite = playedAsWhite(game, username)
    const opp = (asWhite ? game.black.username : game.white.username).toLowerCase()
    opponents.add(opp)
  }
  return Array.from(opponents)
}

/**
 * Analyse a sample of games with chess.js to detect missed mate-in-1 opportunities.
 * Checks every position where it is the player's turn; if any legal move leads to
 * immediate checkmate, it records whether the player played it.
 *
 * Limited to the 100 most-recent games to keep runtime reasonable.
 */
export function computeTacticsStats(
  games: ChessGame[],
  username: string,
): TacticsStats {
  let missedMates = 0
  let matesPlayed = 0

  // Analyse only the most recent games for performance
  const sample = [...games].sort((a, b) => b.end_time - a.end_time).slice(0, 100)

  for (const game of sample) {
    try {
      // Load full game to extract move history
      const fullGame = new Chess()
      fullGame.loadPgn(game.pgn)
      const history = fullGame.history()

      const asWhite = playedAsWhite(game, username)
      const board = new Chess()

      for (let i = 0; i < history.length; i++) {
        const isPlayerTurn = (board.turn() === 'w') === asWhite

        if (isPlayerTurn) {
          // Check if any legal move produces immediate checkmate
          const moves = board.moves() as string[]
          let hasMateInOne = false
          for (const m of moves) {
            board.move(m)
            if (board.isCheckmate()) hasMateInOne = true
            board.undo()
            if (hasMateInOne) break
          }

          if (hasMateInOne) {
            board.move(history[i])
            if (board.isCheckmate()) {
              matesPlayed++
            } else {
              missedMates++
            }
          } else {
            board.move(history[i])
          }
        } else {
          board.move(history[i])
        }
      }
    } catch {
      // Skip games with invalid/unparseable PGN
    }
  }

  return {
    gamesAnalyzed: sample.length,
    missedMates,
    matesPlayed,
  }
}

/** Aggregate opponent country counts from a username→countryCode map */
export function computeOpponentCountryStats(
  games: ChessGame[],
  username: string,
  countryMap: Record<string, string>,
): Array<{ country: string; count: number }> {
  const tally = new Map<string, number>()
  for (const game of games) {
    const asWhite = playedAsWhite(game, username)
    const opp = (asWhite ? game.black.username : game.white.username).toLowerCase()
    const country = countryMap[opp]
    if (country) tally.set(country, (tally.get(country) ?? 0) + 1)
  }
  return Array.from(tally.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
}
