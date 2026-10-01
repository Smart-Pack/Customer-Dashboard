<template>
  <div class="flex items-center justify-center w-full">
    <GoogleSignInButton
      class="mt-2"
      text="signup_with"
      :disabled="submitting"
      :aria-busy="submitting"
      @success="handleSignupSuccess"
      @error="handleSignupError"
    />

    <div v-if="submitting" class="ml-4 submit-spinner"></div>

    <GoogleSignupModal
      v-if="showModal && googleUser"
      :credential="googleCredential"
      :google-user="googleUser"
      @close="showModal = false"
      @success="handleRegistrationSuccess"
    />
  </div>
</template>

<script lang="ts">
/**
 * @module components/Auth/GoogleSignupButton
 * @description Provides a Google Sign-Up button that authenticates the user
 * with Google Identity Services and opens the customer registration modal
 * with the decoded Google profile information.
 */

import { ref } from 'vue'
import { GoogleSignInButton, decodeCredential, type CredentialResponse } from 'vue3-google-signin'
import { useGlobals } from '@/composables/useGlobals'
import GoogleSignupModal from './GoogleSignupModal.vue'

/**
 * Represents the user information returned by a decoded Google
 * Sign-In credential.
 */
export interface GoogleUser {
  /** Google account email address. */
  email: string

  /** Whether Google has verified the account email address. */
  email_verified: boolean

  /** User's first name from their Google profile. */
  given_name: string

  /** User's last name from their Google profile. */
  family_name: string

  /** User's full name from their Google profile. */
  name: string

  /** Google profile picture URL, when available. */
  picture?: string

  /** Unique Google account identifier. */
  id: string
}

export default {
  name: 'GoogleSignupButton',

  components: {
    GoogleSignInButton,
    GoogleSignupModal,
  },

  /**
   * Initializes the Google Sign-Up button and registration modal state.
   *
   * @returns Reactive state and event handlers used by the template.
   */
  setup() {
    const { $notifyError, $router } = useGlobals()

    /**
     * Indicates whether Google Sign-Up is currently being processed.
     */
    const submitting = ref(false)

    /**
     * Controls visibility of the Google customer registration modal.
     */
    const showModal = ref(false)

    /**
     * Stores the Google ID token returned by Google Identity Services.
     */
    const googleCredential = ref('')

    /**
     * Stores the decoded Google account information.
     */
    const googleUser = ref<GoogleUser | null>(null)

    /**
     * Handles a successful Google authentication response.
     *
     * Decodes the Google credential, validates that an email address
     * was returned, and opens the customer registration modal with
     * the Google account information.
     *
     * @param {CredentialResponse} response - Google credential response.
     */
    const handleSignupSuccess = (response: CredentialResponse) => {
      try {
        if (!response.credential) {
          throw new Error('Google Sign-Up did not return a credential.')
        }

        const decodedCredential = decodeCredential(response.credential)

        if (!decodedCredential.email) {
          throw new Error('Google Sign-Up did not return an email address.')
        }

        googleCredential.value = response.credential
        googleUser.value = decodedCredential as GoogleUser
        showModal.value = true
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error('Google Sign-Up failed.')

        $notifyError(err.message)
      }
    }

    /**
     * Handles a Google Sign-Up error.
     *
     * Resets the submitting state and displays an error notification
     * when Google authentication fails.
     */
    const handleSignupError = () => {
      submitting.value = false
      $notifyError('Google Sign-Up failed. Please try again.')
    }

    /**
     * Handles successful customer registration.
     *
     * Closes the registration modal, clears the Google authentication
     * state, and redirects the user to the login page.
     */
    const handleRegistrationSuccess = () => {
      showModal.value = false
      googleCredential.value = ''
      googleUser.value = null

      $router.push({ name: 'login' })
    }

    return {
      submitting,
      showModal,
      googleCredential,
      googleUser,
      handleSignupSuccess,
      handleSignupError,
      handleRegistrationSuccess,
    }
  },
}
</script>
