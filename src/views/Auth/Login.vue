<template>
  <AuthCard
    heading="Sign In"
    :btn-text="authStore.loginBtn"
    :auth-fn="authStore.logIn"
    :form-fields="formFields"
    :current-routes="currentRoutes"
    :bottom-component="AuthCardBottomLink"
    :bottom-component-props="{ mode: 'signIn' }"
  />
</template>

<script setup lang="ts">
defineOptions({
  name: 'LoginView',
})

import AuthCardBottomLink from '@/components/Auth/BottomLink.vue'
import AuthCard from '@/components/Base/AuthCard.vue'
import { useAuthStore } from '@/stores/modules/auth'

const authStore = useAuthStore()

const currentRoutes = {
  prev: {
    label: 'Forgot Password?',
    name: 'forgot-password',
  },
  next: {
    name: '2fa',
  },
}

const formFields = [
  {
    key: 'email',
    specificType: 'email',
    label: 'Email Address',
    extraAttrs: {
      autofocus: true,
    },
  },
  {
    key: 'password',
    label: 'Password',
    specificType: 'password',
  },
]
</script>
