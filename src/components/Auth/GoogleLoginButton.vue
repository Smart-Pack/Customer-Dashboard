<template>
  <div class="flex items-center justify-center w-full">
    <GoogleSignInButton
      class="mt-2"
      :disabled="submitting"
      :aria-busy="submitting"
      @success="handleLoginSuccess"
      @error="handleLoginError"
    />

    <div v-if="submitting" class="ml-4 submit-spinner"></div>
  </div>
</template>

<script lang="ts">
import { GoogleSignInButton, type CredentialResponse } from 'vue3-google-signin'
import { ref } from 'vue'
import { useGlobals } from '@/composables/useGlobals'
import { useAuthStore } from '@/stores/modules/auth'

/**
 * @module components/Auth/GoogleLoginButton
 * @description A reusable Google Sign-In button that authenticates the user
 * through the backend Google login endpoint.
 */
export default {
  name: 'GoogleLoginButton',

  components: {
    GoogleSignInButton,
  },

  setup() {
    const { $notifySuccess, $notifyError, $router } = useGlobals()
    const authStore = useAuthStore()
    const submitting = ref(false)

    /**
     * Authenticates the user with the credential returned by Google Sign-In.
     *
     * @param {CredentialResponse} response - Google Sign-In credential response.
     */
    const handleLoginSuccess = async (response: CredentialResponse) => {
      try {
        if (!response.credential) {
          throw new Error('Google Sign-In did not return a credential.')
        }

        submitting.value = true

        await authStore.googleLogIn(response.credential)

        $notifySuccess('Google Sign-In successful.')

        $router.push({ name: 'dashboard' })
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error('Google Sign-In failed.')

        $notifyError(err.message)
      } finally {
        submitting.value = false
      }
    }

    /**
     * Handles a Google Sign-In error.
     */
    const handleLoginError = () => {
      submitting.value = false
      $notifyError('Google Sign-In failed. Please try again.')
    }

    return {
      handleLoginSuccess,
      handleLoginError,
      submitting,
    }
  },
}
</script>
