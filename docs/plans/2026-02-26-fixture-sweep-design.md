# Fixture-Based Load Testing Design

**Date:** 2026-02-26
**Goal:** Replace the live-API Playwright sweep with a fixture-based approach that makes exactly one real API call (to capture data), then replays that data deterministically across all 8 N values with zero additional network calls.

---

## Problem with the original sweep

The original `game-limit-sweep.spec.ts` hits the chess.com API once per N value (8 times total), risking rate limiting and making the sweep slow, non-deterministic, and network-dependent.

---

## Architecture

Two phases:

### Phase 1 — One-time fixture capture (run once, commit result)

A standalone script (`tests/load/capture-fixtures.ts`) hits the chess.com API and saves all data as JSON:

```
tests/load/fixtures/
  data.json   ← { username, profile, stats, games[] }
```

Run with:
```bash
CHESS_TEST_USERNAME=hikaru npx tsx tests/load/capture-fixtures.ts
```

The script fetches:
1. Player profile (`/pub/player/{username}`)
2. Player stats (`/pub/player/{username}/stats`)
3. Game archives (`/pub/player/{username}/games/archives`)
4. Games from the last 6 months (enough to collect 300–500 games with full PGNs)

Fixture files are committed to the repo. After the one-time capture, the sweep never touches the network again.

### Phase 2 — Fixture-based sweep (0 API calls)

The sweep test (`tests/load/game-limit-sweep.spec.ts`) is updated to:

1. Load `tests/load/fixtures/data.json` at test start
2. For each N, register `page.route()` to intercept all `api.chess.com` calls:
   - `/pub/player/{username}` → return fixture profile
   - `/pub/player/{username}/stats` → return fixture stats
   - `/pub/player/{username}/games/archives` → return a single fake archive URL
   - `/pub/player/{username}/games/{year}/{month}` → return all fixture games
3. Set `window.__CHESS_TEST__ = { gameLimit: N, monthsLimit: 1 }` — all games come from the one fake archive month; `gameLimit` slices to N
4. Submit the fixture username in the form, wait for dashboard, collect metrics
5. Unregister routes (via `context.close()`)

The analysis pipeline runs identically to production — only the network is mocked.

---

## Files Changed

| File | Change |
|---|---|
| `tests/load/capture-fixtures.ts` | New script — one-time API capture |
| `tests/load/fixtures/data.json` | New fixture file (committed) |
| `tests/load/game-limit-sweep.spec.ts` | Replace live API calls with `page.route()` mocking |
| `.gitignore` | No change needed (fixtures should be committed) |

---

## Key Properties

- **Deterministic**: same fixture data every run
- **Offline**: no network after initial capture
- **Realistic**: real PGN data from a prolific player, authentic game complexity
- **Fast**: no API latency between N values, each run ~10–30s instead of ~90s timeout
- **Safe**: one API call total, not 8+
