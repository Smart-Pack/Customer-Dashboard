<template>
  <div class="main-card w-[90%] lg:w-[80%] mx-auto p-3 text-center">
    <h1 class="main-heading">
      {{ heading }}
    </h1>
    <h2 class="sub-heading mt-2 text-base lg:text-lg">
      {{ subtitle }}
    </h2>
    <p v-if="description" class="card-description mt-1 text-xs lg:text-sm opacity-70">
      {{ description }}
    </p>
    <!-- form -->
    <form class="mt-10 flex flex-col gap-5 lg:p-4" @submit.prevent="auth">
      <div v-for="field in formFields" :key="field.key" class="space-y-2">
        <label class="secondary-text font-semibold text-left block pl-2 text-sm">{{
          field.label
        }}</label>
        <InputField
          :key="field.key"
          v-model.trim="user[field.key]"
          :name="field.key"
          :type="field.type"
          :specific-type="field.specificType"
          :errorLabel="field.errorLabel"
          :placeholder="field.placeholder"
          :rules="field.rules"
          :icon="field.icon"
          v-bind="field.extraAttrs || {}"
        />
      </div>
      <div class="flex">
        <!-- Forgot Password -->
        <div v-if="!$slots.default" class="w-full text-right">
          <router-link :to="{ name: currentRoutes.prev.name }" class="auth-link">
            {{ currentRoutes.prev.label }}
          </router-link>
        </div>
        <slot v-else />
      </div>
      <!-- Submit Button -->
      <BaseButton type="submit" :disabled="submitting" :aria-busy="submitting">
        <div class="flex justify-center items-center">
          <span class="text-sm">{{ submitBaseButtonText }}</span>
          <div v-if="submitting" class="ml-4 submit-spinner"></div>
        </div>
      </BaseButton>
    </form>
  </div>
</template>

<script lang="ts">
import BaseButton from '@/components/Base/Button.vue'
import InputField from '@/components/Base/InputField.vue'
import { useForm } from 'vee-validate'
import { reactive, ref } from 'vue'
import type { PropType } from 'vue'
import { useGlobals } from '@/composables/useGlobals'

/**
 * @typedef {Object} FormField
 * @description Configuration for a single field rendered by `AuthCard` via `InputField`.
 * @property {string} key - The field's unique key; used as the `name`, the `user` model key, and the `v-for` key.
 * @property {string} label - The label text displayed above the field.
 * @property {string} [type] - The native input `type` (e.g. 'text', 'password').
 * @property {string} [specificType] - A preset understood by `InputField` (e.g. 'email', 'phone', 'gender').
 * @property {string} [errorLabel] - The label used in validation error messages.
 * @property {string} [placeholder] - Placeholder text for the field.
 * @property {string} [rules] - VeeValidate rule string (e.g. 'required|email').
 * @property {object|Function} [icon] - A Vue component used as the field's leading icon.
 * @property {Record<string, unknown>} [extraAttrs] - Additional props/attrs spread onto `InputField`.
 */
interface FormField {
  key: string
  label: string
  type?: string
  specificType?: string
  errorLabel?: string
  placeholder?: string
  rules?: string
  icon?: object | (() => unknown)
  extraAttrs?: Record<string, unknown>
}

/**
 * @typedef {Object} AuthError
 * @description The expected shape of errors thrown by an `authFn` implementation.
 * @property {string} message - A user-facing error message, shown via `$notifyError`.
 * @property {boolean} [reload] - When true, indicates the auth token has expired and the
 * user should be redirected to the forgot-password flow.
 */
interface AuthError {
  message: string
  reload?: boolean
}

/**
 * Narrows an `unknown` caught error into the `AuthError` shape.
 * @param {unknown} err - The value caught from a rejected `authFn` promise.
 * @returns {err is AuthError} True if `err` looks like an `AuthError` (has a `message` property).
 */
function isAuthError(err: unknown): err is AuthError {
  return typeof err === 'object' && err !== null && 'message' in err
}

/**
 * @module components/Base/AuthCard
 * @description A highly reusable card component that provides a consistent layout,
 * styling, and logic for all authentication-related forms (e.g., Login, OTP, Forgot Password).
 * It is configured via props to adapt to different authentication scenarios.
 */
export default {
  name: 'AuthCard',
  components: {
    BaseButton,
    InputField,
  },
  props: {
    /**
     * The main heading text displayed at the top of the card.
     * @type {String}
     * @required
     */
    heading: {
      type: String,
      required: true,
    },
    /**
     * The subtitle text displayed below the main heading.
     * @type {String}
     * @default 'SMARTPACK ADMINISTRATOR PLATFORM'
     */
    subtitle: {
      type: String,
      default: 'SMARTPACK ADMIN PLATFORM',
    },
    /**
     * An optional, smaller description text displayed below the subtitle.
     * @type {String}
     * @default ''
     */
    description: {
      type: String,
      default: '',
    },
    /**
     * The text displayed on the submit button. Can be a simple string or an
     * object with `normal` and `loading` states.
     * @type {[String, Object]}
     */
    btnText: {
      type: [String, Object],
      required: false,
      default: '',
    },
    /**
     * An array of objects defining the form fields to be rendered.
     * Each object configures an `InputField` component.
     * @type {Array<FormField>}
     * @required
     */
    formFields: {
      type: Array as PropType<FormField[]>,
      required: true,
    },
    /**
     * The asynchronous function to be executed on form submission.
     * This function should handle the API call and return a promise.
     * @type {Function}
     * @required
     */
    authFn: {
      type: Function,
      required: true,
    },
    /**
     * An object defining the navigation links for the form.
     * @type {{prev: {label: string, name: string}, next: {name: string}}}
     * @required
     */
    currentRoutes: {
      type: Object,
      required: true,
    },
    /**
     * An object containing extra parameters to be merged with the form data
     * before being passed to the `authFn`.
     * @type {Object}
     */
    extraParams: {
      type: Object,
      required: false,
      default: () => ({}),
    },
    /**
     * An optional function for performing complex, multi-field validation
     * that cannot be handled by VeeValidate rules alone.
     * Receives the current form values and the `setFieldError` helper from
     * `useForm`, allowing the guard to add manual errors before submission.
     * @type {(values: object, setFieldError: import('vee-validate').SetFieldError) => boolean|Promise<boolean>}
     */
    customValidator: {
      type: Function,
      required: false,
    },
    /**
     * Optional callback that decides whether the default navigation should run after submit.
     * @type {() => Promise<boolean|void>|boolean|void}
     */
    resolveNextRoute: {
      type: Function,
      required: false,
    },
  },
  computed: {
    /**
     * Computes the text for the submit button based on the `submitting` state.
     * @returns {string}
     */
    submitBaseButtonText() {
      if (typeof this.btnText === 'string' && this.btnText) {
        return this.btnText
      }
      if (this.btnText && typeof this.btnText === 'object') {
        return this.submitting ? this.btnText.loading : this.btnText.normal
      }
      return this.submitting ? 'Loading...' : 'Authenticate'
    },
  },
  /**
   * Initializes the reactive form state using VeeValidate's `useForm`.
   * Builds the `user` model from the declared `formFields`, wires the
   * optional `customValidator`, and exposes `user`, `auth`, and `submitting`
   * for the template to bind.
   */
  setup(props) {
    const { $notifySuccess, $notifyError, $router } = useGlobals()

    // Initialize user object with all keys from formFields
    const user = reactive<Record<string, string>>({})
    const submitting = ref(false)

    props.formFields.forEach((field) => {
      user[field.key] = '' // sets default empty string
    })

    // Initialize the form with VeeValidate
    const { handleSubmit, setFieldError } = useForm({ initialValues: user })

    // Submit handler wrapped with VeeValidate
    const auth = handleSubmit(async (values) => {
      if (props.customValidator) {
        const isValid = await props.customValidator(values, setFieldError)
        if (isValid === false) {
          return
        }
      }

      const payload = {
        ...values,
        ...props.extraParams,
      }

      try {
        submitting.value = true

        const message = await props.authFn(payload)
        $notifySuccess(message)

        if (props.resolveNextRoute) {
          const useCurrentRoute = await props.resolveNextRoute()

          if (useCurrentRoute === false) {
            return
          }
        }

        $router.push({ name: props.currentRoutes.next.name })
      } catch (e) {
        const err = isAuthError(e) ? e : { message: 'Something went wrong' }
        $notifyError(err.message)

        // Token expire for reset password page
        if (isAuthError(e) && e.reload) {
          $router.push({ name: 'forgot-password' })
        }
      } finally {
        submitting.value = false
      }
    })

    return { user, auth, submitting }
  },
}
</script>
