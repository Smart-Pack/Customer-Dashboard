import type { NotificationPreferences } from '@/api/modules/notificationPreferences'
import { getDatabase } from '../database'

const TABLE_NAME = 'cached_notification_preferences'
const LOCAL_RECORD_ID = 1

/**
 * Saves the notification preferences to the local database.
 *
 * Replaces the existing cached preferences with the supplied values.
 *
 * @param preferences - Notification preferences returned by the API.
 * @returns {Promise<void>}
 */
async function save(preferences: NotificationPreferences): Promise<void> {
  const db = await getDatabase()

  try {
    await db.beginTransaction()

    await db.run(
      `INSERT OR REPLACE INTO ${TABLE_NAME} (
        id,
        sms_phone_number,
        whatsapp_phone_number,
        preferred_general_channel,
        preferred_smartpack_channel,
        cached_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        LOCAL_RECORD_ID,
        preferences.sms_phone_number,
        preferences.whatsapp_phone_number,
        preferences.preferred_general_channel,
        preferences.preferred_smartpack_channel,
        new Date().toISOString(),
      ],
      false,
    )

    await db.commitTransaction()
  } catch (error) {
    try {
      await db.rollbackTransaction()
    } catch {
      // Preserve the original database error.
    }

    console.error(
      '[NotificationPreferencesRepository] Failed to save notification preferences:',
      error,
    )

    throw error
  }
}

/**
 * Retrieves the locally cached notification preferences.
 *
 * @returns {Promise<NotificationPreferences | null>}
 */
async function get(): Promise<NotificationPreferences | null> {
  const db = await getDatabase()

  try {
    const result = await db.query(
      `SELECT
        id,
        sms_phone_number,
        whatsapp_phone_number,
        preferred_general_channel,
        preferred_smartpack_channel
      FROM ${TABLE_NAME}
      WHERE id = ?`,
      [LOCAL_RECORD_ID],
    )

    const preferences = result.values?.[0]

    if (!preferences) return null

    return {
      id: preferences.id,
      sms_phone_number: preferences.sms_phone_number,
      whatsapp_phone_number: preferences.whatsapp_phone_number,
      preferred_general_channel: preferences.preferred_general_channel,
      preferred_smartpack_channel: preferences.preferred_smartpack_channel,
    } as NotificationPreferences
  } catch (error) {
    console.error(
      '[NotificationPreferencesRepository] Failed to retrieve notification preferences:',
      error,
    )

    throw error
  }
}

/**
 * Removes the locally cached notification preferences.
 *
 * @returns {Promise<void>}
 */
async function clear(): Promise<void> {
  const db = await getDatabase()

  try {
    await db.run(`DELETE FROM ${TABLE_NAME}`, [], false)
  } catch (error) {
    console.error(
      '[NotificationPreferencesRepository] Failed to clear notification preferences:',
      error,
    )

    throw error
  }
}

export { save, get, clear }
