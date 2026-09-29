<template>
  <div class="w-full">
    <div class="relative flex items-center">
      <span v-if="resolvedIcon" class="field-icon absolute left-3 top-1/2 -translate-y-1/2">
        <component :is="resolvedIcon" :class="iconClass" />
      </span>
      <button
        v-if="resolvedIconRight"
        type="button"
        @click="handleRightIcon"
        :aria-pressed="showPassword ?? undefined"
        class="field-icon absolute right-3 top-1/2 -translate-y-1/2"
      >
        <component :is="resolvedIconRight" :class="iconClass" />
      </button>
      <template v-if="specificType === 'phone'">
        <vue-tel-input
          v-model="value"
          @blur="handleBlur"
          :placeholder="resolvedPlaceholder"
          :input-options="{ showDialCode: true, styleClasses: inputClasses }"
          default-country="ke"
          :style-classes="inputClasses"
          :autocomplete="resolvedAutocomplete"
          v-bind="$attrs"
        />
      </template>
      <template v-else-if="resolvedVariant === 'select'">
        <select
          v-model="stringValue"
          :name="name"
          @blur="handleBlur"
          :aria-label="ariaLabel || resolvedPlaceholder"
          :class="inputClasses"
          :autocomplete="resolvedAutocomplete"
          v-bind="$attrs"
        >
          <option
            v-for="option in resolvedOptions"
            :key="String(option.value)"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </template>
      <template v-else-if="resolvedVariant === 'textarea'">
        <textarea
          v-model="stringValue"
          @blur="handleBlur"
          :type="resolvedType"
          :name="name"
          :placeholder="resolvedPlaceholder"
          :aria-label="ariaLabel || resolvedPlaceholder"
          :class="inputClasses"
          :autocomplete="resolvedAutocomplete"
          v-bind="$attrs"
        />
      </template>
      <template v-else-if="resolvedVariant === 'input'">
        <input
          type="file"
          class="form-submit-secondary p-2 text-sm w-full"
          :name="name"
          :aria-label="ariaLabel || resolvedPlaceholder"
          :accept="fileType"
          @blur="handleBlur"
          @change="handleFileChange"
          v-bind="$attrs"
        />
      </template>
      <template v-else>
        <input
          v-model="stringValue"
          @blur="handleBlur"
          :type="resolvedType"
          :name="name"
          :placeholder="resolvedPlaceholder"
          :aria-label="ariaLabel || resolvedPlaceholder"
          :class="inputClasses"
          :autocomplete="resolvedAutocomplete"
          v-bind="$attrs"
        />
      </template>
    </div>
    <p v-if="errorMessage" class="field-error mt-1 ml-1 lg:text-base">
      {{ errorMessage }}
    </p>
  </div>
</template>

<script lang="ts">
import MailIcon from '@/components/Icons/MailIcon.vue'
import KeyIcon from '@/components/Icons/KeyIcon.vue'
import EyeIcon from '@/components/Icons/EyeIcon.vue'
import GlobeIcon from '@/components/Icons/GlobeIcon.vue'
import GenderIcon from '@/components/Icons/GenderIcon.vue'
import UserIcon from '@/components/Icons/UserIcon.vue'
import EyeSlashIcon from '@/components/Icons/EyeSlashIcon.vue'
import { countries } from '@/data/countries'
import { useField } from 'vee-validate'
import type { PropType } from 'vue'
import { ref, computed, watch, markRaw } from 'vue'
/**
 * @module components/Base/InputField
 * @description A highly flexible and theme-aware input field component that serves as a foundational element for all forms.
 * It integrates with VeeValidate for robust validation and supports leading/trailing icons, different variants (input/select),
 * and automatic attribute passthrough for native HTML5 compliance.
 */
export type SelectOption = {
  value: string | number | boolean
  label: string
}
export default {
  name: 'InputField',
  inheritAttrs: false,
  props: {
    /**
     * The current value of the input field. This is used for v-model binding.
     */
    modelValue: {
      type: [String, Number, File, Boolean] as PropType<string | number | boolean | File | null>,
      default: '',
    },
    /**
     * The unique name of the input field. This is crucial for form submission and for VeeValidate to track errors.
     */
    name: { type: String, required: true },
    /**
     * The input's native `type` attribute (e.g., 'text', 'password', 'email').
     * This is automatically toggled to 'text' when `showPassword` is true.
     */
    type: { type: String, default: '' },
    /**
     * A preset for common input types like 'email' or 'password'.
     * This will automatically configure the icon, validation rules, placeholder, and type.
     */
    specificType: { type: String, default: '' },
    /**
     * The placeholder text to display when the input is empty.
     */
    placeholder: { type: String, default: '' },
    /**
     * The ARIA label for accessibility. If not provided, it defaults to the placeholder text.
     */
    ariaLabel: { type: String, default: '' },
    errorLabel: { type: String, default: '' },
    /**
     * When true, the field keeps its internal VeeValidate state in sync with the parent-provided `modelValue`.
     * @type {Boolean}
     * @default false
     */
    syncExternalValue: { type: Boolean, default: false },
    /**
     * A string of VeeValidate validation rules to apply to the field (e.g., 'required|email').
     */
    rules: { type: String, default: '' },
    /**
     * The rendering mode for the field. Use 'select' to render a dropdown list instead of a standard input.
     * @values 'input', 'select'
     */
    variant: { type: String, default: '' },
    /**
     * An array of options for the select dropdown. This is only used when `variant` is 'select'.
     * Each option must be an object with `value` and `label` properties.
     */
    options: {
      type: Array as PropType<SelectOption[]>,
      default: () => null,
    },
    /**
     * A Vue component to be rendered as an icon on the left (leading) side of the input.
     */
    icon: { type: [Object, Function], default: null },
    /**
     * A Vue component to be rendered as a clickable icon on the right (trailing) side.
     * Typically used for toggling password visibility.
     */
    iconRight: { type: [Object, Function], default: null },
    iconRightClear: { type: Boolean, default: false },
    /**
     * The CSS classes to apply to both leading and trailing icons.
     */
    iconClass: { type: String, default: 'w-5 h-5 lg:w-6 lg:h-6' },
    /**
     * Additional, custom CSS classes to apply directly to the `<input>` or `<select>` element.
     */
    inputClass: { type: String, default: '' },
    /**
     * Optional `accept` attribute value for file inputs (comma-separated MIME types/extensions).
     */
    fileType: { type: String, default: '' },
    /**
     * Optional string whose changes should retrigger validation when the field already has a value.
     * Typically used when the rule arguments depend on external state (e.g., media type).
     */
    validator: { type: String, default: '' },
  },
  computed: {
    /**
     * Computes the dynamic classes for the input element based on icon presence.
     * @returns {string}
     */
    inputClasses() {
      return [
        'field-input w-full h-10 lg:h-12 text-sm lg:text-base',
        this.resolvedIcon ? 'pl-11' : 'pl-3',
        this.resolvedIconRight ? 'pr-11' : 'pr-3',
        this.inputClass,
      ].join(' ')
    },
    /**
     * Resolves the final icon to use, prioritizing the `icon` prop over defaults.
     * @returns {object|null}
     */
    resolvedIcon() {
      return this.icon || this.defaultValues.icon || null
    },
    /**
     * Resolves the final right-side icon to use.
     */
    resolvedIconRight() {
      return this.iconRight || this.defaultValues.iconRight || null
    },
    /**
     * Resolves the final input type, prioritizing the `type` prop over defaults.
     */
    resolvedType() {
      return this.type || this.defaultValues.type || 'text'
    },
    /**
     * Resolves the final placeholder text.
     */
    resolvedPlaceholder() {
      return this.placeholder || this.defaultValues.placeholder || ''
    },
    /**
     * Resolves which variant should render (select/input). Pulls from prop, attributes, or computed defaults.
     * @returns {string|null}
     */
    resolvedVariant() {
      return this.variant || this.defaultValues.variant || null
    },
    /**
     * Resolves the options array for select variants, allowing callers to provide via props or metadata.
     * @returns {Array<{value: string|number, label: string}>|null}
     */
    resolvedOptions(): SelectOption[] {
      return this.options || this.defaultValues.options || []
    },
    /**
     * Resolves the final autocomplete value.
     * @returns {string}
     */
    resolvedAutocomplete(): string {
      return String(this.$attrs.autocomplete ?? this.defaultValues.autocomplete ?? '')
    },
  },
  methods: {
    /**
     * Toggles the internal `showPassword` state.
     */
    handleRightIcon() {
      // Clear Button
      if (this.iconRightClear) {
        this.setValue('')
        // Toggle Password
      } else {
        this.showPassword = !this.showPassword
      }
    },
  },
  /**
   * Configures the input/select by resolving defaults (icons, rules, variants)
   * based on `specificType`, wires the VeeValidate `useField` hook, and keeps
   * `value` synchronized with the parent via `update:modelValue`.
   */
  setup(props, { emit }) {
    // reactive boolean for toggling password visibility
    const showPassword = ref(false)
    const genderOptions = ref([
      { value: '', label: 'Select Gender' },
      { value: 'female', label: 'Female' },
      { value: 'male', label: 'Male' },
      { value: 'other', label: 'Other' },
    ])

    const userOptions = ref([
      { label: 'Select User Role', value: '' },
      { label: 'Admin', value: 'admin' },
      { label: 'Staff', value: 'staff' },
    ])

    const countryOptions = computed(() => {
      const mapped = countries.map((country) => ({
        value: country,
        label: country,
      }))
      return [{ value: '', label: 'Select Country' }, ...mapped]
    })

    // Default values for validation
    const defaultValues = computed(() => {
      switch (props.specificType) {
        case 'email':
          return {
            type: 'email',
            placeholder: 'Enter Email Address',
            rules: 'required|email',
            icon: markRaw(MailIcon),
            autocomplete: 'email',
            errorLabel: 'Email Address',
          }
        case 'user':
          return {
            variant: 'select',
            options: userOptions.value,
            rules: 'required',
            icon: markRaw(UserIcon),
            errorLabel: 'User Role',
          }
        case 'country':
          return {
            variant: 'select',
            options: countryOptions.value,
            placeholder: 'Select Country',
            rules: 'required',
            icon: markRaw(GlobeIcon),
            autocomplete: 'country',
            errorLabel: 'Country',
          }
        case 'gender':
          return {
            variant: 'select',
            options: genderOptions.value,
            placeholder: 'Select Gender',
            rules: 'required',
            icon: markRaw(GenderIcon),
            autocomplete: 'gender',
            errorLabel: 'Gender',
          }
        case 'password':
          return {
            type: showPassword.value ? 'text' : 'password',
            placeholder: 'Enter Password',
            errorLabel: 'Password',
            rules: 'required|min:6|safe_password|max:50',
            icon: markRaw(KeyIcon),
            iconRight: showPassword.value ? markRaw(EyeSlashIcon) : markRaw(EyeIcon),
            autocomplete: 'current-password',
          }
        case 'phone':
          return {
            placeholder: 'Enter Phone Number',
            errorLabel: 'Phone number',
            rules: 'required|phone_strict',
            autocomplete: 'phone',
          }
        case 'fname':
        case 'lname':
          return {
            type: 'text',
            placeholder: props.specificType === 'fname' ? 'Enter First Name' : 'Enter Last Name',
            rules: 'required|min:3|max:60|alpha',
            icon: markRaw(UserIcon),
            errorLabel: props.specificType === 'fname' ? 'First Name' : 'Last Name',
            autocomplete: props.specificType === 'fname' ? 'given-name' : 'family-name',
          }
        default:
          return {}
      }
    })

    // Computed values used for validation
    const resolvedRules = computed(() => props.rules || defaultValues.value.rules || '')
    const resolvedErrorLabel = computed(
      () => props.errorLabel || defaultValues.value.errorLabel || props.name,
    )

    // VeeValidate field
    const { value, setValue, errorMessage, handleBlur, validate } = useField(
      props.name,
      resolvedRules.value,
      {
        initialValue: props.modelValue,
        bails: true, // Stop First Error
        label: resolvedErrorLabel.value,
      },
    )
    const stringValue = computed({
      get: () =>
        typeof value.value === 'string' || typeof value.value === 'number'
          ? String(value.value)
          : '',
      set: (val: string) => setValue(val),
    })
    if (props.syncExternalValue) {
      /**
       * Keep the VeeValidate field value in sync when the parent updates the bound prop.
       */
      watch(
        () => props.modelValue,
        (next) => {
          if (next !== value.value) {
            setValue(next)
          }
        },
      )
    }
    if (props.validator) {
      /**
       * Re-run validation when the dependent prop changes (e.g., when the allowed MIME/type argument updates).
       */
      watch(
        () => props.validator,
        () => {
          if (value.value) {
            validate()
          }
        },
      )
    }
    /**
     * Updates the VeeValidate field value when a new file is selected.
     * Extracts the first file from the input and pushes it through `setValue`.
     */
    const handleFileChange = (event: Event) => {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0] ?? null // was: ?? ''

      setValue(file)
    }
    /**
     * Mirrors the internal field value back to the parent via `v-model`.
     */
    watch(value, (newVal) => {
      emit('update:modelValue', newVal)
    })

    return {
      //Vee validate
      value,
      setValue,
      stringValue,
      errorMessage,
      handleBlur,
      handleFileChange,
      // Reactive Refs
      showPassword,
      defaultValues,
    }
  },
}
</script>

<style scoped></style>
