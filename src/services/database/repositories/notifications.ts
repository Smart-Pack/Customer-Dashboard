import type { SQLiteDBConnection } from '@capacitor-community/sqlite'

import type {
  Notification,
  NotificationQueryParams,
  NotificationStatus,
} from '@/api/modules/notifications'
import type { PaginatedResponse } from '@/api/types'

import { getDatabase } from '../database'
import { withTransaction } from '../transaction'
import { paginate } from '../pagination'

/**
 * Represents a cached notification.
 */
export interface CachedNotification extends Notification {
  cached_at: string
}

/**
 * Represents a raw cached notification database row.
 */
interface CachedNotificationRow extends Omit<
  CachedNotification,
  'data' | 'is_read' | 'is_dismissed'
> {
  data: string | null
  is_read: number
  is_dismissed: number
}

/**
 * Converts notification data into a SQLite-compatible string.
 *
 * @param data - Notification data from the API.
 * @returns Serialized notification data or null.
 */
function serializeData(data: Notification['data']): string | null {
  if (data === null) {
    return null
  }

  return JSON.stringify(data)
}

/**
 * Converts serialized notification data into its API representation.
 *
 * @param data - Serialized notification data from SQLite.
 * @returns Deserialized notification data or null.
 */
function deserializeData(data: string | null): Notification['data'] {
  if (data === null) {
    return null
  }

  try {
    return JSON.parse(data) as Notification['data']
  } catch {
    return data
  }
}

/**
 * Converts a SQLite notification record into the API Notification structure.
 *
 * @param row - Notification record retrieved from SQLite.
 * @returns Notification with correctly typed fields.
 */
function mapRow(row: CachedNotificationRow): CachedNotification {
  return {
    id: row.id,
    notification_type: row.notification_type,
    title: row.title,
    body: row.body,
    url: row.url,
    data: deserializeData(row.data),
    read_at: row.read_at,
    dismissed_at: row.dismissed_at,
    is_read: Boolean(row.is_read),
    is_dismissed: Boolean(row.is_dismissed),
    created: row.created,
    updated: row.updated,
    cached_at: row.cached_at,
  }
}

/**
 * Builds SQLite filters from notification query parameters.
 *
 * @param params - Notification query parameters.
 * @returns SQL WHERE clause and corresponding parameter values.
 */
function buildFilters(params: NotificationQueryParams = {}): {
  where: string
  values: (string | number)[]
} {
  const conditions: string[] = []
  const values: (string | number)[] = []

  if (params.created) {
    conditions.push('created = ?')
    values.push(params.created)
  }

  if (params.created__gt) {
    conditions.push('created > ?')
    values.push(params.created__gt)
  }

  if (params.created__lt) {
    conditions.push('created < ?')
    values.push(params.created__lt)
  }

  if (params.is_read !== undefined) {
    conditions.push('is_read = ?')
    values.push(Number(params.is_read))
  }

  if (params.is_dismissed !== undefined) {
    conditions.push('is_dismissed = ?')
    values.push(Number(params.is_dismissed))
  }

  if (params.notification_type) {
    conditions.push('notification_type = ?')
    values.push(params.notification_type)
  }

  if (params.status) {
    const statusFilters: Record<NotificationStatus, [number, number]> = {
      unread_not_dismissed: [0, 0],
      read_not_dismissed: [1, 0],
      unread_dismissed: [0, 1],
      read_dismissed: [1, 1],
    }

    const [isRead, isDismissed] = statusFilters[params.status]

    conditions.push('is_read = ? AND is_dismissed = ?')
    values.push(isRead, isDismissed)
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  }
}

/**
 * Inserts or updates a notification in the local SQLite database.
 *
 * @param db - SQLite database connection.
 * @param notification - Notification retrieved from the API.
 */
async function upsert(db: SQLiteDBConnection, notification: Notification): Promise<void> {
  await db.run(
    `INSERT INTO cached_notifications (
      id, notification_type, title, body, url, data,
      read_at, dismissed_at, is_read, is_dismissed,
      created, updated, cached_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      notification_type = excluded.notification_type,
      title = excluded.title,
      body = excluded.body,
      url = excluded.url,
      data = excluded.data,
      read_at = excluded.read_at,
      dismissed_at = excluded.dismissed_at,
      is_read = excluded.is_read,
      is_dismissed = excluded.is_dismissed,
      created = excluded.created,
      updated = excluded.updated,
      cached_at = excluded.cached_at`,
    [
      notification.id,
      notification.notification_type,
      notification.title,
      notification.body,
      notification.url,
      serializeData(notification.data),
      notification.read_at,
      notification.dismissed_at,
      Number(notification.is_read),
      Number(notification.is_dismissed),
      notification.created,
      notification.updated,
      new Date().toISOString(),
    ],
    false,
  )
}

/**
 * Saves a notification to the local SQLite database.
 *
 * Inserts a new notification or updates an existing record when its ID
 * already exists.
 *
 * @param notification - Notification retrieved from the API.
 */
async function save(notification: Notification): Promise<void> {
  await withTransaction((db) => upsert(db, notification))
}

/**
 * Saves a list of notifications to the local SQLite database.
 *
 * Uses a transaction to ensure all notifications are persisted together.
 *
 * @param notifications - Notifications retrieved from the API.
 */
async function saveList(notifications: Notification[]): Promise<void> {
  try {
    await withTransaction(async (db) => {
      for (const notification of notifications) {
        await upsert(db, notification)
      }
    })
  } catch (error) {
    console.error('[Database] Failed to save notifications:', error)
    throw error
  }
}

/**
 * Replaces all cached notifications with the supplied list.
 *
 * Deletes existing cached notifications and inserts the new records
 * within a single transaction.
 *
 * @param notifications - Complete notification collection retrieved from the API.
 */
async function replaceList(notifications: Notification[]): Promise<void> {
  try {
    await withTransaction(async (db) => {
      await db.run('DELETE FROM cached_notifications', [], false)

      for (const notification of notifications) {
        await upsert(db, notification)
      }
    })
  } catch (error) {
    console.error('[Database] Failed to replace cached notifications:', error)
    throw error
  }
}

/**
 * Retrieves a cached notification by its ID.
 *
 * @param id - Notification ID.
 * @returns Cached notification or null when not found.
 */
async function getById(id: number): Promise<CachedNotification | null> {
  const db = await getDatabase()

  const result = await db.query(
    `SELECT *
   FROM cached_notifications
   WHERE id = ?
   LIMIT 1`,
    [id],
  )

  const row = result.values?.[0]

  return row ? mapRow(row as CachedNotificationRow) : null
}

/**
 * Retrieves all cached notifications.
 *
 * Notifications are ordered from newest to oldest.
 *
 * @returns Cached notifications.
 */
async function getAll(): Promise<CachedNotification[]> {
  const db = await getDatabase()

  const result = await db.query(
    `SELECT *
   FROM cached_notifications
   ORDER BY created DESC, id DESC`,
  )

  return (result.values ?? []).map((row) => mapRow(row as CachedNotificationRow))
}

/**
 * Retrieves cached notifications using filters and pagination.
 *
 * Supports the notification API's filtering parameters.
 *
 * @param params - Notification filters and pagination parameters.
 * @returns Paginated cached notifications.
 */
async function getPaginated(
  params: NotificationQueryParams = {},
): Promise<PaginatedResponse<CachedNotification>> {
  const db = await getDatabase()
  const { where, values } = buildFilters(params)

  const result = await db.query(
    `SELECT *
   FROM cached_notifications
   ${where}
   ORDER BY created DESC, id DESC`,
    values,
  )

  const notifications = (result.values ?? []).map((row) => mapRow(row as CachedNotificationRow))
  const page = params.page ?? 1
  const pageSize = params.page_size ?? 10

  if (!Number.isInteger(page) || page < 1) {
    throw new Error('Page must be a positive integer.')
  }

  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('Page size must be a positive integer.')
  }

  return paginate(notifications, page, pageSize)
}

/**
 * Marks a cached notification as read.
 *
 * @param id - Notification ID.
 * @param readAt - Timestamp when the notification was read.
 */
async function markAsRead(id: number, readAt = new Date().toISOString()): Promise<void> {
  const db = await getDatabase()

  await db.run(
    `UPDATE cached_notifications
     SET is_read = 1,
         read_at = ?,
         updated = ?
     WHERE id = ?`,
    [readAt, readAt, id],
    false,
  )
}

/**
 * Marks a cached notification as unread.
 *
 * @param id - Notification ID.
 */
async function markAsUnread(id: number): Promise<void> {
  const db = await getDatabase()
  const updated = new Date().toISOString()

  await db.run(
    `UPDATE cached_notifications
     SET is_read = 0,
         read_at = NULL,
         updated = ?
     WHERE id = ?`,
    [updated, id],
    false,
  )
}

/**
 * Dismisses a cached notification.
 *
 * @param id - Notification ID.
 * @param dismissedAt - Timestamp when the notification was dismissed.
 */
async function dismiss(id: number, dismissedAt = new Date().toISOString()): Promise<void> {
  const db = await getDatabase()

  await db.run(
    `UPDATE cached_notifications
     SET is_dismissed = 1,
         dismissed_at = ?,
         updated = ?
     WHERE id = ?`,
    [dismissedAt, dismissedAt, id],
    false,
  )
}

/**
 * Deletes a cached notification by its ID.
 *
 * @param id - Notification ID.
 */
async function deleteById(id: number): Promise<void> {
  const db = await getDatabase()

  await db.run(
    `DELETE FROM cached_notifications
     WHERE id = ?`,
    [id],
    false,
  )
}

/**
 * Deletes all cached notifications.
 */
async function clear(): Promise<void> {
  const db = await getDatabase()

  await db.run('DELETE FROM cached_notifications', [], false)
}

export {
  save,
  saveList,
  replaceList,
  getById,
  getAll,
  getPaginated,
  markAsRead,
  markAsUnread,
  dismiss,
  deleteById,
  clear,
}
