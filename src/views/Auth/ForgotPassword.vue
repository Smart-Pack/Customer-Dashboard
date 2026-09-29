<template>
  <AuthCard
    heading="Forgot Password?"
    description="Enter your email to reset your password."
    :btn-text="btnText"
    :auth-fn="forgotPassword"
    :form-fields="formFields"
    :current-routes="currentRoutes"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { forgotPassword } from '@/api/modules/auth'
import AuthCard from '@/components/Base/AuthCard.vue'

export default defineComponent({
  name: 'PasswordForgotView',
  data() {
    return {
      currentRoutes: {
        prev: { label: 'Back to Login', name: 'login' },
        next: { name: 'login' },
      },
      btnText: {
        normal: 'RESET PASSWORD',
        loading: 'REQUESTING...',
      },
      formFields: [
        {
          key: 'email',
          specificType: 'email',
          label: 'Email Address',
          extraAttrs: { autofocus: true },
        },
      ],
    }
  },
  components: {
    AuthCard,
  },
  methods: {
    forgotPassword,
  },
})
</script>
