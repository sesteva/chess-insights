# Load Testing Design: Browser Game Processing Limit

**Date:** 2026-02-26
**Goal:** Find the maximum number of chess games the current synchronous implementation can process without causing main-thread jank or unacceptable time-to-render, to decide whether Web Workers are needed.

---

## Context

Some players complete hundreds of games in a few months. The app currently hard-caps at 30 games. Before raising that cap, we need to know the actual browser performance limit of the current implementation.

The primary bottleneck is `computeTacticsStats` (`src/utils/gameAnalysis.ts:501`), which uses chess.js to replay every move of every game and check all legal moves for mate-in-1 at each position — O(games × moves × legal_moves) — running **synchronously on the main thread**. All other analysis functions are cheap O(n) loops over the games array.

---

## Metrics

| Metric | Capture method | Jank threshold |
|---|---|---|
| Longest single Long Task | `PerformanceObserver` (`longtask`) | > 50ms = janky; > 300ms = severe freeze |
| Total Long Task duration | Sum of all Long Tasks | — |
| Long Task count | Count of Long Task entries | — |
| Time to dashboard render | `Date.now()` from form submit → dashboard selector | > 3s = poor UX |
| JS heap delta | `performance.memory.usedJSHeapSize` before/after | — |

---

## Override Mechanism

Two test-only overrides injected by Playwright via `addInitScript` before navigation:

```ts
window.__CHESS_TEST__ = { gameLimit: N, monthsLimit: 12 }
```

`useLoadPlayerData.ts` reads these with a safe fallback:

```ts
const testCfg = (window as any).__CHESS_TEST__ ?? {}
const monthsLimit: number = testCfg.monthsLimit ?? 3
const gameLimit: number   = testCfg.gameLimit   ?? 30
```

In production (no `__CHESS_TEST__` object), defaults apply unchanged — no build flags, no env vars.

---

## Test Structure

**File:** `tests/load/game-limit-sweep.spec.ts`

**N values:** `[30, 50, 75, 100, 150, 200, 300, 500]`

**Username:** configured via `CHESS_TEST_USERNAME` env var (needs a high-volume player, e.g. `hikaru`)

**Per-run flow:**
1. Inject `window.__CHESS_TEST__` via `addInitScript`
2. Install `PerformanceObserver` for Long Tasks via `addInitScript`
3. Navigate to `http://localhost:5173`
4. Submit the username form
5. Wait for the insights dashboard selector (90s timeout — chess.com API can be slow)
6. Read Long Task data + heap stats via `page.evaluate()`
7. Append row to results

**After all runs:**
- Print a markdown table to stdout
- Write `tests/load/results-<timestamp>.csv`
- Exit non-zero if any run's longest Long Task exceeds `CHESS_TEST_FAIL_MS` (default: `500`)

Runs are sequential (not parallel) to avoid chess.com rate limiting.

---

## Output Format

```
Chess Insights — Game Limit Sweep
Username: hikaru | Date: 2026-02-26

N    | Longest Task | Total LT | LT Count | Time-to-render | Heap delta
-----|-------------|----------|----------|----------------|----------
30   | …ms         | …ms      | …        | …s             | +… MB
50   | …ms         | …ms      | …        | …s             | +… MB
...

⚠  Jank threshold (50ms) first crossed at N=?
❌ Severe threshold (300ms) first crossed at N=?
```

---

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useLoadPlayerData.ts` | Read `window.__CHESS_TEST__` overrides for `gameLimit` and `monthsLimit` |
| `tests/load/game-limit-sweep.spec.ts` | New Playwright sweep script |
| `playwright.config.ts` | New Playwright config (if not already present) |
| `package.json` | Add `playwright` dev dependency + `test:load` script |

---

## Next Steps

If the jank threshold is crossed at an unacceptably low N (e.g. < 100 games), move `computeTacticsStats` and `computePieceMoveFrequency` to a Web Worker. Re-run the same Playwright sweep to compare before/after.
