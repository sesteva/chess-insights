# Tactics Web Worker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move `computeTacticsStats` off the main thread into a Web Worker so the dashboard renders immediately and the TacticsCard fills in asynchronously, eliminating the 20-second freeze at N=30.

**Architecture:** A new `tactics.worker.ts` imports and calls the existing `computeTacticsStats` function. A new `useTacticsWorker` hook creates/terminates the worker reactively. `InsightsDashboard` replaces its `useMemo` call with the hook and passes `loading` down to `TacticsCard`.

**Tech Stack:** Vite native Web Worker (`new Worker(new URL(...), { type: 'module' })`), React `useState`/`useEffect`, `@testing-library/react` for component tests, Vitest

---

### Task 1: Add `loading` prop to TacticsCard (TDD)

**Files:**
- Create: `src/components/insights/__tests__/TacticsCard.test.tsx`
- Modify: `src/components/insights/TacticsCard.tsx`

**Step 1: Write the failing tests**

Create `src/components/insights/__tests__/TacticsCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TacticsCard } from '../TacticsCard'
import type { TacticsStats } from '../../../utils/gameAnalysis'

const sampleStats: TacticsStats = {
  gamesAnalyzed: 10,
  missedMates: 2,
  matesPlayed: 3,
}

describe('TacticsCard', () => {
  it('shows a loading indicator when loading=true', () => {
    render(<TacticsCard stats={null} loading={true} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders stats when loading=false and stats provided', () => {
    render(<TacticsCard stats={sampleStats} loading={false} />)
    expect(screen.getByText('10')).toBeInTheDocument() // gamesAnalyzed
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders a fallback when stats is null and not loading', () => {
    render(<TacticsCard stats={null} loading={false} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    // Fallback text is present (no stats yet but not loading either)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- --reporter=verbose src/components/insights/__tests__/TacticsCard.test.tsx
```

Expected: 3 failures (TacticsCard doesn't accept `loading` or `stats: null` yet)

**Step 3: Update TacticsCard to support loading and nullable stats**

Replace the contents of `src/components/insights/TacticsCard.tsx`:

```tsx
import type { TacticsStats } from '../../utils/gameAnalysis'

interface Props {
  stats: TacticsStats | null
  loading: boolean
}

export function TacticsCard({ stats, loading }: Props) {
  if (loading) {
    return (
      <div role="status" className="bg-gray-800 rounded-xl p-8 flex items-center justify-center gap-3 text-gray-400">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span>Analysing tactics…</span>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
        No data available.
      </div>
    )
  }

  const { gamesAnalyzed, missedMates, matesPlayed } = stats
  const totalMateOpportunities = missedMates + matesPlayed
  const mateFoundPct =
    totalMateOpportunities > 0 ? Math.round((matesPlayed / totalMateOpportunities) * 100) : null

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{gamesAnalyzed}</p>
          <p className="text-gray-400 text-sm mt-1">Games Analysed</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{matesPlayed}</p>
          <p className="text-gray-400 text-sm mt-1">Mates Played</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{missedMates}</p>
          <p className="text-gray-400 text-sm mt-1">Missed Mates</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-400">
            {mateFoundPct !== null ? `${mateFoundPct}%` : '—'}
          </p>
          <p className="text-gray-400 text-sm mt-1">Mate Conversion</p>
        </div>
      </div>

      {/* Visual progress bar */}
      {totalMateOpportunities > 0 && (
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Mate-in-1 Opportunities</span>
            <span>{totalMateOpportunities} found</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-500 h-3 rounded-full transition-all"
              style={{ width: `${mateFoundPct ?? 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span className="text-green-400">{matesPlayed} played ✓</span>
            <span className="text-red-400">{missedMates} missed ✗</span>
          </div>
        </div>
      )}

      {totalMateOpportunities === 0 && gamesAnalyzed > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 text-center text-gray-500 text-sm">
          No mate-in-1 opportunities detected in the analysed games.
        </div>
      )}

      <p className="text-gray-600 text-xs text-center">
        Analysis based on the {gamesAnalyzed} most recent games. Detects positions with a forced checkmate in one move.
      </p>
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose src/components/insights/__tests__/TacticsCard.test.tsx
```

Expected: 3 passed

**Step 5: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all pass

**Step 6: Commit**

```bash
git add src/components/insights/__tests__/TacticsCard.test.tsx src/components/insights/TacticsCard.tsx
git commit -m "feat: add loading prop to TacticsCard with spinner state"
```

---

### Task 2: Create the worker entry point

**Files:**
- Create: `src/workers/tactics.worker.ts`

> Note: Web Workers don't run in jsdom (Vitest's test environment), so there is no unit test for the worker itself. Its logic (`computeTacticsStats`) is already tested in `src/utils/__tests__/gameAnalysis.test.ts`.

**Step 1: Create `src/workers/tactics.worker.ts`**

```ts
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
```

**Step 2: Confirm TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 3: Commit**

```bash
git add src/workers/tactics.worker.ts
git commit -m "feat: add tactics web worker entry point"
```

---

### Task 3: Create `useTacticsWorker` hook

**Files:**
- Create: `src/hooks/useTacticsWorker.ts`

> Note: `useTacticsWorker` cannot be unit-tested in jsdom because `Worker` is not available. It will be verified end-to-end after wiring up in Task 4.

**Step 1: Create `src/hooks/useTacticsWorker.ts`**

```ts
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
```

**Step 2: Confirm TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 3: Commit**

```bash
git add src/hooks/useTacticsWorker.ts
git commit -m "feat: add useTacticsWorker hook for off-thread tactics analysis"
```

---

### Task 4: Wire up InsightsDashboard and verify

**Files:**
- Modify: `src/components/InsightsDashboard.tsx`

**Step 1: Replace the `useMemo` call with `useTacticsWorker`**

In `src/components/InsightsDashboard.tsx`:

1. Add the import at the top (after existing imports):
```ts
import { useTacticsWorker } from '../hooks/useTacticsWorker'
```

2. Remove the `computeTacticsStats` import from the destructured list on the `gameAnalysis` import line (line 15). The line currently reads:
```ts
import {
  computeResultCounts,
  ...
  computeTacticsStats,
} from '../utils/gameAnalysis'
```
Remove `computeTacticsStats,` from that list.

3. Replace line 74:
```ts
// REMOVE:
const tacticsStats   = useMemo(() => computeTacticsStats(filteredGames, user), [filteredGames, user])

// ADD:
const { stats: tacticsStats, loading: tacticsLoading } = useTacticsWorker(filteredGames, user)
```

4. Update the TacticsCard usage (around line 143):
```tsx
// BEFORE:
<TacticsCard stats={tacticsStats} />

// AFTER:
<TacticsCard stats={tacticsStats} loading={tacticsLoading} />
```

**Step 2: Run full test suite**

```bash
npm test
```

Expected: all pass (InsightsDashboard is not directly unit-tested; TacticsCard tests pass)

**Step 3: Confirm TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 4: Start dev server and do a manual smoke test**

```bash
npm run dev
```

Open http://localhost:5173, enter a username (e.g. `hikaru`), click Analyze.

Expected:
- Dashboard renders immediately after games load
- TacticsCard shows spinner ("Analysing tactics…")
- After a short while, TacticsCard updates with real numbers
- Browser stays responsive throughout (no freeze)

**Step 5: Commit**

```bash
git add src/components/InsightsDashboard.tsx
git commit -m "feat: move computeTacticsStats to web worker for non-blocking UI"
```

---

### Task 5: Re-run load test to confirm improvement

**Files:**
- Read: `tests/load/game-limit-sweep.spec.ts` (already configured)

**Step 1: Smoke test at N=30**

```bash
CHESS_TEST_FAIL_MS=9999999 npm run test:load
```

Expected:
- Dashboard renders in ~1-2s (not 30s)
- Longest task is under 100ms (tactics are off-thread)
- TacticsCard spinner visible in browser; results arrive asynchronously

> Note: The Playwright `waitForSelector` waits for `[data-testid="insights-dashboard"]` which renders before tactics complete — so TTR now reflects actual dashboard paint time, not tactics computation time.

**Step 2: Commit results CSV**

```bash
git add tests/load/results-*.csv
git commit -m "test: add load test results after web worker fix"
```
