<template>
  <div class="space-y-3">
    <!-- MQTT connection status -->
    <div
      v-if="!mqttConnected"
      class="secondary-text flex items-center gap-2 text-xs"
      role="status"
      aria-live="polite"
    >
      <span class="h-2 w-2 shrink-0 rounded-full bg-gray-400" aria-hidden="true" />
      Live notifications disconnected. Reconnecting...
    </div>

    <div v-else class="secondary-text flex items-center gap-2 text-xs" role="status">
      <span class="h-2 w-2 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
      Live notifications connected
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="secondary-text py-6 text-center text-sm" role="status">
      Loading notifications...
    </div>

    <!-- Error state -->
    <div v-else-if="errorMessage" class="secondary-text py-4 text-center text-sm" role="alert">
      {{ errorMessage }}

      <button type="button" class="primary-text ml-1 underline" @click="retry">Retry</button>
    </div>

    <!-- Empty state -->
    <div v-else-if="notifications.length === 0" class="secondary-text py-6 text-center text-sm">
      No unread notifications.
    </div>

    <!-- Scrollable notification list -->
    <div v-else class="max-h-80 space-y-2 overflow-y-auto pr-1" aria-label="Unread notifications">
      <article
        v-for="notification in notifications"
        :key="notification.id"
        class="rounded-lg border border-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <div class="flex items-start gap-2 p-3">
          <!-- Notification content -->
          <button
            type="button"
            class="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
            :aria-label="`Open notification: ${notification.title}`"
            @click="openNotification(notification)"
          >
            <h3 class="primary-text text-sm font-semibold wrap-break-word">
              {{ notification.title }}
            </h3>

            <p class="secondary-text mt-1 text-sm whitespace-pre-wrap wrap-break-word">
              {{ notification.body }}
            </p>

            <time
              v-if="notification.created"
              :datetime="notification.created"
              class="secondary-text mt-2 block text-xs"
            >
              {{ formatDate(notification.created) }}
            </time>
          </button>

          <!-- Mark as read -->
          <button
            v-if="!notification.is_read"
            type="button"
            class="secondary-text shrink-0 rounded p-1 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
            :aria-label="`Mark ${notification.title} as read`"
            title="Mark as read"
            :disabled="updatingNotificationIds.has(notification.id)"
            @click="markAsRead(notification)"
          >
            <CloseIcon class="h-4 w-4" />
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import mqtt from 'mqtt'
import type { MqttClient } from 'mqtt'

import { notifications as notificationsApi } from '@/api/modules'
import type { Notification } from '@/api/modules/notifications'
import CloseIcon from '@/components/Icons/CloseIcon.vue'
import { useGlobals } from '@/composables/useGlobals'
import { useAuthStore, useMqttStore } from '@/stores'

defineOptions({
  name: 'NotificationContent',
})

const props = defineProps<{
  unreadCount: number
}>()

const emit = defineEmits<{
  'unread-count-change': [count: number]
}>()

const router = useRouter()
const authStore = useAuthStore()
const mqttStore = useMqttStore()
const { $notifyError } = useGlobals()

const notifications = ref<Notification[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const mqttConnected = ref(false)
const updatingNotificationIds = ref(new Set<number>())

/**
 * Local count avoids emitting a value based on a potentially stale prop.
 */
const unreadCount = ref(props.unreadCount)

/**
 * Tracks MQTT notifications that have not yet been accounted for
 * in the latest REST API response.
 */
const mqttUnreadIds = new Set<number>()

let mqttClient: MqttClient | null = null
let connectionAttempt: Promise<void> | null = null
let fetchAttempt: Promise<void> | null = null
let isUnmounted = false

watch(
  () => props.unreadCount,
  (count) => {
    unreadCount.value = count
  },
)

/**
 * Emits an unread count while keeping the local value synchronized.
 */
function updateUnreadCount(count: number): void {
  unreadCount.value = Math.max(0, count)
  emit('unread-count-change', unreadCount.value)
}

/**
 * Checks whether a value is a plain object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Validates the notification structure received over MQTT.
 */
function isNotification(value: unknown): value is Notification {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    typeof value.notification_type === 'string' &&
    typeof value.title === 'string' &&
    typeof value.body === 'string' &&
    typeof value.url === 'string' &&
    (value.data === null || typeof value.data === 'string' || isRecord(value.data)) &&
    (typeof value.read_at === 'string' || value.read_at === null) &&
    (typeof value.dismissed_at === 'string' || value.dismissed_at === null) &&
    typeof value.is_read === 'boolean' &&
    typeof value.is_dismissed === 'boolean' &&
    typeof value.created === 'string' &&
    typeof value.updated === 'string'
  )
}

/**
 * Handles a notification event published by the backend.
 *
 * Expected payload:
 * {
 *   event: 'notification',
 *   data: Notification
 * }
 */
function handleMqttMessage(payload: Uint8Array): void {
  try {
    const message: unknown = JSON.parse(new TextDecoder().decode(payload))

    if (!isRecord(message) || message.event !== 'notification') {
      return
    }

    if (!isNotification(message.data)) {
      console.warn('[MQTT] Ignoring invalid notification payload.')
      return
    }

    const notification = message.data

    // This component displays unread, non-dismissed notifications only.
    if (notification.is_read || notification.is_dismissed) {
      return
    }

    // Do not add the same notification more than once.
    const alreadyExists = notifications.value.some((item) => item.id === notification.id)

    if (alreadyExists) {
      return
    }

    notifications.value.unshift(notification)
    notifications.value = notifications.value.slice(0, 20)

    mqttUnreadIds.add(notification.id)
    updateUnreadCount(unreadCount.value + 1)

    console.info('[MQTT] Notification added:', notification.id)
  } catch (error: unknown) {
    console.error('[MQTT] Failed to process notification:', error)
  }
}

/**
 * Connects to HiveMQ Cloud using the authenticated user's credentials
 * and subscribes to that user's notification topic.
 */
async function connectToNotifications(): Promise<void> {
  if (isUnmounted || mqttClient) return

  // Prevent simultaneous connection attempts.
  if (connectionAttempt) {
    return connectionAttempt
  }

  connectionAttempt = (async () => {
    try {
      await mqttStore.fetchConfig()

      if (isUnmounted) return

      const config = mqttStore.config
      const uuid = authStore.userUuid

      if (!config || !uuid) {
        throw new Error('MQTT configuration or authenticated user UUID is unavailable.')
      }

      // Normalize the hostname in case the configuration includes
      // a protocol, port, or WebSocket path.
      const hostname = config.host
        .replace(/^wss?:\/\//i, '')
        .replace(/\/mqtt\/?$/i, '')
        .replace(/:\d+$/, '')

      if (!hostname || /[/\s]/.test(hostname)) {
        throw new Error('The configured MQTT hostname is invalid.')
      }

      const topic = `users/${uuid}`
      const brokerUrl = `wss://${hostname}:8884/mqtt`

      const client = mqtt.connect(brokerUrl, {
        username: config.username,
        password: config.password,
        reconnectPeriod: 3000,
        connectTimeout: 15000,
        clean: true,
      })

      mqttClient = client

      client.on('connect', () => {
        if (isUnmounted || mqttClient !== client) return

        mqttConnected.value = false

        console.info('[MQTT] Connected to HiveMQ Cloud.')

        client.subscribe(topic, { qos: 0 }, (error, granted) => {
          if (isUnmounted || mqttClient !== client) return

          if (error) {
            mqttConnected.value = false
            console.error('[MQTT] Subscription failed:', error)
            return
          }

          const rejected = granted?.some((subscription) => subscription.qos === 128)

          if (rejected || !granted?.length) {
            mqttConnected.value = false
            console.error('[MQTT] Broker rejected subscription:', topic)
            return
          }

          mqttConnected.value = true
          console.info('[MQTT] Subscribed to:', topic)
        })
      })

      client.on('message', (receivedTopic, payload) => {
        if (receivedTopic !== topic || isUnmounted) return

        handleMqttMessage(payload)
      })

      client.on('reconnect', () => {
        mqttConnected.value = false
        console.info('[MQTT] Reconnecting...')
      })

      client.on('offline', () => {
        mqttConnected.value = false
        console.info('[MQTT] Client offline.')
      })

      client.on('close', () => {
        mqttConnected.value = false
        console.info('[MQTT] Connection closed.')
      })

      client.on('error', (error) => {
        mqttConnected.value = false
        console.error('[MQTT] Connection error:', error.message)
      })
    } catch (error: unknown) {
      if (!isUnmounted) {
        console.error('[MQTT] Setup failed:', error)
      }
    }
  })()

  try {
    await connectionAttempt
  } finally {
    connectionAttempt = null
  }
}

/**
 * Disconnects the MQTT client and releases its connection.
 */
function disconnectFromNotifications(): void {
  const client = mqttClient

  mqttClient = null
  mqttConnected.value = false

  if (client) {
    client.removeAllListeners()
    client.end(true)
  }
}

/**
 * Fetches unread notifications from the REST API.
 *
 * MQTT events received while this request is in progress are preserved,
 * even if they are not present in the API response.
 */
async function fetchNotifications(): Promise<void> {
  if (fetchAttempt) {
    return fetchAttempt
  }

  fetchAttempt = (async () => {
    isLoading.value = true
    errorMessage.value = null

    // Preserve notifications that may arrive while the request is pending.
    const existingNotifications = [...notifications.value]

    try {
      const response = await notificationsApi.list({
        status: 'unread_not_dismissed',
        page_size: 20,
      })

      if (isUnmounted) return

      const apiNotifications = response.results
      const apiIds = new Set(apiNotifications.map((item) => item.id))
      const mergedNotifications = new Map<number, Notification>()

      // API results are authoritative for notifications already fetched.
      for (const notification of apiNotifications) {
        if (!notification.is_read && !notification.is_dismissed) {
          mergedNotifications.set(notification.id, notification)
        }
      }

      // Preserve unread MQTT notifications received during the API request.
      for (const notification of [...existingNotifications, ...notifications.value]) {
        if (
          !notification.is_read &&
          !notification.is_dismissed &&
          !mergedNotifications.has(notification.id)
        ) {
          mergedNotifications.set(notification.id, notification)
        }
      }

      notifications.value = [...mergedNotifications.values()]
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
        .slice(0, 20)

      // Only add MQTT notifications that the API count does not include.
      for (const id of apiIds) {
        mqttUnreadIds.delete(id)
      }

      const additionalUnreadCount = [...mqttUnreadIds].filter((id) => !apiIds.has(id)).length

      updateUnreadCount(response.count + additionalUnreadCount)
    } catch (error: unknown) {
      if (isUnmounted) return

      errorMessage.value = 'Unable to load notifications.'

      $notifyError(error instanceof Error ? error.message : 'Unable to load notifications.')
    } finally {
      if (!isUnmounted) {
        isLoading.value = false
      }
    }
  })()

  try {
    await fetchAttempt
  } finally {
    fetchAttempt = null
  }
}

/**
 * Retries both notification loading and MQTT connection setup.
 */
async function retry(): Promise<void> {
  await Promise.all([fetchNotifications(), connectToNotifications()])
}

/**
 * Marks a notification as read.
 *
 * The unread list and count are updated only after the API succeeds.
 */
async function markAsRead(notification: Notification): Promise<void> {
  if (notification.is_read || updatingNotificationIds.value.has(notification.id)) {
    return
  }

  updatingNotificationIds.value.add(notification.id)

  try {
    const updatedNotification = await notificationsApi.edit(notification.id, {
      read_at: new Date().toISOString(),
    })

    if (isUnmounted) return

    if (!updatedNotification.is_read && !updatedNotification.is_dismissed) {
      const index = notifications.value.findIndex((item) => item.id === notification.id)

      if (index !== -1) {
        notifications.value.splice(index, 1, updatedNotification)
      }

      return
    }

    const wasPresent = notifications.value.some((item) => item.id === notification.id)

    notifications.value = notifications.value.filter((item) => item.id !== notification.id)

    const wasTrackedByMqtt = mqttUnreadIds.delete(notification.id)

    if (wasPresent || wasTrackedByMqtt) {
      updateUnreadCount(unreadCount.value - 1)
    }
  } catch (error: unknown) {
    if (!isUnmounted) {
      $notifyError(error instanceof Error ? error.message : 'Unable to mark notification as read.')
    }
  } finally {
    updatingNotificationIds.value.delete(notification.id)
  }
}

/**
 * Opens the URL associated with a notification.
 */
async function openNotification(notification: Notification): Promise<void> {
  if (!notification.url) return

  try {
    if (/^https?:\/\//i.test(notification.url)) {
      window.location.assign(notification.url)
      return
    }

    await router.push(notification.url)
  } catch (error: unknown) {
    $notifyError(error instanceof Error ? error.message : 'Unable to open this notification.')
  }
}

/**
 * Formats an ISO 8601 timestamp for display.
 */
function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

onMounted(() => {
  void fetchNotifications()
  void connectToNotifications()
})

onBeforeUnmount(() => {
  isUnmounted = true
  disconnectFromNotifications()
})
</script>
