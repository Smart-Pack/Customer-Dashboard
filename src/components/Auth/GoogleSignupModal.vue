<template>
  <section class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <form
      class="main-card max-w-[90vw] w-full lg:max-w-2xl max-h-[90vh] flex flex-col p-4 gap-4"
      @submit.prevent="submit"
    >
      <!-- Title -->
      <h2 class="text-lg main-heading text-center flex-shrink-0">Complete Your Sign Up</h2>

      <!-- Body -->
      <div class="card-base py-4 px-6 text-sm secondary-text space-y-5 overflow-y-auto flex-1">
        <p class="text-center opacity-70">
          Complete your details to finish signing up with Google.
        </p>

        <div v-for="field in formFields" :key="field.key" class="space-y-2">
          <label class="secondary-text font-semibold text-left block pl-2 text-sm">
            {{ field.label }}
          </label>

          <InputField
            :model-value="values[field.key]"
            :name="field.key"
            :type="field.type"
            :specific-type="field.specificType"
            :error-label="field.errorLabel"
            :rules="field.rules"
            :disabled="field.key === 'email'"
            v-bind="field.extraAttrs || {}"
          />
        </div>
      </div>

      <!-- Buttons -->
      <div class="grid grid-cols-2 items-center gap-4 secondary-text flex-shrink-0">
        <button
          type="button"
          class="form-submit-secondary p-2 text-sm lg:!max-w-28"
          :disabled="submitting"
          @click="close"
        >
          Cancel
        </button>

        <button
          type="submit"
          class="form-submit py-2 px-6 text-sm lg:!max-w-52 lg:justify-self-end overflow-x-hidden"
          :disabled="submitting"
        >
          <span>{{ submitButtonText }}</span>
          <div v-if="submitting" class="ml-2 submit-spinner"></div>
        </button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
/**
 * @module components/Auth/GoogleSignupModal
 * @description Modal for completing customer registration after
 * successful Google Sign-In.
 */

import { computed, ref } from 'vue'
import { useForm } from 'vee-validate'
import axios from 'axios'
import InputField from '@/components/Base/InputField.vue'
import { registerCustomer, type RegisterCustomerPayload } from '@/api/modules/users'
import { getCustomerRegistrationFields } from '@/data/forms/customerRegistrationFields'
import { useGlobals } from '@/composables/useGlobals'
import type { GoogleUser } from './GoogleSignupButton.vue'

defineOptions({
  name: 'GoogleSignupModal',
})

export type CustomerRegistrationFieldKey = Exclude<
  keyof RegisterCustomerPayload,
  'profile_pic' | 'credential'
>

type RegisterCustomerField = Exclude<keyof RegisterCustomerPayload, 'profile_pic' | 'credential'>

type GoogleSignupFormValues = Omit<
  RegisterCustomerPayload,
  'credential' | 'profile_pic' | 'gender'
> & {
  gender: '' | RegisterCustomerPayload['gender']
}

const props = defineProps<{
  credential: string
  googleUser: GoogleUser
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const { $notifySuccess, $notifyError } = useGlobals()

const formFields = getCustomerRegistrationFields()

const { handleSubmit, values, setFieldError } = useForm<GoogleSignupFormValues>({
  initialValues: {
    first_name: props.googleUser.given_name,
    last_name: props.googleUser.family_name,
    email: props.googleUser.email,
    phone: '',
    gender: '',
    date_of_birth: '',
  },
})

const submitting = ref(false)

/**
 * Submits the customer registration using the Google credential.
 */
const submit = handleSubmit(async (formValues) => {
  if (!formValues.gender) {
    setFieldError('gender', 'Please select a gender.')
    return
  }
  try {
    submitting.value = true

    const payload: RegisterCustomerPayload = {
      ...formValues,
      first_name: formValues.first_name.trim(),
      last_name: formValues.last_name.trim(),
      phone: formValues.phone.trim(),
      gender: formValues.gender,
      credential: props.credential,
    }

    const result = await registerCustomer(payload)

    $notifySuccess(result)
    emit('success')
  } catch (e: unknown) {
    if (axios.isAxiosError<Record<string, string[]>>(e)) {
      const data = e.response?.data

      if (data?.email?.length) {
        $notifyError(data.email[0]!)
        return
      }

      if (data?.credential?.length) {
        $notifyError('Please sign in with Google again.')
        emit('close')
        return
      }

      if (data) {
        Object.entries(data).forEach(([field, messages]) => {
          if (messages.length) {
            setFieldError(field as RegisterCustomerField, messages[0]!)
          }
        })

        return
      }
    }

    const message = e instanceof Error ? e.message : 'Registration failed.'

    $notifyError(message)
  } finally {
    submitting.value = false
  }
})

/**
 * Closes the Google signup modal.
 */
const close = () => {
  emit('close')
}

const submitButtonText = computed(() => (submitting.value ? 'Registering...' : 'Complete Sign Up'))
</script>
