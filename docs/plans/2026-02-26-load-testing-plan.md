# Load Testing: Browser Game Processing Limit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire a `window.__CHESS_TEST__` override into the game-loading hook, then write a Playwright sweep that hits the real chess.com API at N=30…500 games and records Long Task, time-to-render, and heap metrics for each run.

**Architecture:** A test-only escape hatch (`window.__CHESS_TEST__`) lets Playwright control `gameLimit` and `monthsLimit` without touching build config. Each N value runs in a fresh browser context so init scripts don't bleed across runs. Results are printed as a markdown table and written to a timestamped CSV.

**Tech Stack:** Playwright (chromium only), Vitest (for unit tests of the override), TypeScript, Node `fs` for CSV output.

---

### Task 1: Add `data-testid` to InsightsDashboard

Playwright needs a stable selector to know when the dashboard has fully rendered.

**Files:**
- Modify: `src/components/InsightsDashboard.tsx:86`

**Step 1: Add the testid**

In `InsightsDashboard.tsx`, find line 86:
```tsx
    <div className="min-h-screen bg-gray-950 text-white">
```
Change to:
```tsx
    <div className="min-h-screen bg-gray-950 text-white" data-testid="insights-dashboard">
```

**Step 2: Run existing tests to confirm nothing broke**

```bash
npm test
```
Expected: all tests PASS (this is a pure markup addition).

**Step 3: Commit**

```bash
git add src/components/InsightsDashboard.tsx
git commit -m "test: add data-testid to InsightsDashboard for Playwright"
```

---

### Task 2: Add `window.__CHESS_TEST__` overrides to `useLoadPlayerData`

The hook currently hard-codes both `3` (months) and `30` (games). We read those from `window.__CHESS_TEST__` when present, falling back to the production defaults.

**Files:**
- Modify: `src/hooks/useLoadPlayerData.ts`
- Modify: `src/hooks/__tests__/useLoadPlayerData.test.ts`

**Step 1: Write the two failing tests first**

Open `src/hooks/__tests__/useLoadPlayerData.test.ts` and add these two test cases inside the existing `describe('useLoadPlayerData', ...)` block, after the last existing test:

```ts
  it('respects window.__CHESS_TEST__.gameLimit override', async () => {
    ;(window as any).__CHESS_TEST__ = { gameLimit: 5 }

    const archives = [makeArchiveUrl(2025, '12')]
    vi.mocked(fetchGameArchives).mockResolvedValue(archives)
    vi.mocked(fetchMonthlyGames).mockResolvedValue(makeGames(10)) // 10 games, limit should cap at 5

    const { result } = renderHook(() => useLoadPlayerData())
    await result.current.load('testplayer')

    await waitFor(() => {
      expect(useGameStore.getState().games).toHaveLength(5)
    })

    delete (window as any).__CHESS_TEST__
  })

  it('respects window.__CHESS_TEST__.monthsLimit override', async () => {
    ;(window as any).__CHESS_TEST__ = { monthsLimit: 1 }

    const archives = [
      makeArchiveUrl(2025, '10'),
      makeArchiveUrl(2025, '11'),
      makeArchiveUrl(2025, '12'),
    ]
    vi.mocked(fetchGameArchives).mockResolvedValue(archives)
    vi.mocked(fetchMonthlyGames).mockResolvedValue([])

    const { result } = renderHook(() => useLoadPlayerData())
    await result.current.load('testplayer')

    await waitFor(() => {
      expect(useGameStore.getState().loadingState).toBe('success')
    })

    expect(fetchMonthlyGames).toHaveBeenCalledTimes(1)
    expect(fetchMonthlyGames).toHaveBeenCalledWith('testplayer', 2025, 12)

    delete (window as any).__CHESS_TEST__
  })
```

**Step 2: Run the new tests to confirm they fail**

```bash
npm test -- --reporter=verbose src/hooks/__tests__/useLoadPlayerData.test.ts
```
Expected: the two new tests FAIL (the hook ignores `window.__CHESS_TEST__` for now).

**Step 3: Implement the override in `useLoadPlayerData.ts`**

Inside the `load` callback (after `reset()` and before `try {`), add:

```ts
    const testCfg = (window as any).__CHESS_TEST__ ?? {}
    const monthsLimit: number = testCfg.monthsLimit ?? 3
    const gameLimit: number   = testCfg.gameLimit   ?? 30
```

Then on the line that currently reads:
```ts
      const recentArchives = archives.slice(-3)
```
Change to:
```ts
      const recentArchives = archives.slice(-monthsLimit)
```

And in the block that currently reads:
```ts
      const finalGames = collectedGames.length > 30
        ? [...collectedGames].sort((a, b) => b.end_time - a.end_time).slice(0, 30)
        : collectedGames
```
Change to:
```ts
      const finalGames = collectedGames.length > gameLimit
        ? [...collectedGames].sort((a, b) => b.end_time - a.end_time).slice(0, gameLimit)
        : collectedGames
```

**Step 4: Run all tests to confirm everything passes**

```bash
npm test
```
Expected: all tests PASS including the two new ones.

**Step 5: Commit**

```bash
git add src/hooks/useLoadPlayerData.ts src/hooks/__tests__/useLoadPlayerData.test.ts
git commit -m "feat: read game/month limits from window.__CHESS_TEST__ for load testing"
```

---

### Task 3: Install Playwright and add config

**Files:**
- Create: `playwright.config.ts`
- Modify: `package.json`

**Step 1: Install Playwright**

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```
Expected: `node_modules/@playwright/test` exists, chromium binary downloaded.

**Step 2: Create `playwright.config.ts`**

Create the file at the project root:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,         // 2 min per test — chess.com API can be slow
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
```

**Step 3: Add `test:load` script to `package.json`**

In the `"scripts"` block, add:
```json
"test:load": "playwright test tests/load/"
```

**Step 4: Create the output directory**

```bash
mkdir -p tests/load
```

**Step 5: Commit**

```bash
git add playwright.config.ts package.json package-lock.json tests/load/
git commit -m "chore: install Playwright and add load test config"
```

---

### Task 4: Write the Playwright sweep test

**Files:**
- Create: `tests/load/game-limit-sweep.spec.ts`

**Step 1: Create the test file**

```ts
import { test } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// ─── Config ────────────────────────────────────────────────────────────────────

const N_VALUES = [30, 50, 75, 100, 150, 200, 300, 500]
const JANK_MS  = 50
const SEVERE_MS = 300
const FAIL_MS  = parseInt(process.env.CHESS_TEST_FAIL_MS ?? '500')
const USERNAME = process.env.CHESS_TEST_USERNAME ?? 'hikaru'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RunResult {
  n: number
  longestTask: number
  totalLongTaskDuration: number
  longTaskCount: number
  timeToRender: number
  heapDeltaMB: number
  error?: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(ms: number): string {
  return ms < 0 ? 'ERR' : `${ms.toFixed(0)}ms`
}

function fmtS(ms: number): string {
  return ms < 0 ? 'ERR' : `${(ms / 1000).toFixed(1)}s`
}

function printTable(results: RunResult[], username: string): void {
  console.log(`\nChess Insights — Game Limit Sweep`)
  console.log(`Username: ${username} | Date: ${new Date().toISOString().slice(0, 10)}\n`)
  const header = 'N     | Longest Task | Total LT    | LT Count | Time-to-render | Heap delta'
  const sep    = '------|-------------|-------------|----------|----------------|----------'
  console.log(header)
  console.log(sep)
  for (const r of results) {
    const row = [
      r.n.toString().padEnd(5),
      fmt(r.longestTask).padEnd(12),
      fmt(r.totalLongTaskDuration).padEnd(12),
      r.longTaskCount.toString().padEnd(9),
      fmtS(r.timeToRender).padEnd(15),
      `+${r.heapDeltaMB.toFixed(1)} MB`,
    ].join(' | ')
    console.log(row)
  }

  const jankFirst   = results.find(r => r.longestTask > JANK_MS)
  const severeFirst = results.find(r => r.longestTask > SEVERE_MS)
  console.log()
  if (jankFirst)   console.log(`⚠  Jank threshold (${JANK_MS}ms) first crossed at N=${jankFirst.n}`)
  if (severeFirst) console.log(`❌ Severe threshold (${SEVERE_MS}ms) first crossed at N=${severeFirst.n}`)
  if (!jankFirst)  console.log(`✅ No jank detected across all N values`)
}

function writeCsv(results: RunResult[]): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const csvPath = path.join('tests', 'load', `results-${timestamp}.csv`)
  const header = 'N,Longest Task (ms),Total LT (ms),LT Count,Time to Render (ms),Heap Delta (MB),Error\n'
  const rows = results.map(r =>
    `${r.n},${r.longestTask.toFixed(0)},${r.totalLongTaskDuration.toFixed(0)},${r.longTaskCount},${r.timeToRender},${r.heapDeltaMB.toFixed(1)},${r.error ?? ''}`
  ).join('\n')
  fs.writeFileSync(csvPath, header + rows)
  console.log(`Results written to ${csvPath}`)
}

// ─── Test ──────────────────────────────────────────────────────────────────────

test('game-limit sweep', async ({ browser }) => {
  const results: RunResult[] = []

  for (const n of N_VALUES) {
    console.log(`\n▶ Running N=${n} games...`)

    const context = await browser.newContext()
    const page    = await context.newPage()

    // Inject overrides and Long Task observer before any navigation.
    // Uses context.addInitScript so it runs fresh on every page.goto().
    await context.addInitScript((gameLimit: number) => {
      ;(window as any).__CHESS_TEST__ = { gameLimit, monthsLimit: 12 }
      ;(window as any).__longTasks   = []
      ;(window as any).__heapBefore  = (performance as any).memory?.usedJSHeapSize ?? 0

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          ;(window as any).__longTasks.push(entry.duration)
        }
      }).observe({ entryTypes: ['longtask'] })
    }, n)

    const start = Date.now()

    try {
      await page.goto('/')
      await page.getByRole('textbox').fill(USERNAME)
      await page.getByRole('button', { name: /analyze/i }).click()
      await page.waitForSelector('[data-testid="insights-dashboard"]', { timeout: 90_000 })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`  ⚠ N=${n}: ${msg}`)
      results.push({ n, longestTask: 0, totalLongTaskDuration: 0, longTaskCount: 0, timeToRender: -1, heapDeltaMB: 0, error: 'Timeout/error' })
      await context.close()
      continue
    }

    const timeToRender = Date.now() - start

    const metrics = await page.evaluate(() => {
      const tasks: number[] = (window as any).__longTasks ?? []
      const heapBefore: number = (window as any).__heapBefore ?? 0
      const heapAfter: number  = (performance as any).memory?.usedJSHeapSize ?? 0
      return {
        longTaskCount:           tasks.length,
        longestTask:             tasks.length ? Math.max(...tasks) : 0,
        totalLongTaskDuration:   tasks.reduce((a, b) => a + b, 0),
        heapDeltaMB:             (heapAfter - heapBefore) / (1024 * 1024),
      }
    })

    results.push({ n, timeToRender, ...metrics })
    console.log(`  ✓ longest task: ${fmt(metrics.longestTask)}, render: ${fmtS(timeToRender)}`)

    await context.close()
  }

  printTable(results, USERNAME)
  writeCsv(results)

  // Fail the test suite if any run exceeded the hard threshold.
  // Set CHESS_TEST_FAIL_MS=0 to always fail (useful to collect data without gating).
  const failed = results.filter(r => r.longestTask > FAIL_MS && !r.error)
  if (failed.length > 0) {
    throw new Error(
      `${failed.length} run(s) exceeded FAIL_MS (${FAIL_MS}ms): N=${failed.map(r => r.n).join(', ')}`
    )
  }
})
```

**Step 2: Do a smoke run at N=30 only to verify the wiring**

```bash
CHESS_TEST_USERNAME=hikaru CHESS_TEST_FAIL_MS=9999 playwright test tests/load/ -- --grep "game-limit sweep"
```

Temporarily edit `N_VALUES` to `[30]` only, run, restore to full list. Confirm:
- The dashboard selector is found
- A CSV appears in `tests/load/`
- The table prints to stdout

**Step 3: Restore `N_VALUES` to the full sweep and commit**

```bash
git add tests/load/game-limit-sweep.spec.ts
git commit -m "test: add Playwright game-limit sweep for browser load testing"
```

---

### Task 5: Run the full sweep and record results

**Step 1: Run**

```bash
CHESS_TEST_USERNAME=hikaru CHESS_TEST_FAIL_MS=9999 npm run test:load
```

`FAIL_MS=9999` means the test never hard-fails — we want all data regardless of thresholds.

Expected total run time: 5–15 minutes (chess.com API, 8 N values, fresh context per run).

**Step 2: Review the table printed to stdout**

Note the N value where longest task first exceeds 50ms (jank) and 300ms (severe). This is the hard cap recommendation.

**Step 3: Commit the CSV result**

```bash
git add tests/load/results-*.csv
git commit -m "test: record initial game-limit sweep results"
```

---

## Running instructions (summary)

```bash
# One-time setup (already done after Task 3)
npm install
npx playwright install chromium

# Full sweep
CHESS_TEST_USERNAME=<username> npm run test:load

# Override the hard-fail threshold
CHESS_TEST_USERNAME=<username> CHESS_TEST_FAIL_MS=300 npm run test:load
```

The username must be a chess.com player with high game volume. Good candidates: `hikaru`, `magnuscarlsen`, `nihalsarin`.
