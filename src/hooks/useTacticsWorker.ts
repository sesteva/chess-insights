import { useState, useEffect } from 'react'
import type { ChessGame } from '../services/chessApi'
import type { TacticsStats } from '../utils/gameAnalysis'

export function useTacticsWorker(
  games: ChessGame[],
  username: string,
): { stats: TacticsStats | null; loading: boolean } {
  const [stats, setStats] = useState<TacticsStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (games.length === 0) {
      setStats(null)
      setLoading(false)
      return
    }

    setStats(null)
    setLoading(true)

    const worker = new Worker(
      new URL('../workers/tactics.worker.ts', import.meta.url),
      { type: 'module' },
    )

    worker.onmessage = (e: MessageEvent<TacticsStats>) => {
      setStats(e.data)
      setLoading(false)
    }

    worker.postMessage({ games, username })

    return () => {
      worker.terminate()
    }
  }, [games, username])

  return { stats, loading }
}
