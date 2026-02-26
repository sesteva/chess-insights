# Fixture-Based Load Testing Sweep — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the live-API sweep with a two-phase approach: one script captures real games once from chess.com; the sweep test replays them offline via `page.route()` mocking for all 8 N values.

**Architecture:** A capture script (`capture-fixtures.ts`) hits the chess.com API once and saves `tests/load/fixtures/data.json`. The sweep test loads that fixture and uses Playwright's `context.route()` to intercept all `api.chess.com` requests, returning fixture data instead of hitting the network. The existing `window.__CHESS_TEST__.gameLimit` mechanism handles slicing to N games per run.

**Tech Stack:** Playwright `context.route()`, `tsx` (TypeScript runner for the capture script), Node.js `fs`, chess.com public API.

---

### Task 1: Install `tsx` and create the fixture capture script

`tsx` is a lightweight TypeScript runner needed to execute the capture script without a separate compile step.

**Files:**
- Modify: `package.json`
- Create: `tests/load/capture-fixtures.ts`

**Step 1: Install tsx**

```bash
npm install --save-dev tsx
```

Expected: `tsx` appears in `devDependencies` in `package.json`.

**Step 2: Add a `capture-fixtures` convenience script to `package.json`**

In the `"scripts"` block, add:
```json
"capture-fixtures": "tsx tests/load/capture-fixtures.ts"
```

**Step 3: Create `tests/load/capture-fixtures.ts`**

```ts
/**
 * One-time fixture capture for the load testing sweep.
 * Hits chess.com once and saves results to tests/load/fixtures/data.json.
 *
 * Usage:
 *   CHESS_TEST_USERNAME=hikaru npm run capture-fixtures
 *
 * Optional:
 *   CHESS_TEST_MONTHS=6   (archive months to fetch, default 6)
 */

import * as fs from 'fs'
import * as path from 'path'

const USERNAME = process.env.CHESS_TEST_USERNAME
if (!USERNAME) {
  console.error('Error: CHESS_TEST_USERNAME is required')
  console.error('Usage: CHESS_TEST_USERNAME=hikaru npm run capture-fixtures')
  process.exit(1)
}

const MONTHS   = Number(process.env.CHESS_TEST_MONTHS || '6')
const BASE_URL = 'https://api.chess.com/pub/player'

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'chess-insights-load-test/1.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return res.json()
}

async function main(): Promise<void> {
  console.log(`Capturing fixtures for @${USERNAME} (last ${MONTHS} months)...\n`)

  const profile = await fetchJson(`${BASE_URL}/${USERNAME}`)
  console.log('✓ profile')

  const stats = await fetchJson(`${BASE_URL}/${USERNAME}/stats`)
  console.log('✓ stats')

  const archivesData = await fetchJson(`${BASE_URL}/${USERNAME}/games/archives`) as { archives: string[] }
  const archives = archivesData.archives.slice(-MONTHS)
  console.log(`✓ archives list (${archives.length} months selected)\n`)

  const games: unknown[] = []
  for (const archiveUrl of archives) {
    const label = archiveUrl.split('/').slice(-2).join('/')
    const data = await fetchJson(archiveUrl) as { games: unknown[] }
    games.push(...data.games)
    console.log(`  ✓ ${label}: ${data.games.length} games (running total: ${games.length})`)
  }

  const fixture = { username: USERNAME, profile, stats, games }
  const outDir  = path.join('tests', 'load', 'fixtures')
  const outPath = path.join(outDir, 'data.json')

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(fixture, null, 2))

  const fileSizeKB = Math.round(fs.statSync(outPath).size / 1024)
  console.log(`\n✅ Saved ${games.length} games to ${outPath} (${fileSizeKB} KB)`)
  console.log('Now commit the fixture and run: npm run test:load')
}

main().catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})
```

**Step 4: Verify the script compiles (no type errors)**

```bash
npx tsc --noEmit
```

Expected: clean exit, no errors.

**Step 5: Commit**

```bash
git add package.json package-lock.json tests/load/capture-fixtures.ts
git commit -m "feat: add fixture capture script for offline load testing"
```

---

### Task 2: Run the capture and commit the fixture data

This task makes exactly **one** real API call to chess.com. After this, the sweep runs offline forever.

**Files:**
- Create: `tests/load/fixtures/data.json` (generated, then committed)

**Step 1: Run the capture script**

```bash
CHESS_TEST_USERNAME=hikaru npm run capture-fixtures
```

Expected output (approximate):
```
Capturing fixtures for @hikaru (last 6 months)...

✓ profile
✓ stats
✓ archives list (6 months selected)

  ✓ 2024/08: 312 games (running total: 312)
  ✓ 2024/09: 287 games (running total: 599)
  ...

✅ Saved 1823 games to tests/load/fixtures/data.json (4821 KB)
Now commit the fixture and run: npm run test:load
```

The game count and file size will vary. You need at least 500 games to cover N=500. If you get fewer, increase `CHESS_TEST_MONTHS`:

```bash
CHESS_TEST_USERNAME=hikaru CHESS_TEST_MONTHS=12 npm run capture-fixtures
```

**Step 2: Verify the fixture is valid JSON with the expected shape**

```bash
node -e "
  const d = JSON.parse(require('fs').readFileSync('tests/load/fixtures/data.json', 'utf-8'))
  console.log('username:', d.username)
  console.log('games:', d.games.length)
  console.log('has profile:', !!d.profile)
  console.log('has stats:', !!d.stats)
  const sample = d.games[0]
  console.log('sample game keys:', Object.keys(sample))
"
```

Expected: `username` matches what you passed, `games` count is 500+, each game has `pgn`, `white`, `black`, `end_time`, `time_class`.

**Step 3: Commit the fixture**

```bash
git add tests/load/fixtures/data.json
git commit -m "test: add chess.com game fixtures for offline load testing"
```

> Note: `data.json` may be a few MB. That is acceptable — it is a dev-only file used for load testing only. If it becomes too large, add `tests/load/fixtures/data.json` to `.gitignore` and share it out-of-band.

---

### Task 3: Update the sweep test to use `page.route()` mocking

Replace the live API approach in `tests/load/game-limit-sweep.spec.ts` with fixture-based route mocking. The entire file is replaced — do not try to patch it incrementally.

**Files:**
- Modify: `tests/load/game-limit-sweep.spec.ts`

**Step 1: Replace the entire file content**

```ts
import { test } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// ─── Config ────────────────────────────────────────────────────────────────────

const N_VALUES  = [30, 50, 75, 100, 150, 200, 300, 500]
const JANK_MS   = 50
const SEVERE_MS = 300
const FAIL_MS   = Number(process.env.CHESS_TEST_FAIL_MS || '500')

// A past month so the hook's IndexedDB cache logic treats it as a completed month.
const FAKE_YEAR  = '2024'
const FAKE_MONTH = '01'

// ─── Fixture ───────────────────────────────────────────────────────────────────

interface Fixture {
  username: string
  profile:  unknown
  stats:    unknown
  games:    unknown[]
}

function loadFixture(): Fixture {
  const fixturePath = path.join('tests', 'load', 'fixtures', 'data.json')
  if (!fs.existsSync(fixturePath)) {
    throw new Error(
      `Fixture not found at ${fixturePath}.\n` +
      `Run: CHESS_TEST_USERNAME=<player> npm run capture-fixtures`,
    )
  }
  return JSON.parse(fs.readFileSync(fixturePath, 'utf-8')) as Fixture
}

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
      `${r.heapDeltaMB >= 0 ? '+' : ''}${r.heapDeltaMB.toFixed(1)} MB`,
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
  const csvPath   = path.join('tests', 'load', `results-${timestamp}.csv`)
  const header    = 'N,Longest Task (ms),Total LT (ms),LT Count,Time to Render (ms),Heap Delta (MB),Error\n'
  const rows      = results.map(r =>
    `${r.n},${r.longestTask.toFixed(0)},${r.totalLongTaskDuration.toFixed(0)},${r.longTaskCount},${r.timeToRender},${r.heapDeltaMB.toFixed(1)},${r.error ?? ''}`
  ).join('\n')
  fs.mkdirSync(path.join('tests', 'load'), { recursive: true })
  fs.writeFileSync(csvPath, header + rows)
  console.log(`Results written to ${csvPath}`)
}

// ─── Test ──────────────────────────────────────────────────────────────────────

// 8 runs × 30s max each (mocked API = fast), plus table/CSV overhead
test('game-limit sweep', { timeout: 10 * 60 * 1000 }, async ({ browser }) => {
  const fixture = loadFixture()
  const { username, profile, stats, games: allGames } = fixture
  const fakeArchiveUrl = `https://api.chess.com/pub/player/${username}/games/${FAKE_YEAR}/${FAKE_MONTH}`

  const results: RunResult[] = []

  for (const n of N_VALUES) {
    console.log(`\n▶ Running N=${n} games...`)

    const context = await browser.newContext()
    const page    = await context.newPage()

    // Intercept all chess.com API calls — zero real network requests per run
    await context.route('https://api.chess.com/**', async (route) => {
      const url = route.request().url()

      if (url === `https://api.chess.com/pub/player/${username}`) {
        await route.fulfill({ json: profile })
      } else if (url === `https://api.chess.com/pub/player/${username}/stats`) {
        await route.fulfill({ json: stats })
      } else if (url === `https://api.chess.com/pub/player/${username}/games/archives`) {
        await route.fulfill({ json: { archives: [fakeArchiveUrl] } })
      } else if (url === fakeArchiveUrl) {
        await route.fulfill({ json: { games: allGames } })
      } else {
        // Opponent country lookups and other secondary calls — abort cleanly
        await route.abort()
      }
    })

    // Inject game limit and Long Task observer before navigation
    await context.addInitScript((gameLimit: number) => {
      ;(window as any).__CHESS_TEST__ = { gameLimit, monthsLimit: 1 }
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
      await page.getByRole('textbox').fill(username)
      await page.getByRole('button', { name: /analyze/i }).click()
      await page.waitForSelector('[data-testid="insights-dashboard"]', { timeout: 30_000 })
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
        longTaskCount:         tasks.length,
        longestTask:           tasks.length ? Math.max(...tasks) : 0,
        totalLongTaskDuration: tasks.reduce((a, b) => a + b, 0),
        heapDeltaMB:           (heapAfter - heapBefore) / (1024 * 1024),
      }
    })

    results.push({ n, timeToRender, ...metrics })
    console.log(`  ✓ longest task: ${fmt(metrics.longestTask)}, render: ${fmtS(timeToRender)}`)

    await context.close()
  }

  printTable(results, username)
  writeCsv(results)

  const failed = results.filter(r => r.longestTask > FAIL_MS && !r.error)
  if (failed.length > 0) {
    throw new Error(
      `${failed.length} run(s) exceeded FAIL_MS (${FAIL_MS}ms): N=${failed.map(r => r.n).join(', ')}`
    )
  }
})
```

**Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: clean exit.

**Step 3: Run existing unit tests to confirm nothing regressed**

```bash
npm test
```

Expected: 85 tests pass, 4 files. The sweep spec is excluded from Vitest (confirmed by `vite.config.ts` exclude rule).

**Step 4: Smoke-test the sweep against N=30 only**

Temporarily edit `N_VALUES` on line 8 to `[30]`, run the sweep, then restore:

```bash
# Edit N_VALUES to [30], then:
CHESS_TEST_FAIL_MS=9999 npm run test:load
```

Expected:
- Playwright starts the dev server automatically
- Dashboard appears in < 10 seconds (no real network)
- Table prints with one row
- CSV written to `tests/load/results-*.csv`

Restore `N_VALUES = [30, 50, 75, 100, 150, 200, 300, 500]`.

**Step 5: Commit**

```bash
git add tests/load/game-limit-sweep.spec.ts
git commit -m "feat: replace live API sweep with fixture-based page.route() mocking"
```

---

### Task 4: Run the full sweep and record results

**Step 1: Run the full 8-value sweep**

```bash
CHESS_TEST_FAIL_MS=9999 npm run test:load
```

Expected total time: 2–5 minutes (no real API latency).

**Step 2: Review the output table**

Identify:
- N where longest Long Task first exceeds 50ms ← jank threshold
- N where longest Long Task first exceeds 300ms ← severe freeze

**Step 3: Commit the CSV results**

```bash
git add tests/load/results-*.csv
git commit -m "test: record initial fixture-based game-limit sweep results"
```

---

## Running instructions (summary)

```bash
# One-time fixture capture (do this once, then commit data.json)
CHESS_TEST_USERNAME=hikaru npm run capture-fixtures

# Full sweep (offline, ~3 min)
CHESS_TEST_FAIL_MS=9999 npm run test:load

# Single N smoke test
# Edit N_VALUES to [30] in game-limit-sweep.spec.ts, then:
CHESS_TEST_FAIL_MS=9999 npm run test:load
```
