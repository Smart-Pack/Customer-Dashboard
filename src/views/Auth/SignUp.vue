<template>
  <AuthCard
    heading="Sign Up"
    :btn-text="btnText"
    :auth-fn="registerCustomer"
    :form-fields="formFields"
    :current-routes="currentRoutes"
    :bottom-component="AuthCardBottomLink"
    :bottom-component-props="{ mode: 'create' }"
    :show-errors="true"
  >
    <p class="primary-text text-sm opacity-70"></p>
  </AuthCard>
</template>

<script setup lang="ts">
/**
 * @module views/Auth/SignUp
 * @description Provides the customer registration authentication view.
 * Configures the reusable AuthCard with customer registration fields,
 * registration API handling, authentication navigation, and backend
 * field error display.
 */

import { onBeforeUnmount, onMounted } from 'vue'
import { registerCustomer } from '@/api/modules/users'
import AuthCard from '@/components/Base/AuthCard.vue'
import AuthCardBottomLink from '@/components/Auth/BottomLink.vue'
import { getCustomerRegistrationFields } from '@/data/forms/customerRegistrationFields'

defineOptions({
  name: 'SignUpView',
})

const emit = defineEmits<{
  'scroll-main': [value: boolean]
}>()

/**
 * Submit button labels displayed during the registration process.
 */
const btnText = {
  normal: 'Register',
  loading: 'Registering...',
}

/**
 * Defines the authentication route used after successful registration.
 */
const currentRoutes = {
  next: {
    name: 'login',
  },
}

/**
 * Form field configuration used by the customer registration form.
 */
const formFields = getCustomerRegistrationFields()

onMounted(() => {
  emit('scroll-main', true)
})

onBeforeUnmount(() => {
  emit('scroll-main', false)
})
</script>
