/**
 * IndexedDB cache for monthly game archives.
 * Avoids re-fetching months that have already been loaded.
 * Key format: "username:year:month"
 */
import type { ChessGame } from '../services/chessApi'

const DB_NAME = 'chess-insights'
const DB_VERSION = 1
const STORE = 'monthly-games'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function cacheKey(username: string, year: number, month: number): string {
  return `${username.toLowerCase()}:${year}:${month}`
}

/** True if this month is the current month and may still have new games */
function isCurrentMonth(year: number, month: number): boolean {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() + 1 === month
}

export async function getCachedGames(
  username: string,
  year: number,
  month: number,
): Promise<ChessGame[] | null> {
  if (isCurrentMonth(year, month)) return null
  try {
    const db = await openDB()
    return await new Promise<ChessGame[] | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(cacheKey(username, year, month))
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function setCachedGames(
  username: string,
  year: number,
  month: number,
  games: ChessGame[],
): Promise<void> {
  if (isCurrentMonth(year, month)) return
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const req = tx.objectStore(STORE).put(games, cacheKey(username, year, month))
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // Cache write failure is non-fatal
  }
}
