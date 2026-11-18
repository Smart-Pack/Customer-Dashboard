<template>
  <div class="flex items-center justify-center w-full">
    <button
      type="button"
      class="google-sign-in-button mt-2"
      :disabled="submitting"
      :aria-busy="submitting"
      @click="handleSignup"
    >
      <GoogleIcon />
      <span>Sign up with Google</span>
    </button>

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
import { SocialLogin } from '@capgo/capacitor-social-login'
import { decodeCredential } from 'vue3-google-signin'
import { ref } from 'vue'
import { useGlobals } from '@/composables/useGlobals'
import GoogleIcon from '@/components/Icons/GoogleIcon.vue'
import GoogleSignupModal from './GoogleSignupModal.vue'

/**
 * @module components/Auth/GoogleSocialSignupButton
 * @description A native Android Google Sign-Up button that authenticates
 * users through the Capacitor SocialLogin plugin and opens the customer
 * registration modal with their decoded Google profile information.
 */

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
  name: 'GoogleSocialSignupButton',

  components: {
    GoogleIcon,
    GoogleSignupModal,
  },

  /**
   * Initializes native Google Sign-Up and registration modal state.
   *
   * @returns Reactive state and event handlers used by the template.
   */
  setup() {
    const { $notifyError, $router } = useGlobals()

    /** Indicates whether Google Sign-Up is currently being processed. */
    const submitting = ref(false)

    /** Controls visibility of the customer registration modal. */
    const showModal = ref(false)

    /** Stores the Google ID token returned by native authentication. */
    const googleCredential = ref('')

    /** Stores the decoded Google account information. */
    const googleUser = ref<GoogleUser | null>(null)

    /**
     * Handles native Google authentication and opens the registration modal.
     *
     * Retrieves the online Google ID token, decodes the credential,
     * validates the account email address, and populates the registration
     * modal with the Google profile information.
     */
    const handleSignup = async () => {
      try {
        submitting.value = true

        const response = await SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['email', 'profile'],
          },
        })

        if (response.result.responseType !== 'online') {
          throw new Error('Google Sign-Up did not return an online authentication response.')
        }

        const credential = response.result.idToken

        if (!credential) {
          throw new Error('Google Sign-Up did not return an ID token.')
        }

        const decodedCredential = decodeCredential(credential)

        if (!decodedCredential.email) {
          throw new Error('Google Sign-Up did not return an email address.')
        }

        googleCredential.value = credential
        googleUser.value = decodedCredential as GoogleUser
        showModal.value = true
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error('Google Sign-Up failed.')

        $notifyError(err.message)
      } finally {
        submitting.value = false
      }
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
      handleSignup,
      handleRegistrationSuccess,
    }
  },
}
</script>

<style scoped>
.google-sign-in-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid #747775;
  border-radius: 4px;
  background: #fff;
  color: #1f1f1f;
  font-family: Roboto, Arial, sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.google-sign-in-button:hover:not(:disabled) {
  background: #f8faff;
}

.google-sign-in-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
