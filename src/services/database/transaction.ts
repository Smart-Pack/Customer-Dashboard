// database/transaction.ts
import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { getDatabase } from '../database'

let queue: Promise<unknown> = Promise.resolve()

export function withTransaction<T>(fn: (db: SQLiteDBConnection) => Promise<T>): Promise<T> {
  const task = async () => {
    const db = await getDatabase()
    await db.beginTransaction()
    try {
      const result = await fn(db)
      await db.commitTransaction()
      return result
    } catch (error) {
      try {
        await db.rollbackTransaction()
      } catch (rollbackError) {
        console.error('[Database] Rollback failed:', rollbackError)
      }
      throw error
    }
  }

  const next = queue.then(task, task)
  queue = next.catch(() => {}) // keep the queue alive after failures
  return next
}
