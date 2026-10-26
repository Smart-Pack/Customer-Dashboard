<template>
  <!-- Body -->
  <div class="card-base py-4 px-6 text-sm secondary-text space-y-5 overflow-y-auto flex-1">
    <p class="text-center opacity-70">
      Update your WhatsApp phone number. A verification code will be sent to your new number before
      the change takes effect.
    </p>

    <!-- Current number -->
    <div class="space-y-2">
      <label
        for="current_whatsapp_phone_number"
        class="secondary-text font-semibold text-left block pl-2 text-sm"
      >
        Current WhatsApp Phone Number
      </label>

      <InputField
        :model-value="whatsappPhoneNumber"
        name="current_whatsapp_phone_number"
        placeholder="Not configured"
        rules="noop"
        specific-type="phone"
        :icon="markRaw(PhoneIcon)"
        disabled
        input-class="!bg-page dark:!bg-page-dark !cursor-not-allowed"
      />
    </div>

    <!-- New number and Verify button -->
    <form class="space-y-5" @submit.prevent="requestOtp">
      <div class="space-y-2">
        <label
          for="whatsapp_phone_number"
          class="secondary-text font-semibold text-left block pl-2 text-sm"
        >
          New WhatsApp Phone Number
        </label>

        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <InputField
              name="whatsapp_phone_number"
              placeholder="+254723456789"
              specific-type="phone"
              :icon="markRaw(PhoneIcon)"
              error-label="New WhatsApp Phone Number"
              rules="required|phone_strict"
              :disabled="submitting || otpRequested"
            />
          </div>

          <button
            type="submit"
            class="form-submit px-4 py-2 text-sm font-semibold flex-shrink-0"
            :disabled="submitting || otpRequested"
          >
            <span>{{ otpRequested ? 'Sent' : 'Verify' }}</span>
          </button>
        </div>

        <p v-if="otpRequested" class="text-xs opacity-70">
          A verification code has been sent to your new WhatsApp phone number. Enter the code below
          to complete the update.
        </p>
      </div>
    </form>

    <!-- OTP verification -->
    <form v-if="otpRequested" class="space-y-2" @submit.prevent="saveChanges">
      <label for="otp" class="secondary-text font-semibold text-left block pl-2 text-sm">
        Verification Code
      </label>

      <InputField
        name="otp"
        placeholder="Enter verification code"
        error-label="Verification Code"
        rules="required|min:6|max:8"
        :disabled="submitting"
      />
    </form>
  </div>

  <!-- Footer -->
  <footer
    class="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 secondary-text flex-shrink-0"
  >
    <button
      type="button"
      class="form-submit-secondary px-5 py-2 text-sm font-semibold"
      :disabled="submitting || !whatsappPhoneNumber"
      @click="resetWhatsAppPhoneNumber"
    >
      Reset
    </button>

    <button
      type="button"
      class="form-submit px-6 py-2 text-sm font-semibold center-flex"
      :disabled="submitting || !otpRequested"
      @click="saveChanges"
    >
      <span>{{ submitting ? 'Saving...' : 'Save Changes' }}</span>

      <div v-if="submitting" class="ml-2 submit-spinner"></div>
    </button>
  </footer>
</template>

<script setup lang="ts">
/**
 * @module components/Users/NotificationsWhatsappModalBody
 * @description
 * Provides WhatsApp phone number management for notification preferences.
 *
 * Supports requesting a WhatsApp verification code, verifying the code to
 * update the phone number, and clearing the existing phone number.
 */

import { markRaw, ref } from 'vue'
import { useForm } from 'vee-validate'
import axios from 'axios'
import InputField from '@/components/Base/InputField.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import {
  clearWhatsAppPhoneNumber,
  requestWhatsAppOtp,
  verifyWhatsAppOtp,
  type RequestWhatsappOtpPayload,
  type VerifySmsOtpPayload,
} from '@/api/modules/notificationPreferences'
import { useGlobals } from '@/composables/useGlobals'

defineOptions({
  name: 'NotificationsWhatsappModalBody',
})

const props = defineProps<{
  whatsappPhoneNumber: string
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const { $notifySuccess, $notifyError, $deleteModal } = useGlobals()

interface WhatsappFormValues {
  whatsapp_phone_number: string
  otp: string
}

const submitting = ref(false)
const otpRequested = ref(false)
const whatsappPhoneNumber = ref(props.whatsappPhoneNumber)

const { handleSubmit, setFieldError, resetForm } = useForm<WhatsappFormValues>({
  initialValues: {
    whatsapp_phone_number: '',
    otp: '',
  },
})

/**
 * Requests a verification code for a new WhatsApp phone number.
 */
const requestOtp = handleSubmit(async (values) => {
  if (submitting.value || otpRequested.value) {
    return
  }

  try {
    submitting.value = true

    const payload: RequestWhatsappOtpPayload = {
      whatsapp_phone_number: values.whatsapp_phone_number.trim().replace(/\s+/g, ''),
    }

    const response = await requestWhatsAppOtp(payload)

    otpRequested.value = true

    $notifySuccess(response.message || 'Verification code sent successfully.')
  } catch (error: unknown) {
    handleApiError(error, 'Unable to send the WhatsApp verification code.')
  } finally {
    submitting.value = false
  }
})

/**
 * Verifies the OTP and saves the new WhatsApp phone number.
 */
const saveChanges = handleSubmit(async (values) => {
  if (submitting.value || !otpRequested.value) {
    return
  }

  try {
    submitting.value = true

    const payload: VerifySmsOtpPayload = {
      otp: values.otp.trim(),
    }

    const response = await verifyWhatsAppOtp(payload)

    $notifySuccess(response.message || 'WhatsApp phone number updated successfully.')

    emit('success')
    emit('close')
  } catch (error: unknown) {
    handleApiError(error, 'Unable to verify the WhatsApp verification code.')
  } finally {
    submitting.value = false
  }
})

/**
 * Clears the currently configured WhatsApp phone number after confirmation.
 */
async function resetWhatsAppPhoneNumber(): Promise<void> {
  try {
    const confirmation = await $deleteModal('Reset WhatsApp Phone Number', '', {
      text: 'Are you sure you want to clear your WhatsApp phone number?',
    })

    if (!confirmation) {
      return
    }

    submitting.value = true

    const response = await clearWhatsAppPhoneNumber()

    whatsappPhoneNumber.value = ''
    otpRequested.value = false

    resetForm({
      values: {
        whatsapp_phone_number: '',
        otp: '',
      },
    })

    $notifySuccess(response.message || 'WhatsApp phone number cleared successfully.')

    emit('success')
  } catch (error: unknown) {
    handleApiError(error, 'Unable to clear the WhatsApp phone number.')
  } finally {
    submitting.value = false
  }
}

/**
 * Handles API errors by assigning backend validation messages to form fields
 * and displaying an appropriate error notification.
 */
function handleApiError(error: unknown, fallback: string): void {
  if (axios.isAxiosError<Record<string, unknown>>(error)) {
    const data = error.response?.data

    if (data) {
      let hasFieldErrors = false

      for (const field of ['whatsapp_phone_number', 'otp'] as const) {
        const messages = data[field]

        if (Array.isArray(messages) && messages.length > 0) {
          setFieldError(field, String(messages[0]))
          hasFieldErrors = true
        }
      }

      const detail = data.detail

      if (typeof detail === 'string') {
        $notifyError(detail)
        return
      }

      if (hasFieldErrors) {
        return
      }
    }
  }

  const message = error instanceof Error ? error.message : fallback

  $notifyError(message || fallback)
}
</script>
