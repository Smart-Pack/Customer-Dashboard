<template>
  <div class="mt-4">
    <p class="secondary-text text-sm">
      Manage how you receive general and SmartPack notifications.
    </p>

    <form class="space-y-6 mt-8" @submit.prevent="updatePreferences">
      <section class="space-y-4">
        <h2 class="font-poppins tracking-[0.4em] uppercase underline secondary-text">
          Notification Channels
        </h2>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="space-y-2">
            <div class="flex items-center gap-1">
              <label for="preferred_general_channel" class="secondary-text font-semibold">
                General Notifications
              </label>
              <InfoTooltip
                text="Receive updates about your SmartPack assignments and group
              activities, including group invitations, membership changes, and role updates. These
              notifications keep you informed about changes to your account and groups."
              />
            </div>

            <InputField
              v-model="preferences.preferred_general_channel"
              name="preferred_general_channel"
              data-testid="general-channel-select"
              variant="select"
              :options="availableChannels"
              placeholder="Select Channel"
              rules="required|channel_requires_value:sms_phone_number,whatsapp_phone_number"
              :icon="markRaw(BellIcon)"
              error-label="General Channel"
              :disabled="isActive || submitting"
            />
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-1">
              <label for="preferred_smartpack_channel" class="secondary-text font-semibold">
                SmartPack Notifications
              </label>
              <InfoTooltip
                text="Choose how you receive SmartPack alerts, including SOS alerts and other device-related notifications, so you can stay informed about important events involving your SmartPack."
              />
            </div>

            <InputField
              v-model="preferences.preferred_smartpack_channel"
              name="preferred_smartpack_channel"
              data-testid="smartpack-channel-select"
              variant="select"
              :options="availableChannels"
              placeholder="Select Channel"
              rules="required|channel_requires_value:sms_phone_number,whatsapp_phone_number"
              :icon="markRaw(BackPackIcon)"
              error-label="SmartPack Channel"
              :disabled="isActive || submitting"
            />
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="font-poppins tracking-[0.4em] uppercase underline secondary-text">
          Contact Information
        </h2>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="space-y-2">
            <div class="flex items-center gap-1">
              <label for="sms_phone_number" class="secondary-text font-semibold">
                SMS Phone Number
              </label>
              <InfoTooltip text="This phone number is used to receive SMS notifications." />
            </div>

            <InputField
              :model-value="preferences.sms_phone_number"
              name="sms_phone_number"
              rules="noop"
              placeholder="Not configured"
              specific-type="phone"
              :icon="markRaw(PhoneIcon)"
              error-label="SMS Phone Number"
              disabled
              input-class="!bg-page dark:!bg-page-dark !cursor-not-allowed"
            />
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-1">
              <label for="whatsapp_phone_number" class="secondary-text font-semibold">
                WhatsApp Phone Number
              </label>
              <InfoTooltip text="This phone number is used to receive WhatsApp notifications." />
            </div>

            <InputField
              :model-value="preferences.whatsapp_phone_number"
              name="whatsapp_phone_number"
              placeholder="Not configured"
              rules="noop"
              specific-type="phone"
              :icon="markRaw(WhatsAppIcon)"
              error-label="WhatsApp Phone Number"
              disabled
              input-class="!bg-page dark:!bg-page-dark !cursor-not-allowed"
            />
          </div>
        </div>
        <!-- Manage both contact numbers -->
        <div class="flex justify-end pt-2">
          <button
            type="button"
            data-testid="manage-contact-numbers-button"
            class="form-submit px-5 py-2 text-sm font-semibold"
            @click="showContactNumbersModal = true"
          >
            Manage Contact Numbers
          </button>
        </div>
      </section>

      <div v-if="isActive" class="flex items-center secondary-text text-sm">
        <div class="mr-3 submit-spinner"></div>
        Loading notification preferences...
      </div>

      <div v-if="!isActive" class="flex justify-end">
        <button
          data-testid="save-notification-preferences-button"
          type="submit"
          class="form-submit px-6 py-2 text-sm font-semibold center-flex"
          :disabled="submitting || !hasChanges"
        >
          <span>{{ submitting ? 'Saving...' : 'Save Changes' }}</span>

          <div v-if="submitting" class="ml-4 submit-spinner"></div>
        </button>
      </div>
    </form>
    <NotificationsModal
      v-if="showContactNumbersModal"
      :sms-phone-number="preferences.sms_phone_number || ''"
      :whatsapp-phone-number="preferences.whatsapp_phone_number || ''"
      @close="showContactNumbersModal = false"
      @success="getPreferences"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * @module components/Users/Notifications
 * @description Displays and manages the authenticated user's notification preferences.
 *
 * Allows users to configure their preferred notification channels for general
 * and SmartPack notifications and view their configured contact phone numbers.
 */
import { computed, markRaw, onMounted, reactive, ref } from 'vue'
import { useForm } from 'vee-validate'

import {
  get,
  patch,
  type NotificationChannel,
  type NotificationPreferences,
  type UpdateNotificationPreferencesPayload,
} from '@/api/modules/notificationPreferences'
import BackPackIcon from '@/components/Icons/BackPackIcon.vue'
import BellIcon from '@/components/Icons/BellIcon.vue'
import InfoTooltip from '@/components/Base/InfoTooltip.vue'
import InputField from '@/components/Base/InputField.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import WhatsAppIcon from '@/components/Icons/WhatsAppIcon.vue'
import NotificationsModal from '@/components/Users/NotificationsModal.vue'
import type { AxiosError } from 'axios'
import { useGlobals } from '@/composables/useGlobals'

defineOptions({
  name: 'NotificationsView',
})

const { $notifySuccess, $notifyError } = useGlobals()

const isActive = ref(false)
const submitting = ref(false)

/**
 * Default values, seeded before the template renders so every field
 * exists in the model (same idea as `item` in CreationFormLayout).
 */
const defaultPreferences: NotificationPreferences = {
  id: 0,
  sms_phone_number: '',
  whatsapp_phone_number: '',
  preferred_general_channel: 'none',
  preferred_smartpack_channel: 'none',
}

const preferences = reactive<NotificationPreferences>({ ...defaultPreferences })

const originalPreferences = ref<UpdateNotificationPreferencesPayload>({
  preferred_general_channel: 'none',
  preferred_smartpack_channel: 'none',
})

type NotificationField = Exclude<keyof NotificationPreferences, 'id'>
/**
 * Initialize the form with vee-validate so each `InputField` (which registers
 * via `useField(name)`) reads its starting value from `initialValues` by name.
 */
const { handleSubmit, resetForm, setFieldError } = useForm({
  initialValues: {
    preferred_general_channel: defaultPreferences.preferred_general_channel,
    preferred_smartpack_channel: defaultPreferences.preferred_smartpack_channel,
    sms_phone_number: defaultPreferences.sms_phone_number,
    whatsapp_phone_number: defaultPreferences.whatsapp_phone_number,
  },
})

const availableChannels: { label: string; value: NotificationChannel }[] = [
  { label: 'None', value: 'none' },
  { label: 'Email', value: 'email' },
  { label: 'SMS', value: 'sms' },
  { label: 'WhatsApp', value: 'whatsapp' },
]

const hasChanges = computed(() => {
  return (
    preferences.preferred_general_channel !== originalPreferences.value.preferred_general_channel ||
    preferences.preferred_smartpack_channel !==
      originalPreferences.value.preferred_smartpack_channel
  )
})
const showContactNumbersModal = ref(false)
/**
 * Syncs a server response into the local model, the vee-validate fields,
 * and the baseline used for change detection.
 */
function applyPreferences(response: NotificationPreferences): void {
  Object.assign(preferences, response)

  // Push the loaded values into the already-mounted InputFields
  resetForm({
    values: {
      preferred_general_channel: response.preferred_general_channel,
      preferred_smartpack_channel: response.preferred_smartpack_channel,
      sms_phone_number: response.sms_phone_number ?? '',
      whatsapp_phone_number: response.whatsapp_phone_number ?? '',
    },
  })

  originalPreferences.value = {
    preferred_general_channel: response.preferred_general_channel,
    preferred_smartpack_channel: response.preferred_smartpack_channel,
  }
}

/**
 * Fetches the authenticated user's notification preferences.
 */
async function getPreferences(): Promise<void> {
  isActive.value = true

  try {
    const response = await get()

    applyPreferences(response)
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unable to load notification preferences.'

    $notifyError(message)
  } finally {
    isActive.value = false
  }
}

/**
 * Updates the authenticated user's notification preferences.
 * Uses VeeValidate to handle submission and API field errors.
 */
const updatePreferences = handleSubmit(async (values) => {
  if (isActive.value || submitting.value || !hasChanges.value) {
    return
  }
  try {
    submitting.value = true

    const payload: UpdateNotificationPreferencesPayload = {
      preferred_general_channel: values.preferred_general_channel,
      preferred_smartpack_channel: values.preferred_smartpack_channel,
    }

    const response = await patch(payload)

    applyPreferences(response)

    $notifySuccess('Notification preferences successfully updated.')
  } catch (error: unknown) {
    const axiosError = error as AxiosError<Record<string, string[]>>

    if (axiosError.response?.data) {
      Object.entries(axiosError.response.data).forEach(([field, messages]) => {
        const isNotificationField = [
          'sms_phone_number',
          'whatsapp_phone_number',
          'preferred_general_channel',
          'preferred_smartpack_channel',
        ].includes(field)

        if (isNotificationField && Array.isArray(messages) && messages.length > 0) {
          setFieldError(field as NotificationField, messages[0])
        }
      })
    }

    $notifyError(axiosError.message ?? 'Unable to update notification preferences.')
  } finally {
    submitting.value = false
  }
})

/**
 * Loads notification preferences when the component is mounted.
 */
onMounted(async () => {
  await getPreferences()
})
</script>
