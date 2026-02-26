import { computeTacticsStats } from '../utils/gameAnalysis'
import type { ChessGame } from '../services/chessApi'
import type { TacticsStats } from '../utils/gameAnalysis'

interface TacticsRequest {
  games: ChessGame[]
  username: string
}

self.onmessage = (e: MessageEvent<TacticsRequest>) => {
  const result: TacticsStats = computeTacticsStats(e.data.games, e.data.username)
  self.postMessage(result)
}
