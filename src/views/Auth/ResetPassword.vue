<template>
  <AuthCard
    heading="Reset Password"
    :btn-text="btnText"
    :auth-fn="resetPassword"
    :form-fields="formFields"
    :current-routes="currentRoutes"
    :custom-validator="ensurePasswordsMatch"
    :extra-params="extraParams"
  />
</template>

<script lang="ts">
import { resetPassword } from '@/api/modules/auth'
import AuthCard from '@/components/Base/AuthCard.vue'
import type { FormActions } from 'vee-validate'

interface ResetPasswordForm {
  uid: string
  token: string
  new_password: string
  confirm_password: string
}
export default {
  name: 'PasswordResetView',
  data() {
    return {
      currentRoutes: {
        prev: { label: 'Back to login', name: 'login' },
        next: { name: 'login' },
      },
      btnText: {
        normal: 'RESET PASSWORD',
        loading: 'REQUESTING...',
      },
      formFields: [
        {
          key: 'new_password',
          specificType: 'password',
          errorLabel: 'Password',
          label: 'New Password',
          extraAttrs: { ref: 'new_password' },
        },
        {
          key: 'confirm_password',
          specificType: 'password',
          errorLabel: 'Confirmation Password',
          label: 'Confirm Password',
          placeholder: 'Confirm Password',
        },
      ],
    }
  },
  computed: {
    extraParams() {
      return {
        uid: this.$route.query.uid ?? '',
        token: this.$route.query.token ?? '',
      }
    },
  },
  components: {
    AuthCard,
  },
  methods: {
    /**
     * A custom validation function passed to the AuthCard component.
     * It checks if the new password and confirmation password match.
     * @param {object} values - The form's current values.
     * @param {string} values.new_password - The new password.
     * @param {string} values.confirm_password - The confirmation password.
     * @param {Function} setErrorField - The `setFieldError` helper supplied by `useForm`.
     * @returns {boolean} - True if passwords match, false otherwise.
     */
    ensurePasswordsMatch(
      { new_password, confirm_password }: ResetPasswordForm,
      setErrorField: FormActions<ResetPasswordForm>['setFieldError'],
    ) {
      if (new_password !== confirm_password) {
        setErrorField('confirm_password', 'Confirmation password does not match')
        return false
      }
      return true
    },
    resetPassword,
  },
}
</script>
