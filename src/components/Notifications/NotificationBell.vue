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
      <BellIcon v-if="isSubscribed" class="w-6 h-6 lg:w-8 lg:h-8 field-icon" />
      <BellSlashIcon v-else class="w-6 h-6 lg:w-8 lg:h-8 field-icon" />
    </button>

    <!-- Notification dropdown -->
    <div
      v-if="isDropdownOpen"
      id="notification-dropdown"
      class="absolute top-[calc(100%+0.75rem)] right-0 z-50 w-72 card-base p-4 shadow-lg"
      role="region"
      aria-label="Notification settings"
    >
      <h2 class="primary-text text-sm font-semibold mb-2">
        Notifications
      </h2>

      <p class="secondary-text text-sm mb-4">
        {{
          isSubscribed
            ? 'Browser notifications are enabled on this device.'
            : 'Receive important SmartPack alerts directly in your browser.'
        }}
      </p>

      <p
        v-if="errorMessage"
        data-testid="notification-error"
        class="text-sm text-red-500 mb-3"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <p
        v-if="successMessage"
        data-testid="notification-success"
        class="text-sm mb-3"
        role="status"
      >
        {{ successMessage }}
      </p>

      <button
        data-testid="notification-action"
        type="button"
        class="form-submit w-full text-sm py-2 px-3"
        :disabled="isLoading || !isPushNotificationSupported()"
        @click="toggleNotifications"
      >
        <span v-if="isLoading">Please wait...</span>
        <span v-else-if="isSubscribed">Turn off notifications</span>
        <span v-else>Turn on notifications</span>
      </button>

      <p
        v-if="!isPushNotificationSupported()"
        class="secondary-text text-xs mt-3"
      >
        Browser notifications are not supported by this browser.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import BellIcon from '@/components/Icons/BellIcon.vue'
import BellSlashIcon from '@/components/Icons/BellSlashIcon.vue'
import {
  ensureServiceWorkerReady,
  logSubscriptionCount,
  syncPushSubscription,
  isPushNotificationSupported,
  isSubscribedToPushNotifications,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@/services/pushNotifications'
defineOptions({
  name: 'NotificationBell',
})

/**
 * Tracks whether the notification dropdown is visible.
 */
const isDropdownOpen = ref(false)

/**
 * Tracks whether this browser currently has a push subscription.
 */
const isSubscribed = ref(false)

/**
 * Tracks whether a subscription operation is in progress.
 */
const isLoading = ref(false)

/**
 * Displays errors encountered while managing notifications.
 */
const errorMessage = ref('')

/**
 * Displays the result of a successful notification operation.
 */
const successMessage = ref('')

/**
 * Root element used to detect clicks outside the dropdown.
 */
const containerRef = ref<HTMLElement | null>(null)

/**
 * Opens or closes the notification dropdown.
 */
function toggleDropdown(): void {
  isDropdownOpen.value = !isDropdownOpen.value
  errorMessage.value = ''
  successMessage.value = ''
}

/**
 * Synchronizes browser push subscription status with the backend.
 */
async function refreshSubscriptionStatus() {
  console.log('[refresh] start, supported:', isPushNotificationSupported())
  try {
    const reg = await ensureServiceWorkerReady()
    console.log('[refresh] SW registration:', reg)

    isSubscribed.value = await isSubscribedToPushNotifications()
    console.log('[refresh] isSubscribed:', isSubscribed.value)

    if (isSubscribed.value) {
      await syncPushSubscription()
    }
  } catch (error: unknown) {
  console.error('[toggle] failed:', error instanceof DOMException ? `${error.name}: ${error.message}` : error)
  errorMessage.value = error instanceof Error ? error.message : 'Unable to update notification settings.'
  }
}

/**
 * Enables or disables browser push notifications.
 */
async function toggleNotifications(): Promise<void> {
  if (isLoading.value) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (isSubscribed.value) {
      await unsubscribeFromPushNotifications()
    } else {
      await subscribeToPushNotifications()
    }

    // Always check the actual browser subscription after the operation.
    await refreshSubscriptionStatus()

    if (isSubscribed.value) {
      successMessage.value = 'Browser notifications have been enabled.'
    } else {
      successMessage.value = 'Browser notifications have been disabled.'
    }
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Unable to update notification settings.'

    // Synchronize the icon and button with the actual browser state.
    await refreshSubscriptionStatus()
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

onMounted(() => {
  void refreshSubscriptionStatus()
  void logSubscriptionCount()

  document.addEventListener('click', handleOutsideClick)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
  document.removeEventListener('keydown', handleKeydown)
})
</script>
