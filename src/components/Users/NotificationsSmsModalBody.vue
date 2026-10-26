<template>
  <!-- Body -->
  <div class="card-base py-4 px-6 text-sm secondary-text space-y-5 overflow-y-auto flex-1">
    <p class="text-center opacity-70">
      Update your SMS phone number. A verification code will be sent to your new number before the
      change takes effect.
    </p>

    <!-- Current number -->
    <div class="space-y-2">
      <label
        for="current_sms_phone_number"
        class="secondary-text font-semibold text-left block pl-2 text-sm"
      >
        Current SMS Phone Number
      </label>

      <InputField
        :model-value="smsPhoneNumber"
        name="current_sms_phone_number"
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
          for="sms_phone_number"
          class="secondary-text font-semibold text-left block pl-2 text-sm"
        >
          New SMS Phone Number
        </label>

        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <InputField
              name="sms_phone_number"
              placeholder="+254712345678"
              specific-type="phone"
              :icon="markRaw(PhoneIcon)"
              error-label="New SMS Phone Number"
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
          A verification code has been sent to your new phone number. Enter the code below to
          complete the update.
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
      :disabled="submitting || !smsPhoneNumber"
      @click="resetSmsPhoneNumber"
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
 * @module components/Users/NotificationsSmsModalBody
 * @description
 * Provides SMS phone number management for notification preferences.
 *
 * Supports requesting an SMS verification code, verifying the code to
 * update the phone number, and clearing the existing phone number.
 */

/**
 * Vue utilities for storing reactive state and preventing component
 * constructors from being made reactive.
 */
import { markRaw, ref } from 'vue'

/**
 * VeeValidate form utilities for form submission, validation, field errors,
 * and resetting form values.
 */
import { useForm } from 'vee-validate'

/**
 * Axios utilities for identifying HTTP request errors and accessing
 * backend validation responses.
 */
import axios from 'axios'

/**
 * Form input component used for phone number and verification code fields.
 */
import InputField from '@/components/Base/InputField.vue'

/**
 * Icon displayed alongside the phone number fields.
 */
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'

/**
 * API methods and payload types for managing the authenticated user's
 * SMS phone number.
 */
import {
  clearSmsPhoneNumber,
  requestSmsOtp,
  verifySmsOtp,
  type RequestSmsOtpPayload,
  type VerifySmsOtpPayload,
} from '@/api/modules/notificationPreferences'

/**
 * Global notification and confirmation modal utilities.
 */
import { useGlobals } from '@/composables/useGlobals'

/**
 * Registers the component's name for debugging and component inspection.
 */
defineOptions({
  name: 'NotificationsSmsModalBody',
})

/**
 * Component props.
 *
 * @property smsPhoneNumber - The currently configured SMS phone number.
 *   An empty string indicates that no number is configured.
 */
const props = defineProps<{
  smsPhoneNumber: string
}>()

/**
 * Component events.
 *
 * @event close - Requests that the parent close the notification modal.
 * @event success - Indicates that an SMS phone number operation succeeded
 *   and the parent should refresh notification preferences.
 */
const emit = defineEmits<{
  close: []
  success: []
}>()

/**
 * Global utilities for displaying success notifications, error notifications,
 * and confirmation dialogs.
 */
const { $notifySuccess, $notifyError, $deleteModal } = useGlobals()

/**
 * Values managed by the SMS phone number form.
 *
 * @property sms_phone_number - The new phone number to verify.
 * @property otp - The verification code sent to the new phone number.
 */
interface SmsFormValues {
  sms_phone_number: string
  otp: string
}

/**
 * Indicates whether an SMS phone number operation is in progress.
 *
 * Used to prevent duplicate submissions and disable relevant controls
 * while an API request is pending.
 */
const submitting = ref(false)

/**
 * Indicates whether an OTP has been requested successfully.
 *
 * When true, the new phone number field is locked and the verification
 * code field becomes visible.
 */
const otpRequested = ref(false)

/**
 * Stores the current SMS phone number displayed in the component.
 *
 * This local value is updated when the phone number is successfully cleared.
 */
const smsPhoneNumber = ref(props.smsPhoneNumber)

/**
 * Initializes the SMS form and exposes the form submission and validation
 * utilities required by the component.
 *
 * @property handleSubmit - Validates the form before executing a submission handler.
 * @property setFieldError - Assigns a validation error to a specific form field.
 * @property resetForm - Resets form values and validation state.
 */
const { handleSubmit, setFieldError, resetForm } = useForm<SmsFormValues>({
  initialValues: {
    sms_phone_number: '',
    otp: '',
  },
})

/**
 * Requests a verification code for a new SMS phone number.
 *
 * Validates the form, removes whitespace from the submitted phone number,
 * and calls the SMS OTP request endpoint. On success, reveals the OTP field
 * and displays a confirmation notification.
 *
 * Backend field validation errors are assigned to the corresponding
 * VeeValidate fields.
 */
const requestOtp = handleSubmit(async (values) => {
  if (submitting.value || otpRequested.value) {
    return
  }

  try {
    submitting.value = true

    const payload: RequestSmsOtpPayload = {
      sms_phone_number: values.sms_phone_number.trim().replace(/\s+/g, ''),
    }

    const response = await requestSmsOtp(payload)

    otpRequested.value = true

    $notifySuccess(response.message || 'Verification code sent successfully.')
  } catch (error: unknown) {
    handleApiError(error, 'Unable to send the SMS verification code.')
  } finally {
    submitting.value = false
  }
})

/**
 * Verifies the OTP and saves the new SMS phone number.
 *
 * Validates the verification code, submits it to the backend, and notifies
 * the parent when the phone number has been updated successfully.
 * The parent is then asked to close the modal.
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

    const response = await verifySmsOtp(payload)

    $notifySuccess(response.message || 'SMS phone number updated successfully.')

    emit('success')
    emit('close')
  } catch (error: unknown) {
    handleApiError(error, 'Unable to verify the SMS verification code.')
  } finally {
    submitting.value = false
  }
})

/**
 * Clears the currently configured SMS phone number after confirmation.
 *
 * Displays a confirmation dialog before calling the backend. On success,
 * clears the local phone number, resets the form, hides the OTP field,
 * and asks the parent to refresh notification preferences.
 *
 * If the operation fails, the error is reported through the shared
 * API error handler.
 *
 * @returns A promise that resolves when the reset operation finishes.
 */
async function resetSmsPhoneNumber(): Promise<void> {
  try {
    const confirmation = await $deleteModal('Reset SMS Phone Number', '', {
      text: 'Are you sure you want to clear your SMS phone number?',
    })

    if (!confirmation) {
      return
    }

    submitting.value = true

    const response = await clearSmsPhoneNumber()

    smsPhoneNumber.value = ''
    otpRequested.value = false

    resetForm({
      values: {
        sms_phone_number: '',
        otp: '',
      },
    })

    $notifySuccess(response.message || 'SMS phone number cleared successfully.')

    emit('success')
  } catch (error: unknown) {
    handleApiError(error, 'Unable to clear the SMS phone number.')
  } finally {
    submitting.value = false
  }
}

/**
 * Handles API errors by assigning backend validation messages to form fields
 * and displaying an appropriate error notification.
 *
 * Recognizes validation errors for `sms_phone_number` and `otp`, as well
 * as a general backend `detail` message. Field-specific validation errors
 * are displayed on their respective fields without an additional notification.
 *
 * @param error - The error thrown by the API operation.
 * @param fallback - The default message displayed when no specific error
 *   message is available.
 */
function handleApiError(error: unknown, fallback: string): void {
  if (axios.isAxiosError<Record<string, unknown>>(error)) {
    const data = error.response?.data

    if (data) {
      let hasFieldErrors = false

      for (const field of ['sms_phone_number', 'otp'] as const) {
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
