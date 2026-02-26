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
