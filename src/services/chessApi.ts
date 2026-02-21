/**
 * Chess.com Public API (PubAPI) service layer
 *
 * Base URL: https://api.chess.com/pub
 * Read-only, no authentication required.
 * Data format: JSON-LD
 *
 * Reference: https://www.chess.com/announcements/view/published-data-api
 */

const BASE_URL = 'https://api.chess.com/pub'

const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'Accept-Encoding': 'gzip',
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class ChessApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ChessApiError'
    this.status = status
    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, ChessApiError.prototype)
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerProfile {
  username: string
  player_id: number
  title?: string
  status: string
  name?: string
  avatar?: string
  location?: string
  country?: string
  joined: number
  last_online: number
  followers: number
  is_streamer?: boolean
  twitch_url?: string
  fide?: number
}

export interface RatingRecord {
  last: { rating: number; date: number; rd: number }
  best?: { rating: number; date: number; game: string }
  record: {
    win: number
    loss: number
    draw: number
    time_per_move?: number
    timeout_percent?: number
  }
}

export interface PlayerStats {
  chess_daily?: RatingRecord
  chess960_daily?: RatingRecord
  chess_rapid?: RatingRecord
  chess_blitz?: RatingRecord
  chess_bullet?: RatingRecord
  puzzle_rush?: {
    best?: { total_attempts: number; score: number }
    daily?: { total_attempts: number; score: number }
  }
}

export interface GamePlayer {
  rating: number
  result: string
  username: string
  uuid: string
  '@id'?: string
}

export interface ChessGame {
  url: string
  pgn: string
  time_control: string
  end_time: number
  rated: boolean
  accuracies?: { white: number; black: number }
  tcn?: string
  uuid: string
  initial_setup?: string
  fen?: string
  time_class: 'daily' | 'rapid' | 'blitz' | 'bullet'
  rules: string
  white: GamePlayer
  black: GamePlayer
}

// ─── Internal fetch helper ────────────────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { headers: DEFAULT_HEADERS })
  } catch (err) {
    throw new ChessApiError(
      `Network error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`,
      0,
    )
  }

  if (!response.ok) {
    throw new ChessApiError(
      `chess.com API error ${response.status} ${response.statusText} for ${url}`,
      response.status,
    )
  }

  return response.json() as Promise<T>
}

// ─── Public API functions ─────────────────────────────────────────────────────

/**
 * Fetch a player's public profile.
 * Username is normalised to lowercase as required by the API.
 */
export async function fetchPlayerProfile(username: string): Promise<PlayerProfile> {
  const lower = username.toLowerCase()
  return apiFetch<PlayerProfile>(`${BASE_URL}/player/${lower}`)
}

/**
 * Fetch a player's rating statistics across all game types.
 */
export async function fetchPlayerStats(username: string): Promise<PlayerStats> {
  const lower = username.toLowerCase()
  return apiFetch<PlayerStats>(`${BASE_URL}/player/${lower}/stats`)
}

/**
 * Fetch the list of monthly game archive URLs for a player.
 * Archives are returned in oldest-first order (chess.com returns them that way).
 */
export async function fetchGameArchives(username: string): Promise<string[]> {
  const lower = username.toLowerCase()
  const data = await apiFetch<{ archives: string[] }>(`${BASE_URL}/player/${lower}/games/archives`)
  return data.archives ?? []
}

/**
 * Fetch a player's 2-letter ISO country code (e.g. "US", "DE").
 * Returns null if the profile has no country or the request fails.
 */
export async function fetchPlayerCountry(username: string): Promise<string | null> {
  try {
    const profile = await fetchPlayerProfile(username)
    if (!profile.country) return null
    // country field is a URL: "https://api.chess.com/pub/country/US"
    return profile.country.split('/').pop() ?? null
  } catch {
    return null
  }
}

/**
 * Fetch all games for a player in a given year/month.
 * Month is 1-indexed (1 = January).
 */
export async function fetchMonthlyGames(
  username: string,
  year: number,
  month: number,
): Promise<ChessGame[]> {
  const lower = username.toLowerCase()
  const mm = String(month).padStart(2, '0')
  const data = await apiFetch<{ games: ChessGame[] }>(
    `${BASE_URL}/player/${lower}/games/${year}/${mm}`,
  )
  return data.games ?? []
}
