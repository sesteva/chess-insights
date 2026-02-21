# Chess Insights App — Development Tracker

> A web app replicating chess.com's Diamond-tier Insights features using the public chess.com API.

---

## Overview

**Goal:** Deliver all Diamond-tier chess.com Insights to any user for free, using only the public chess.com API.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite
- Styling: Tailwind CSS
- Charts: Recharts
- Chess logic: chess.js (PGN parsing)
- State: Zustand
- Testing: Vitest + React Testing Library
- CI: GitHub Actions (future)

**API Base:** `https://api.chess.com/pub`

**Key Data Sources:**
- `GET /player/{username}` → profile, country
- `GET /player/{username}/stats` → ratings per game type
- `GET /player/{username}/games/archives` → list of monthly archive URLs
- `GET /player/{username}/games/{YYYY}/{MM}` → all games (includes PGN, accuracies, end_time, etc.)

---

## Feature Scope (Diamond Tier Insights)

| Section | Features | Data Source |
|---|---|---|
| **Overview** | Total games, win/loss/draw, rating by type | API stats + game archives |
| **Rating Trends** | Rating over time per game type | Monthly games (white/blackElo) |
| **Move Quality** | Accuracy chart, brilliant/great/inaccuracy/mistake/blunder % | `accuracies` field in games |
| **Game Phases** | Win/loss/draw by phase (opening/middlegame/endgame) | PGN move count heuristic |
| **Opening Insights** | Top 10 openings as White/Black, win/loss/draw per opening | PGN ECO headers |
| **Tactics** | Found vs. missed forks, pins, mates | Stockfish.js (Phase 6+) |
| **Pieces & Castling** | Piece move frequency, castling patterns + results | PGN parsing |
| **Calendar Stats** | Games/results by time of day & day of week | `end_time` unix timestamps |
| **Geography** | World map of opponent countries | Player profile API |

---

## Roadmap

### Phase 1: Foundation & Project Setup
**Goal:** Working skeleton app with API connectivity, routing, and test harness.

| # | Task | Status | Started | Completed |
|---|---|---|---|---|
| 1.1 | Initialize React + TypeScript + Vite project | ✅ Done | 2026-02-20 | 2026-02-20 |
| 1.2 | Install & configure Tailwind CSS | ✅ Done | 2026-02-20 | 2026-02-20 |
| 1.3 | Set up Vitest + React Testing Library | ✅ Done | 2026-02-20 | 2026-02-20 |
| 1.4 | Create chess.com API service layer (with tests) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 1.5 | Build username input form + validation (with tests) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 1.6 | Set up React Router + page shell | ✅ Done | 2026-02-20 | 2026-02-20 |

---

### Phase 2: Data Pipeline & Overview Stats
**Goal:** Fetch all game history, compute basic aggregates, display summary dashboard.

| # | Task | Status | Started | Completed |
|---|---|---|---|---|
| 2.1 | Fetch & cache player profile and stats | ✅ Done | 2026-02-20 | 2026-02-20 |
| 2.2 | Fetch game archives list + monthly game batches | ✅ Done | 2026-02-20 | 2026-02-20 |
| 2.3 | Game data normalization (parse PGN headers + result fields) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 2.4 | Overview stats card (total games, wins, losses, draws, % per game type) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 2.5 | Zustand store for game data with loading/error states | ✅ Done | 2026-02-20 | 2026-02-20 |

---

### Phase 3: Rating Trends
**Goal:** Interactive rating history chart per game type.

| # | Task | Status | Started | Completed |
|---|---|---|---|---|
| 3.1 | Extract rating-over-time series from games | ✅ Done | 2026-02-20 | 2026-02-20 |
| 3.2 | Recharts line chart: rating over time, filterable by game type | ✅ Done | 2026-02-20 | 2026-02-20 |
| 3.3 | Best rating markers + current rating display | ✅ Done | 2026-02-20 | 2026-02-20 |

---

### Phase 4: Opening Insights
**Goal:** Show top 10 openings as White and Black with win/loss/draw breakdown.

| # | Task | Status | Started | Completed |
|---|---|---|---|---|
| 4.1 | Parse ECO code + Opening name from PGN headers | ✅ Done | 2026-02-20 | 2026-02-20 |
| 4.2 | Aggregate opening stats (count, wins, losses, draws, win%) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 4.3 | Top 10 openings table with stacked bar chart (W vs B separately) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 4.4 | Opening name from PGN [Opening] header (no separate lookup needed) | ✅ Done | 2026-02-20 | 2026-02-20 |

---

### Phase 5: Calendar & Activity Stats
**Goal:** Heatmap, time-of-day, and day-of-week performance breakdowns.

| # | Task | Status | Started | Completed |
|---|---|---|---|---|
| 5.1 | Parse `end_time` Unix timestamps → local date/hour/weekday | ✅ Done | 2026-02-20 | 2026-02-20 |
| 5.2 | Games played by hour-of-day (bar chart) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 5.3 | Win % by hour-of-day (opacity encoding) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 5.4 | Games & win % by day-of-week (bar chart) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 5.5 | Activity heatmap calendar (GitHub-style) | ✅ Done | 2026-02-20 | 2026-02-20 |

---

### Phase 6: Game Phase Analysis
**Goal:** Show win/loss/draw rates and accuracy by game phase.

| # | Task | Status | Started | Completed |
|---|---|---|---|---|
| 6.1 | Classify game-ending phase from move count (opening <12, middlegame <40, endgame 40+) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 6.2 | Win/loss/draw by ending phase (stacked bar) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 6.3 | Castling detection from PGN (O-O, O-O-O) + outcome stats | ✅ Done | 2026-02-20 | 2026-02-20 |
| 6.4 | Piece movement frequency from PGN (per piece type) | ✅ Done | 2026-02-20 | 2026-02-20 |

---

### Phase 7: Accuracy & Move Quality
**Goal:** Display per-game and aggregate accuracy using chess.com's analyzed game data.

| # | Task | Status | Started | Completed |
|---|---|---|---|---|
| 7.1 | Extract `accuracies` field from game data (where available) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 7.2 | Average accuracy chart over time (rolling average of 20) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 7.3 | Accuracy distribution histogram | ✅ Done | 2026-02-20 | 2026-02-20 |
| 7.4 | Accuracy by game type breakdown | ✅ Done | 2026-02-20 | 2026-02-20 |

---

### Phase 8: Geography
**Goal:** World map showing countries of opponents played.

| # | Task | Status | Started | Completed |
|---|---|---|---|---|
| 8.1 | Collect unique opponent usernames from games | ✅ Done | 2026-02-20 | 2026-02-20 |
| 8.2 | Batch-fetch opponent countries (with rate limiting) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 8.3 | Country bar chart with flag emojis + hover tooltips | ✅ Done | 2026-02-20 | 2026-02-20 |

---

### Phase 9: Tactics (Engine-Powered)
**Goal:** Find missed tactics using Stockfish.js WASM.

| # | Task | Status | Started | Completed |
|---|---|---|---|---|
| 9.1 | chess.js-based mate-in-1 detection (last 100 games) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 9.2 | Missed mate counter + matesPlayed counter | ✅ Done | 2026-02-20 | 2026-02-20 |
| 9.3 | TacticsCard with conversion rate + progress bar | ✅ Done | 2026-02-20 | 2026-02-20 |

---

### Phase 10: Polish & Production
**Goal:** Performance, UX, caching, and deployment.

| # | Task | Status | Started | Completed |
|---|---|---|---|---|
| 10.1 | IndexedDB caching for game archives (avoid re-fetching) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 10.2 | Loading progress indicator (games fetched X/Y months) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 10.3 | Error boundary + graceful degradation | ✅ Done | 2026-02-20 | 2026-02-20 |
| 10.4 | Responsive mobile design | ✅ Done | 2026-02-20 | 2026-02-20 |
| 10.5 | Date range filter (last 30/90/365 days or custom) | ✅ Done | 2026-02-20 | 2026-02-20 |
| 10.6 | Game type filter (rapid/blitz/bullet/daily) | ✅ Done | 2026-02-20 | 2026-02-20 |

---

## Session Log

| Date | Session | Work Done |
|---|---|---|
| 2026-02-20 | Session 1 | Researched features, created tracker, initialized Vite+React+TS project, Tailwind, Vitest. Built chess.com API service (13 tests), username form (11 tests), app routing shell. Implemented full analysis engine: computeResultCounts, computeRatingHistory, computeOpeningStats, computeCalendarStats, computeAccuracyStats, detectCastling, computeCastlingStats, classifyGamePhase, computeGamePhaseStats (31 tests). Built InsightsDashboard with 7 chart components. Total: 55 tests, 0 TS errors. Committed and pushed Phase 1–7. |
| 2026-02-20 | Session 2 | Tasks 6.4, 7.3, Phase 8. Added computePieceMoveFrequency (PGN piece-type counter), computeAccuracyDistribution (10-bucket histogram), extractOpponentUsernames, computeOpponentCountryStats (+13 tests, total 68). Built PieceMovesCard (hex-colored bar chart with piece symbols), accuracy histogram in AccuracyChart, GeographyCard (flag emoji + horizontal bar chart). Added fetchPlayerCountry to API layer. Added useLoadOpponentCountries hook (batch-fetches 5/150ms). Extended Zustand store with opponentCountries + countriesLoadingState. 0 TS errors. |
| 2026-02-20 | Session 3 | Phase 5.5, 9, 10 (all). IndexedDB cache (gameCache.ts, useLoadPlayerData updated — fetches all history, caches past months, skips current). ErrorBoundary class component + wired into App.tsx. FilterBar (game-type + date-range pills, applied in InsightsDashboard as local state on filteredGames). computeActivityHeatmap → ActivityHeatmap (GitHub-style 7×52 grid, color intensity by count, hover tooltip). computeTacticsStats (chess.js replay, detects mate-in-1 positions in last 100 games) → TacticsCard (conversion rate progress bar). +7 tests (total 75). 0 TS errors. All features wired into InsightsDashboard with full filter support. |

---

## TDD Protocol

For every task:
1. **Plan** — describe approach in a comment block above the test file
2. **Red** — write failing tests first
3. **Green** — implement until tests pass
4. **Commit** — descriptive commit message referencing the task number
5. **Update Tracker** — mark task done with timestamp

---

## Status Legend

| Symbol | Meaning |
|---|---|
| 🔲 Pending | Not started |
| 🟡 In Progress | Currently being worked on |
| ✅ Done | Complete and committed |
| ❌ Blocked | Blocked by dependency or issue |
