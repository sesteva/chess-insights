# Tactics Web Worker — Design

**Date:** 2026-02-26
**Status:** Approved

## Problem

`computeTacticsStats` runs synchronously inside a `useMemo` in `InsightsDashboard.tsx`. It replays every game move-by-move with chess.js and checks all legal moves for mate-in-1 at each position — O(games × moves × legal_moves). Load testing shows this causes a **20-second main-thread freeze** at the current 30-game default cap, and ~33 seconds at 50 games. The browser is completely unresponsive during this time.

## Goal

Eliminate main-thread blocking for tactics computation. The dashboard should render immediately after games load; the TacticsCard fills in once the off-thread computation completes.

## Approach: Vite Native Web Worker

Vite has built-in Web Worker support via `new Worker(new URL(..., import.meta.url), { type: 'module' })`. Chess.js gets bundled into the worker chunk automatically — no config changes required.

`computeTacticsStats` itself is untouched; the worker simply imports and calls the existing function.

## Files

| File | Change |
|---|---|
| `src/workers/tactics.worker.ts` | New — worker entry point |
| `src/hooks/useTacticsWorker.ts` | New — hook managing worker lifecycle |
| `src/components/InsightsDashboard.tsx` | Replace `useMemo` call with hook |
| `src/components/insights/TacticsCard.tsx` | Add `loading` prop, show spinner |

## Data Flow

```
games load → InsightsDashboard renders (all cheap stats instant)
                      │
                      └─ useTacticsWorker(filteredGames, user)
                              ├─ terminates previous worker (if any)
                              ├─ sets loading: true, stats: null
                              ├─ creates new Worker(tactics.worker.ts)
                              └─ postMessage({ games, username })
                                        │
                                  [off main thread]
                                  computeTacticsStats runs
                                        │
                                  postMessage(result)
                                        │
                              hook receives result
                              sets stats, loading: false
                                        │
                              TacticsCard re-renders with real data
```

## Worker (`tactics.worker.ts`)

```ts
import { computeTacticsStats } from '../utils/gameAnalysis'
import type { ChessGame } from '../services/chessApi'
import type { TacticsStats } from '../utils/gameAnalysis'

self.onmessage = (e: MessageEvent<{ games: ChessGame[], username: string }>) => {
  const result: TacticsStats = computeTacticsStats(e.data.games, e.data.username)
  self.postMessage(result)
}
```

## Hook (`useTacticsWorker.ts`)

```ts
export function useTacticsWorker(games: ChessGame[], user: string) {
  const [stats, setStats] = useState<TacticsStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setStats(null)
    setLoading(true)
    const worker = new Worker(
      new URL('../workers/tactics.worker.ts', import.meta.url),
      { type: 'module' }
    )
    worker.onmessage = (e) => { setStats(e.data); setLoading(false) }
    worker.postMessage({ games, username: user })
    return () => worker.terminate()
  }, [games, user])

  return { stats, loading }
}
```

## TacticsCard

Receives `stats: TacticsStats | null` and `loading: boolean`. When `loading` is true, renders a spinner/skeleton in place of the numbers. When `stats` is null and not loading, renders a fallback.

## Worker Lifecycle

- Effect dep array is `[games, user]` — re-runs when filteredGames or username changes
- Cleanup function terminates the worker on unmount and on re-run (prevents stale results)
- No shared state — each worker run is isolated

## Testing

- `useTacticsWorker` is not unit-tested (Web Workers don't run in jsdom); tested implicitly via the Playwright load test
- `TacticsCard` unit test updated to cover the `loading=true` state (spinner renders)
- `computeTacticsStats` existing tests are unchanged
