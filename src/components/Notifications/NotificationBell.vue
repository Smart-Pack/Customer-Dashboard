<template>
  <div ref="containerRef" class="relative">
    <!-- Notification toggle -->
    <button
      data-testid="notification-toggle"
      type="button"
      class="secondary-text flex flex-col items-center justify-center"
      aria-haspopup="true"
      :aria-expanded="isDropdownOpen"
      aria-controls="notification-dropdown"
      :aria-label="
        isSubscribed
          ? 'Notifications enabled. Manage notification settings'
          : 'Notifications disabled. Manage notification settings'
      "
      @click="toggleDropdown"
    >
      <BellIcon v-if="isSubscribed" class="w-6 h-6 lg:w-8 lg:h-8 field-icon cursor-pointer" />
      <BellSlashIcon v-else class="w-6 h-6 lg:w-8 lg:h-8 field-icon cursor-pointer" />
    </button>

    <!-- Notification dropdown -->
    <div
      v-if="isDropdownOpen"
      id="notification-dropdown"
      class="absolute top-[calc(100%+0.75rem)] right-0 z-50 w-72 card-base p-4 shadow-lg"
      role="region"
      aria-label="Notifications"
    >
      <div class="flex justify-between items-center mb-2">
        <h2 class="primary-text text-sm font-semibold">
          Notifications
          <span v-if="unreadNotifications > 0"> ({{ unreadNotifications }}) </span>
        </h2>

        <RouterLink
          :to="{
            name: 'my-profile',
            query: { tabs: 'notifications' },
          }"
          aria-label="Notification settings"
        >
          <CogIcon class="primary-text w-5 h-5 cursor-pointer" />
        </RouterLink>
      </div>

      <!-- Notification content -->
      <NotificationContent
        :unread-count="unreadNotifications"
        @unread-count-change="handleUnreadCountChange"
      />

      <!-- Push notification controls -->
      <button
        data-testid="notification-action"
        type="button"
        class="form-submit w-full text-sm py-2 px-3 mt-4"
        :disabled="isLoading || !isNotificationSupported()"
        :aria-busy="isLoading"
        @click="toggleNotifications"
      >
        <div v-if="isLoading" class="flex justify-center items-center">
          <span>Please wait...</span>
          <span class="ml-4 submit-spinner" aria-hidden="true"></span>
        </div>

        <span v-else-if="isSubscribed">Turn off notifications</span>
        <span v-else>Turn on notifications</span>
      </button>

      <p v-if="!isNotificationSupported()" class="secondary-text text-xs mt-3">
        Notifications are not supported on this platform.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { App } from '@capacitor/app'

import BellIcon from '@/components/Icons/BellIcon.vue'
import CogIcon from '@/components/Icons/CogIcon.vue'
import BellSlashIcon from '@/components/Icons/BellSlashIcon.vue'
import NotificationContent from '@/components/Notifications/NotificationContent.vue'
import { useGlobals } from '@/composables/useGlobals'
import {
  syncPushSubscription,
  isPushNotificationSupported,
  isSubscribedToPushNotifications,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@/services/pushNotifications'
import {
  addNotificationReceivedListener,
  addNotificationActionListener,
  isFirebaseMessagingSupported,
  isSubscribedToFCM,
  requestNotificationPermission,
  syncFCMDevice,
  unregisterFCMDevice,
} from '@/services/firebaseMessaging'

defineOptions({
  name: 'NotificationBell',
})

/**
 * Determines whether the application is running as a native mobile build.
 */
const isMobile = import.meta.env.MODE === 'mobile'

/**
 * Tracks whether the notification dropdown is visible.
 */
const isDropdownOpen = ref(false)

/**
 * Tracks whether notifications are currently enabled.
 */
const isSubscribed = ref(false)

/**
 * Tracks whether a subscription operation is in progress.
 */
const isLoading = ref(false)

/**
 * Tracks the number of unread notifications.
 */
const unreadNotifications = ref(0)

/**
 * Root element used to detect clicks outside the dropdown.
 */
const containerRef = ref<HTMLElement | null>(null)

/**
 * Handles notifications received while the app is in the foreground.
 */
let notificationReceivedListener: Awaited<
  ReturnType<typeof addNotificationReceivedListener>
> | null = null

/**
 * Handles actions when the user taps an FCM notification.
 */
let notificationActionListener: Awaited<ReturnType<typeof addNotificationActionListener>> | null =
  null

/** Handles app state changes to refresh notification status when the app returns to the foreground. */
let appStateListener: Awaited<ReturnType<typeof App.addListener>> | null = null
const { $notifySuccess, $notifyError } = useGlobals()

/**
 * Checks whether notifications are supported on the current platform.
 */
function isNotificationSupported(): boolean {
  return isMobile ? isFirebaseMessagingSupported() : isPushNotificationSupported()
}

/**
 * Checks whether notifications are currently enabled.
 */
async function isNotificationEnabled(): Promise<boolean> {
  return isMobile ? await isSubscribedToFCM() : await isSubscribedToPushNotifications()
}

/**
 * Opens or closes the notification dropdown.
 */
function toggleDropdown(): void {
  isDropdownOpen.value = !isDropdownOpen.value
}

/**
 * Updates the unread notification count emitted by NotificationContent.
 */
function handleUnreadCountChange(count: number): void {
  unreadNotifications.value = Math.max(0, count)
}

/**
 * Refreshes the notification status and synchronizes
 * an existing subscription with the SmartPack backend.
 */
async function refreshSubscriptionStatus(): Promise<void> {
  try {
    isSubscribed.value = await isNotificationEnabled()

    if (isSubscribed.value) {
      if (isMobile) {
        await syncFCMDevice()
      } else {
        await syncPushSubscription()
      }
    }
  } catch (error: unknown) {
    $notifyError(
      error instanceof DOMException
        ? `${error.name}: ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Unable to update notification settings.',
    )
  }
}

/**
 * Enables or disables push notifications and updates the UI
 * to reflect the platform's actual notification state.
 */
async function toggleNotifications(): Promise<void> {
  if (isLoading.value) {
    return
  }

  isLoading.value = true

  try {
    const shouldSubscribe = !isSubscribed.value

    if (isMobile) {
      if (shouldSubscribe) {
        const granted = await requestNotificationPermission()

        if (!granted) {
          throw new Error('Notification permission was not granted.')
        }

        await syncFCMDevice()
      } else {
        await unregisterFCMDevice()
      }
    } else {
      if (shouldSubscribe) {
        await subscribeToPushNotifications()
      } else {
        await unsubscribeFromPushNotifications()
      }
    }

    isSubscribed.value = await isNotificationEnabled()

    if (isSubscribed.value !== shouldSubscribe) {
      throw new Error('Unable to update notification settings.')
    }

    $notifySuccess(
      shouldSubscribe ? 'Notifications have been enabled.' : 'Notifications have been disabled.',
    )

    isDropdownOpen.value = false
  } catch (error: unknown) {
    $notifyError(error instanceof Error ? error.message : 'Unable to update notification settings.')

    // Recheck the actual notification state after a failed operation.
    try {
      isSubscribed.value = await isNotificationEnabled()
    } catch (statusError: unknown) {
      $notifyError(
        statusError instanceof Error
          ? statusError.message
          : 'Unable to refresh notification status.',
      )
    }
  } finally {
    isLoading.value = false
  }
}

/**
 * Closes the dropdown when the user clicks outside it.
 */
function handleOutsideClick(event: MouseEvent): void {
  if (
    containerRef.value &&
    event.target instanceof Node &&
    !containerRef.value.contains(event.target)
  ) {
    isDropdownOpen.value = false
  }
}

/**
 * Closes the dropdown when the user presses Escape.
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    isDropdownOpen.value = false
  }
}
/**
 * Displays a success notification for an incoming FCM notification.
 */
function handleFCMNotification(notification: unknown): void {
  if (typeof notification !== 'object' || notification === null) {
    return
  }

  const { title, body } = notification as {
    title?: string
    body?: string
  }

  $notifySuccess(
    body ? `${title ?? 'SmartPack'}: ${body}` : (title ?? 'New notification received.'),
  )
}

/**
 * Initializes notification status, registers document event listeners,
 * sets up native FCM notification listeners, and monitors app state changes
 * to refresh notification status when the app returns to the foreground.
 */
onMounted(async () => {
  void refreshSubscriptionStatus()

  document.addEventListener('click', handleOutsideClick)
  document.addEventListener('keydown', handleKeydown)

  if (isMobile && isFirebaseMessagingSupported()) {
    notificationReceivedListener = await addNotificationReceivedListener((notification) => {
      handleFCMNotification(notification)
    })

    notificationActionListener = await addNotificationActionListener((notification) => {
      handleFCMNotification(notification)
    })
  }

  if (isMobile) {
    appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        try {
          isSubscribed.value = await isNotificationEnabled()
        } catch {
          // Keep the current subscription status if the check fails.
        }
      }
    })
  }
})

onBeforeUnmount(async () => {
  document.removeEventListener('click', handleOutsideClick)
  document.removeEventListener('keydown', handleKeydown)

  await appStateListener?.remove()
  await notificationReceivedListener?.remove()
  await notificationActionListener?.remove()

  appStateListener = null
  notificationReceivedListener = null
  notificationActionListener = null
})
</script>
