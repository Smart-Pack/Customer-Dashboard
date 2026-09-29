<template>
  <AuthCard
    heading="Finalize Account"
    description="Set a new password and accept the terms and conditions so you can access the dashboard."
    :btn-text="btnText"
    :auth-fn="initialPassword"
    :form-fields="formFields"
    :current-routes="currentRoutes"
    :custom-validator="ensurePasswordsMatch"
    :resolve-next-route="updateUser"
  />

  <TermsAgreement v-if="showTerms" @confirmed="handleTermsConfirmed" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import AuthCard from '@/components/Base/AuthCard.vue'
import TermsAgreement from '@/components/Auth/TermsAgreement.vue'
import { initialPassword } from '@/api/modules/users'
import { useAuthStore } from '@/stores/modules/auth'

const emit = defineEmits<{
  'change-size': [value: boolean]
}>()

const authStore = useAuthStore()

const currentRoutes = {
  prev: { label: 'Back to login', name: 'login' },
  next: { name: 'dashboard' },
}

const btnText = {
  normal: 'CHANGE PASSWORD',
  loading: 'REQUESTING...',
}

const formFields = [
  {
    key: 'current_password',
    specificType: 'password',
    errorLabel: 'Current Password',
    label: 'Current Password',
    placeholder: 'Current Password',
  },
  {
    key: 'new_password',
    specificType: 'password',
    errorLabel: 'Password',
    label: 'New Password',
  },
  {
    key: 'confirm_password',
    specificType: 'password',
    errorLabel: 'Confirmation Password',
    label: 'Confirm Password',
    placeholder: 'Confirm Password',
  },
  {
    key: 'has_accepted',
    type: 'checkbox',
    label: '',
    extraAttrs: {
      inputClass: '!h-1 invisible',
    },
  },
]

type PasswordFormValues = {
  new_password: string
  confirm_password: string
}

type SetFieldError = (field: string, message: string) => void

const showTerms = ref(false)
const hasAccepted = ref(false)

/**
 * Resolver for the promise returned by `waitForTermsConfirmation`.
 *
 * Stored so `handleTermsConfirmed` can resolve the validator
 * once the user completes the terms confirmation flow.
 */
const termsPromiseResolver = ref<(() => void) | null>(null)

/**
 * Validate the password form values.
 *
 * Ensures that the new password and confirmation password match.
 * If the terms have not been accepted, the terms modal is opened
 * and validation waits until the user completes the confirmation flow.
 *
 * @param values - Password form values.
 * @param setErrorField - Function used to set validation errors.
 * @returns True when validation succeeds.
 */
async function ensurePasswordsMatch(
  { new_password, confirm_password }: PasswordFormValues,
  setErrorField: SetFieldError,
): Promise<boolean> {
  if (new_password !== confirm_password) {
    setErrorField('confirm_password', 'Confirmation password does not match')

    return false
  }

  if (!hasAccepted.value) {
    await waitForTermsConfirmation()
  }

  if (!hasAccepted.value) {
    setErrorField('has_accepted', 'Must Agree to terms and conditions to proceed')

    return false
  }

  setErrorField('has_accepted', '')

  return true
}

/**
 * Opens the terms modal and returns a promise that resolves
 * when the user completes the terms confirmation flow.
 *
 * @returns A promise that resolves after the terms modal is closed.
 */
function waitForTermsConfirmation(): Promise<void> {
  showTerms.value = true

  return new Promise((resolve) => {
    termsPromiseResolver.value = resolve
  })
}

/**
 * Handles the terms agreement result emitted by the modal.
 *
 * Hides the modal, updates the agreement state, and resolves
 * the pending validation promise.
 *
 * @param value - Whether the user accepted the terms.
 */
function handleTermsConfirmed(value: boolean): void {
  showTerms.value = false
  hasAccepted.value = value

  if (termsPromiseResolver.value) {
    termsPromiseResolver.value()
    termsPromiseResolver.value = null
  }
}

/**
 * Refreshes the authenticated user's information after
 * the password and terms have been updated.
 *
 * @returns A promise resolving to true after the user is refreshed.
 */
async function updateUser(): Promise<boolean> {
  await authStore.fetchUser()

  return true
}

onMounted(() => {
  emit('change-size', true)
})

onBeforeUnmount(() => {
  emit('change-size', false)
})
</script>
