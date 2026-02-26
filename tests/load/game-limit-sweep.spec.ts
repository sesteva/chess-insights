import { test } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// ─── Config ────────────────────────────────────────────────────────────────────

const N_VALUES = [30, 50, 75, 100, 150, 200, 300, 500]
const JANK_MS  = 50
const SEVERE_MS = 300
const FAIL_MS  = Number(process.env.CHESS_TEST_FAIL_MS || '500')
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
  const csvPath = path.join('tests', 'load', `results-${timestamp}.csv`)
  const header = 'N,Longest Task (ms),Total LT (ms),LT Count,Time to Render (ms),Heap Delta (MB),Error\n'
  const rows = results.map(r =>
    `${r.n},${r.longestTask.toFixed(0)},${r.totalLongTaskDuration.toFixed(0)},${r.longTaskCount},${r.timeToRender},${r.heapDeltaMB.toFixed(1)},${r.error ?? ''}`
  ).join('\n')
  fs.mkdirSync(path.join('tests', 'load'), { recursive: true })
  fs.writeFileSync(csvPath, header + rows)
  console.log(`Results written to ${csvPath}`)
}

// ─── Test ──────────────────────────────────────────────────────────────────────

test('game-limit sweep', { timeout: 20 * 60 * 1000 }, async ({ browser }) => {
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
