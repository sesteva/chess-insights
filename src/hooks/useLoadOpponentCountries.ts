/**
 * Lazily fetches opponent country codes after the main games load completes.
 * Batches requests in groups of 5 with 150ms delays to avoid rate limiting.
 */
import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { fetchPlayerCountry } from '../services/chessApi'
import { extractOpponentUsernames } from '../utils/gameAnalysis'

const BATCH_SIZE = 5
const BATCH_DELAY_MS = 150

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function useLoadOpponentCountries() {
  const { games, username, loadingState, setOpponentCountries, setCountriesLoadingState } =
    useGameStore()
  const fetchedRef = useRef(false)

  useEffect(() => {
    // Only run once when games have finished loading
    if (loadingState !== 'success' || games.length === 0 || !username || fetchedRef.current) return

    fetchedRef.current = true

    async function fetchAll() {
      setCountriesLoadingState('loading')
      const opponents = extractOpponentUsernames(games, username!)
      const result: Record<string, string> = {}

      for (let i = 0; i < opponents.length; i += BATCH_SIZE) {
        const batch = opponents.slice(i, i + BATCH_SIZE)
        const resolved = await Promise.all(batch.map((opp) => fetchPlayerCountry(opp)))

        batch.forEach((opp, idx) => {
          const code = resolved[idx]
          if (code) result[opp] = code
        })

        // Update incrementally so the UI can show partial results
        setOpponentCountries({ ...result })

        if (i + BATCH_SIZE < opponents.length) {
          await sleep(BATCH_DELAY_MS)
        }
      }

      setCountriesLoadingState('success')
    }

    fetchAll().catch(() => setCountriesLoadingState('error'))
  }, [loadingState, games, username, setOpponentCountries, setCountriesLoadingState])
}
