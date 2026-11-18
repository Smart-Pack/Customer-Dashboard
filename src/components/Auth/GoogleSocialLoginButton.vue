<template>
  <div class="flex items-center justify-center w-full">
    <button
      type="button"
      class="google-sign-in-button mt-2"
      :disabled="submitting"
      :aria-busy="submitting"
      @click="handleLogin"
    >
      <GoogleIcon />
      <span>Sign in with Google</span>
    </button>

    <div v-if="submitting" class="ml-4 submit-spinner"></div>
  </div>
</template>

<script lang="ts">
import { SocialLogin } from '@capgo/capacitor-social-login'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useGlobals } from '@/composables/useGlobals'
import { useAuthStore } from '@/stores/modules/auth'
import GoogleIcon from '@/components/Icons/GoogleIcon.vue'

/**
 * @module components/Auth/GoogleSocialLoginButton
 * @description A native Android Google Sign-In button that authenticates
 * users through the SmartPack backend Google login endpoint.
 */
export default {
  name: 'GoogleSocialLoginButton',

  components: {
    GoogleIcon,
  },

  setup() {
    const { $notifySuccess, $notifyError, $router } = useGlobals()
    const route = useRoute()
    const authStore = useAuthStore()
    const submitting = ref(false)

    /**
     * Authenticates the user through native Google Sign-In.
     */
    const handleLogin = async () => {
      try {
        submitting.value = true

        const response = await SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['email', 'profile'],
          },
        })

        if (response.result.responseType !== 'online') {
          throw new Error('Google Sign-In did not return an online authentication response.')
        }

        const credential = response.result.idToken

        if (!credential) {
          throw new Error('Google Sign-In did not return an ID token.')
        }

        await authStore.googleLogIn(credential)

        $notifySuccess('Google Sign-In successful.')

        // Preserve the intended destination after authentication.
        const redirect = route.query.redirect

        $router.push({
          name: 'dashboard',
          ...(typeof redirect === 'string' && {
            query: { redirect },
          }),
        })
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error('Google Sign-In failed.')

        $notifyError(err.message)
      } finally {
        submitting.value = false
      }
    }

    return {
      handleLogin,
      submitting,
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
