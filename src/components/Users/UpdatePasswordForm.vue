```vue
<template>
  <div class="space-y-4">
    <p class="secondary-text text-sm">
      Use a strong password and avoid reusing it across services.
    </p>

    <form class="space-y-5 text-sm lg:text-base" @submit.prevent="updatePassword">
      <div>
        <label class="secondary-text font-semibold" for="current_password">
          Current Password
        </label>
        <InputField
          v-model.trim="user.current_password"
          name="current_password"
          specific-type="password"
          placeholder="Current Password"
          errorLabel="Current Password"
          autofocus="autofocus"
        />
      </div>

      <div>
        <label class="secondary-text font-semibold" for="new_password"> New Password </label>
        <InputField
          v-model.trim="user.new_password"
          name="new_password"
          specific-type="password"
          placeholder="New Password"
          errorLabel="New Password"
        />
      </div>

      <div>
        <label class="secondary-text font-semibold" for="confirm_password">
          Confirm Password
        </label>
        <InputField
          v-model.trim="user.confirm_password"
          name="confirm_password"
          specific-type="password"
          placeholder="Confirm Password"
          errorLabel="Confirmation Password"
        />
      </div>

      <div class="flex justify-end">
        <button
          type="submit"
          class="form-submit px-6 py-2 font-semibold center-flex"
          :disabled="submitting"
          :aria-busy="submitting"
        >
          <span>{{ submitting ? 'UPDATING...' : 'Update Password' }}</span>
          <div v-if="submitting" class="ml-4 submit-spinner"></div>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
/**
 * @module @/components/Users/UpdatePasswordForm
 * @description
 * Provides a form for authenticated users to change their password.
 *
 * The form validates the new password against the confirmation password,
 * submits the password change through the users API, displays API validation
 * errors, and resets the form after a successful update.
 */

import { isAxiosError } from 'axios'
import { useForm } from 'vee-validate'
import { reactive, ref } from 'vue'

import { setPassword } from '@/api/modules/users'
import InputField from '@/components/Base/InputField.vue'
import { useGlobals } from '@/composables/useGlobals'
import { useAuthStore } from '@/stores'

defineOptions({ name: 'UpdatePasswordForm' })

/**
 * Fields that can receive validation errors from the password update API.
 */
type PasswordField = 'current_password' | 'new_password' | 'confirm_password'

const passwordFields: PasswordField[] = ['current_password', 'new_password', 'confirm_password']

const authStore = useAuthStore()
const { $notifySuccess, $notifyError } = useGlobals()

/**
 * Indicates whether a password update request is currently in progress.
 */
const submitting = ref(false)

/**
 * Reactive password form state.
 */
const user = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

const { handleSubmit, resetForm, setFieldError } = useForm({
  initialValues: user,
})

/**
 * Validates and submits the password update form.
 *
 * The confirmation password is validated locally before the new password
 * is submitted to the API. On success, the authenticated user's password
 * change state is updated, a success notification is displayed, and the
 * form is reset.
 */
const updatePassword = handleSubmit(async (values) => {
  if (values.new_password !== values.confirm_password) {
    setFieldError('confirm_password', 'Confirmation Password does not match')
    return
  }

  submitting.value = true

  try {
    await setPassword({
      current_password: values.current_password,
      new_password: values.new_password,
    })

    if (authStore.loggedInUser) {
      authStore.setLoggedInUser({
        ...authStore.loggedInUser,
        changed_password_after_initial_login: true,
      })
    }

    $notifySuccess('Password updated successfully.')

    resetForm({
      values: {
        current_password: '',
        new_password: '',
        confirm_password: '',
      },
    })
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.data) {
      const data = error.response.data

      if (typeof data === 'object' && data !== null) {
        Object.entries(data).forEach(([field, messages]) => {
          if (
            passwordFields.includes(field as PasswordField) &&
            Array.isArray(messages) &&
            messages.length > 0
          ) {
            setFieldError(field as PasswordField, String(messages[0]))
          }
        })
      }
    }

    const message = error instanceof Error ? error.message : 'Unable to update your password.'

    $notifyError(message)
  } finally {
    submitting.value = false
  }
})
</script>
