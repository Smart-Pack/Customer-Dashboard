<template>
  <AuthCard
    heading="Enter OTP"
    description="Please enter the OTP sent to your email."
    :btn-text="btnText"
    :auth-fn="verifyTwoFaToken"
    :form-fields="formFields"
    :current-routes="currentRoutes"
    :resolve-next-route="resolveNextRoute"
  >
    <div class="w-full grid gap-2">
      <button
        type="button"
        class="justify-self-end flex"
        :class="isCooldownActive ? 'opacity-70 disabled:cursor-not-allowed' : ''"
        :disabled="isCooldownActive || submitting"
        @click="resendOtp"
      >
        <span class="primary-text">
          {{ submitting ? 'Sending OTP...' : 'Resend OTP' }}
        </span>

        <div v-if="submitting" class="ml-4 link-spinner"></div>
      </button>

      <p v-if="isCooldownActive" class="text-xs opacity-70 secondary-text text-right">
        Resend in {{ cooldownRemaining }}s
      </p>
    </div>
  </AuthCard>
</template>

<script setup lang="ts">
import axios from 'axios'
import { computed, markRaw, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthCard from '@/components/Base/AuthCard.vue'
import ShieldCheckIcon from '@/components/Icons/ShieldCheckIcon.vue'
import { useAuthStore } from '@/stores/modules/auth'
import { twoFactor } from '@/api'
import { useGlobals } from '@/composables/useGlobals'

const router = useRouter()
const authStore = useAuthStore()
const { $notifySuccess, $notifyError } = useGlobals()

const { verifyTwoFaToken } = authStore

const currentRoutes = {
  prev: { label: 'Back to log in', name: 'login' },
  next: { name: 'dashboard' },
}

const lastResendAt = ref(Date.now())
const cooldownMs = 60 * 1000
const now = ref(Date.now())
const submitting = ref(false)
let cooldownTimer: number | null = null

const btnText = {
  loading: 'LOADING...',
  normal: 'VERIFY',
}

const formFields = [
  {
    key: 'otp',
    type: 'text',
    rules: 'required|digits:6',
    errorLabel: 'OTP code',
    label: 'OTP',
    placeholder: 'Enter OTP',
    icon: markRaw(ShieldCheckIcon),
    extraAttrs: {
      autofocus: true,
      inputmode: 'numeric',
      maxlength: 6,
    },
  },
]

const hasChangedPassword = computed(() => authStore.hasChangedPassword)

const cooldownRemaining = computed(() =>
  Math.max(0, Math.ceil((cooldownMs - (now.value - lastResendAt.value)) / 1000)),
)

const isCooldownActive = computed(() => cooldownRemaining.value > 0)

/**
 * Recomputes the cooldown every second by bumping the `now` timestamp.
 */
function startCooldownTicker(): void {
  if (cooldownTimer !== null) {
    return
  }

  cooldownTimer = window.setInterval(() => {
    now.value = Date.now()

    if (!isCooldownActive.value) {
      stopCooldownTicker()
    }
  }, 1000)
}

/**
 * Clears the interval responsible for ticking `now`.
 */
function stopCooldownTicker(): void {
  if (cooldownTimer !== null) {
    window.clearInterval(cooldownTimer)
    cooldownTimer = null
  }
}

/**
 * Triggers a fresh OTP request and restarts the cooldown timer.
 */
async function resendOtp(): Promise<void> {
  try {
    submitting.value = true

    await twoFactor.request()
    $notifySuccess('OTP sent succesfully')
  } catch (error) {
    $notifyError(
      axios.isAxiosError(error)
        ? (error.response?.data?.detail ?? 'An error occurred')
        : error instanceof Error
          ? error.message
          : 'An error occurred',
    )
  } finally {
    lastResendAt.value = Date.now()
    startCooldownTicker()
    submitting.value = false
  }
}

/**
 * Prevents the default post-OTP redirect until the user has agreed to the terms.
 *
 * @returns True when it is safe to continue routing, false when navigation
 * is handled locally.
 */
async function resolveNextRoute(): Promise<boolean> {
  if (hasChangedPassword.value) {
    return true
  }

  await router.push({ name: 'change-password' })
  return false
}

onMounted(() => {
  startCooldownTicker()
})

onBeforeUnmount(() => {
  stopCooldownTicker()
})
</script>
