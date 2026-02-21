/**
 * Zustand store for chess game data.
 * Manages player profile, stats, archives, and processed game data.
 */
import { create } from 'zustand'
import type { PlayerProfile, PlayerStats, ChessGame } from '../services/chessApi'

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface FetchProgress {
  totalMonths: number
  fetchedMonths: number
  totalGames: number
}

interface GameStore {
  username: string | null
  profile: PlayerProfile | null
  stats: PlayerStats | null
  games: ChessGame[]
  loadingState: LoadingState
  error: string | null
  progress: FetchProgress
  // Geography: map of lowercase opponent username → ISO country code
  opponentCountries: Record<string, string>
  countriesLoadingState: LoadingState

  setUsername: (username: string) => void
  setProfile: (profile: PlayerProfile) => void
  setStats: (stats: PlayerStats) => void
  appendGames: (newGames: ChessGame[]) => void
  setLoadingState: (state: LoadingState) => void
  setError: (error: string | null) => void
  setProgress: (progress: Partial<FetchProgress>) => void
  setOpponentCountries: (countries: Record<string, string>) => void
  setCountriesLoadingState: (state: LoadingState) => void
  reset: () => void
}

const initialProgress: FetchProgress = {
  totalMonths: 0,
  fetchedMonths: 0,
  totalGames: 0,
}

export const useGameStore = create<GameStore>((set) => ({
  username: null,
  profile: null,
  stats: null,
  games: [],
  loadingState: 'idle',
  error: null,
  progress: initialProgress,
  opponentCountries: {},
  countriesLoadingState: 'idle',

  setUsername: (username) => set({ username }),
  setProfile: (profile) => set({ profile }),
  setStats: (stats) => set({ stats }),
  appendGames: (newGames) =>
    set((state) => ({ games: [...state.games, ...newGames] })),
  setLoadingState: (loadingState) => set({ loadingState }),
  setError: (error) => set({ error }),
  setProgress: (progress) =>
    set((state) => ({ progress: { ...state.progress, ...progress } })),
  setOpponentCountries: (opponentCountries) => set({ opponentCountries }),
  setCountriesLoadingState: (countriesLoadingState) => set({ countriesLoadingState }),
  reset: () =>
    set({
      username: null,
      profile: null,
      stats: null,
      games: [],
      loadingState: 'idle',
      error: null,
      progress: initialProgress,
      opponentCountries: {},
      countriesLoadingState: 'idle',
    }),
}))
