import { DATABASE_SCHEMA } from '../schema'
import type { SQLiteDBConnection } from '@capacitor-community/sqlite'

export async function up(database: SQLiteDBConnection): Promise<void> {
  for (const statement of DATABASE_SCHEMA) {
    await database.execute(statement, false)
  }
}
