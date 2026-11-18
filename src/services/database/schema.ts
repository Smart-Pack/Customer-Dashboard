/**
 * Initial SmartPack SQLite database schema.
 *
 * Database tables cache API responses locally for offline-first
 * functionality. The database assumes a single active user account
 * per installation. User-specific cached data must be cleared on logout.
 */

export const DATABASE_SCHEMA = [
  // ---------------------------------------------------------
  // Cached authenticated user profile
  // ---------------------------------------------------------
  `
    CREATE TABLE IF NOT EXISTS cached_user (
      id INTEGER PRIMARY KEY NOT NULL,
      unique_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      profile_pic TEXT,
      account_type TEXT NOT NULL CHECK (
        account_type IN ('customer', 'internal')
      ),
      role TEXT NOT NULL CHECK (
        role IN ('staff', 'admin')
      ),
      date_of_birth TEXT,
      gender TEXT NOT NULL CHECK (
        gender IN ('male', 'female', 'other')
      ),
      changed_password_after_initial_login INTEGER NOT NULL CHECK (
        changed_password_after_initial_login IN (0, 1)
      ),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      two_factor_enabled INTEGER NOT NULL CHECK (
        two_factor_enabled IN (0, 1)
      ),
      status TEXT NOT NULL,
      is_active INTEGER NOT NULL CHECK (
        is_active IN (0, 1)
      ),
      groups TEXT NOT NULL DEFAULT '[]',
      cached_at TEXT NOT NULL
    );
  `,

  // ---------------------------------------------------------
  // Cached groups
  // ---------------------------------------------------------
  `
    CREATE TABLE IF NOT EXISTS cached_groups (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      total_users INTEGER NOT NULL DEFAULT 0,
      total_smartpacks INTEGER NOT NULL DEFAULT 0,
      created TEXT NOT NULL,
      updated TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );
  `,

  // ---------------------------------------------------------
  // Cached group members
  // ---------------------------------------------------------
  `
    CREATE TABLE IF NOT EXISTS cached_group_members (
      id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,

      -- GroupMemberUser fields
      user_id INTEGER NOT NULL,
      user_uuid TEXT NOT NULL,
      user_full_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      user_phone TEXT NOT NULL,

      -- GroupMember fields
      role TEXT NOT NULL CHECK (
        role IN ('owner', 'admin', 'member')
      ),
      created TEXT NOT NULL,
      updated TEXT NOT NULL,

      cached_at TEXT NOT NULL,

      PRIMARY KEY (group_id, id),

      FOREIGN KEY (group_id)
        REFERENCES cached_groups(id)
        ON DELETE CASCADE
    );
  `,

  // ---------------------------------------------------------
  // Cached SmartPacks
  // ---------------------------------------------------------
  `
    CREATE TABLE IF NOT EXISTS cached_smartpacks (
      id INTEGER PRIMARY KEY NOT NULL,
      device_uid TEXT NOT NULL UNIQUE,
      hardware_model TEXT NOT NULL,
      imei TEXT NOT NULL,
      firmware_version TEXT NOT NULL,
      bluetooth_mac_address TEXT,
      last_seen TEXT NOT NULL,
      is_online INTEGER NOT NULL CHECK (
        is_online IN (0, 1)
      ),

      -- SmartPackAssignedUser fields (nullable)
      assigned_user_id INTEGER,
      assigned_user_uuid TEXT,
      assigned_user_full_name TEXT,
      assigned_user_email TEXT,
      assigned_user_phone TEXT,

      child_name TEXT NOT NULL,

      -- SmartPackGroup fields (nullable)
      group_id INTEGER,
      group_name TEXT,

      created TEXT NOT NULL,
      updated TEXT NOT NULL,

      cached_at TEXT NOT NULL,

      FOREIGN KEY (group_id)
        REFERENCES cached_groups(id)
        ON DELETE SET NULL
    );
  `,

  // ---------------------------------------------------------
  // Cached SmartPack sensor measurements
  // ---------------------------------------------------------
  `
    CREATE TABLE IF NOT EXISTS cached_smartpack_sensor_measurements (
      id INTEGER PRIMARY KEY NOT NULL,
      smartpack_id INTEGER NOT NULL,
      steps INTEGER NOT NULL,
      weight INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      created TEXT NOT NULL,
      updated TEXT NOT NULL,
      cached_at TEXT NOT NULL,

      FOREIGN KEY (smartpack_id)
        REFERENCES cached_smartpacks(id)
        ON DELETE CASCADE
    );
  `,

  // ---------------------------------------------------------
  // Cached notifications
  // ---------------------------------------------------------
  `
    CREATE TABLE IF NOT EXISTS cached_notifications (
      id INTEGER PRIMARY KEY NOT NULL,
      notification_type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      url TEXT NOT NULL,
      data TEXT,
      read_at TEXT,
      dismissed_at TEXT,
      is_read INTEGER NOT NULL DEFAULT 0 CHECK (
        is_read IN (0, 1)
      ),
      is_dismissed INTEGER NOT NULL DEFAULT 0 CHECK (
        is_dismissed IN (0, 1)
      ),
      created TEXT NOT NULL,
      updated TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );
  `,

  // ---------------------------------------------------------
  // Cached notification preferences
  // ---------------------------------------------------------
  `
    CREATE TABLE IF NOT EXISTS cached_notification_preferences (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      sms_phone_number TEXT NOT NULL,
      whatsapp_phone_number TEXT NOT NULL,
      preferred_general_channel TEXT NOT NULL CHECK (
        preferred_general_channel IN ('none', 'sms', 'whatsapp', 'email')
      ),
      preferred_smartpack_channel TEXT NOT NULL CHECK (
        preferred_smartpack_channel IN ('none', 'sms', 'whatsapp', 'email')
      ),
      cached_at TEXT NOT NULL
    );
  `,

  // ---------------------------------------------------------
  // Cached admin general analysis
  // ---------------------------------------------------------
  `
    CREATE TABLE IF NOT EXISTS cached_admin_general_analysis (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),

      -- User analysis
      total_users INTEGER NOT NULL,
      total_customers INTEGER NOT NULL,
      total_internal_users INTEGER NOT NULL,

      -- SmartPack analysis
      total_smartpacks INTEGER NOT NULL,
      assigned_smartpacks INTEGER NOT NULL,
      unassigned_smartpacks INTEGER NOT NULL,

      cached_at TEXT NOT NULL
    );
  `,
  // ---------------------------------------------------------
  // Cached Bluetooth sensor measurements
  // ---------------------------------------------------------
  `
    CREATE TABLE IF NOT EXISTS cached_bluetooth_sensor_measurements (
      smartpack_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      weight INTEGER NOT NULL,
      steps INTEGER NOT NULL,

      PRIMARY KEY (smartpack_id, timestamp),

      FOREIGN KEY (smartpack_id)
        REFERENCES cached_smartpacks(id)
        ON DELETE CASCADE
    );
  `,
  // ---------------------------------------------------------
  // Module synchronization metadata
  // ---------------------------------------------------------
  `
    CREATE TABLE IF NOT EXISTS sync_metadata (
      module TEXT PRIMARY KEY NOT NULL,

      -- Timestamp of the last successful synchronization
      last_synced_at TEXT,

      -- Current synchronization state
      sync_status TEXT NOT NULL DEFAULT 'idle' CHECK (
        sync_status IN ('idle', 'syncing', 'success', 'failed')
      ),

      -- Timestamp of the most recent synchronization attempt
      last_attempted_at TEXT,

      -- Error from the most recent failed synchronization
      last_error TEXT
    );
  `,

  // ---------------------------------------------------------
  // Indexes
  // ---------------------------------------------------------

  // Group members
  `
    CREATE INDEX IF NOT EXISTS idx_cached_group_members_user
    ON cached_group_members(user_id);
  `,

  // SmartPacks
  `
    CREATE INDEX IF NOT EXISTS idx_cached_smartpacks_assigned_user
    ON cached_smartpacks(assigned_user_id);
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_cached_smartpacks_group
    ON cached_smartpacks(group_id);
  `,

  // Sensor measurements
  `
    CREATE INDEX IF NOT EXISTS idx_cached_measurements_smartpack_timestamp
    ON cached_smartpack_sensor_measurements(smartpack_id, timestamp);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_bluetooth_measurements_smartpack_timestamp
    ON cached_bluetooth_sensor_measurements(smartpack_id, timestamp DESC);
  `,

  // Notifications
  `
    CREATE INDEX IF NOT EXISTS idx_cached_notifications_status
    ON cached_notifications(is_read, is_dismissed);
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_cached_notifications_created
    ON cached_notifications(created);
  `,
] as const
