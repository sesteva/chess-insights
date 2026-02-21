# Chess Insights

> Free Diamond-tier chess analytics for any chess.com player — no login, no paywall.

Chess.com locks its best insights (accuracy trends, opening stats, heatmaps, tactics) behind a Diamond subscription. This app replicates every one of those features using only the public chess.com API and runs entirely in your browser.

---

## Features

### Overview
- Total games played with win / loss / draw counts and percentages
- Per-game-type breakdown (Rapid, Blitz, Bullet, Daily)

### Rating Trends
- Interactive line chart of rating over time per game type
- Peak rating markers

### Accuracy
- Average accuracy badge (overall and per game type)
- Rolling 20-game accuracy trend (area chart)
- Accuracy distribution histogram — color-coded by range

### Tactics
- Detects every position in your last 100 games where a forced **mate-in-1** existed
- Counts how many you played vs. missed
- Mate conversion rate progress bar

### Game Phase Analysis
- Win / loss / draw breakdown by phase: Opening, Middlegame, Endgame
- Phase classified by move count (< 12 / 12–39 / 40+)

### Opening Insights
- Top 10 openings as White and as Black
- W / L / D counts + win percentage per opening

### Activity Heatmap
- GitHub-style 52-week calendar grid
- Color intensity = games played that day
- Hover tooltip: date, game count, W/L/D split

### Calendar Stats
- Games and win % by **hour of day** (bar chart)
- Games and win % by **day of week** (bar chart)

### Castling Patterns
- Kingside / Queenside / No-castle frequency
- Win rate for each castling style

### Piece Movement
- Move count per piece type (Pawn, Knight, Bishop, Rook, Queen, King)
- Horizontal bar chart with piece symbols

### Opponent Geography
- Batch-fetches opponent country data in the background
- Flag emoji + country name bar chart for top 15 opponent countries

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Chess logic | chess.js (PGN parsing, move replay) |
| State | Zustand |
| Testing | Vitest + React Testing Library |
| Cache | IndexedDB (via native API) |
| Data | chess.com Public API — no auth required |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & run

```bash
git clone <repo-url>
cd chess-insights
npm install
npm run dev
```

Open `http://localhost:5173`, type any chess.com username, and press **Analyse**.

### Run tests

```bash
npm test          # single run
npm run test:watch  # watch mode
```

### Build for production

```bash
npm run build
npm run preview   # serve the built output locally
```

---

## Project Structure

```
src/
├── services/
│   └── chessApi.ts          # chess.com API client (fetch, types, error handling)
├── store/
│   └── gameStore.ts         # Zustand store (games, profile, filters, geography)
├── hooks/
│   ├── useLoadPlayerData.ts       # orchestrates full data load + IndexedDB cache
│   └── useLoadOpponentCountries.ts # lazy background country fetching (5 req/150ms)
├── utils/
│   ├── gameAnalysis.ts      # all pure analysis functions
│   └── gameCache.ts         # IndexedDB read/write helpers
├── components/
│   ├── InsightsDashboard.tsx      # top-level layout + filter state
│   ├── ErrorBoundary.tsx          # React error boundary
│   ├── LoadingScreen.tsx          # progress bar during data fetch
│   └── insights/
│       ├── FilterBar.tsx          # game-type + date-range filter pills
│       ├── OverviewCard.tsx
│       ├── RatingChart.tsx
│       ├── AccuracyChart.tsx      # trend + histogram
│       ├── TacticsCard.tsx
│       ├── GamePhaseChart.tsx
│       ├── OpeningsTable.tsx
│       ├── ActivityHeatmap.tsx    # GitHub-style 52-week grid
│       ├── CalendarCharts.tsx
│       ├── CastlingCard.tsx
│       ├── PieceMovesCard.tsx
│       └── GeographyCard.tsx
└── pages/
    ├── HomePage.tsx
    └── InsightsPage.tsx
```

---

## Filters

The **FilterBar** at the top of the dashboard lets you slice all charts simultaneously:

- **Game type** — All · Rapid · Blitz · Bullet · Daily
- **Time period** — All time · Last 30 days · Last 90 days · Last 1 year

Every insight section updates instantly as you change filters — no re-fetching required.

---

## Performance & Caching

On first load, the app fetches your **entire game history** month by month and caches each completed month in **IndexedDB**. Subsequent visits are near-instant for old months; only the current month is re-fetched.

Opponent country fetching happens in the background after your games are loaded, batched at 5 requests per 150 ms to stay well within chess.com's rate limits.

---

## How Tactics Detection Works

Tactics analysis runs entirely in the browser using [chess.js](https://github.com/jhlywa/chess.js). For each of your last 100 games:

1. Replay every move from the starting position
2. Before each of **your** turns, enumerate all legal moves
3. If any legal move delivers immediate checkmate (mate-in-1), record whether you played it

No engine, no server, no WASM — pure JS position replay.

---

## API Usage

All data comes from the [chess.com Published Data API](https://www.chess.com/announcements/view/published-data-api). It is public, read-only, and requires no authentication. Endpoints used:

| Endpoint | Purpose |
|---|---|
| `GET /pub/player/{username}` | Profile + country code |
| `GET /pub/player/{username}/stats` | Current ratings by game type |
| `GET /pub/player/{username}/games/archives` | List of monthly archive URLs |
| `GET /pub/player/{username}/games/{YYYY}/{MM}` | All games for a month (includes PGN + accuracies) |

---

## Test Coverage

75 tests across three suites:

| Suite | Tests | What's covered |
|---|---|---|
| `chessApi.test.ts` | 13 | Fetch helpers, error handling, 404 behaviour |
| `gameAnalysis.test.ts` | 51 | Every analysis function (results, ratings, openings, calendar, accuracy, castling, phases, piece moves, heatmap, tactics, geography) |
| `UsernameForm.test.tsx` | 11 | Validation, submission, error states |

---

## Roadmap / Contributing

| Area | Ideas |
|---|---|
| Tactics | Full engine analysis via Stockfish WASM worker |
| Openings | ECO explorer with board preview |
| Comparison | Side-by-side two-player view |
| Export | Download stats as CSV / PNG |
| Auth | Optional chess.com OAuth for live data |

Pull requests welcome. Please add or update tests for any new analysis logic.

---

## License

MIT
