<template>
  <section class="w-full p-4">
    <p class="secondary-text">
      {{ pageDescription }}
    </p>
    <h2 class="sub-heading mt-4">{{ pageHeading }}</h2>
    <form @submit.prevent="addItem" class="space-y-6 text-sm mt-8">
      <section class="space-y-4" v-for="section in sections" :key="section.title">
        <h3 class="font-poppins tracking-[0.4em] uppercase underline secondary-text text-base">
          {{ section.title }}
        </h3>
        <div class="grid gap-4 md:grid-cols-2">
          <div
            v-for="field in section.fields.filter((field) => !field.hidden)"
            :key="field.name"
            class="space-y-2"
          >
            <label
              class="group relative secondary-text font-semibold inline-flex items-center gap-1"
            >
              <span>{{ field.label }}</span>
              <InfoIcon v-if="field.info" class="h-4 w-4 cursor-help primary-text" />
              <div
                v-if="field.info"
                class="absolute bottom-full left-0 mb-2 w-48 card-base p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 border-4"
              >
                <p class="font-medium primary-text">{{ field.info }}</p>
              </div>
            </label>

            <InputField
              :input-class="field.inputClass"
              v-model="item[field.name]"
              :name="field.name"
              :placeholder="field.placeholder"
              :rules="field.rules"
              :icon="field.icon"
              :type="field.type"
              :specific-type="field.specificType"
              :variant="field.variant"
              :options="field.options"
              :errorLabel="field.errorName"
              :autofocus="field.autofocus"
              v-bind="field.extraAttrs || {}"
            />
          </div>
        </div>
      </section>
      <div class="flex" :class="modalButton ? `justify-between` : `justify-end`">
        <button
          v-if="modalButton"
          type="button"
          class="form-submit-secondary px-6 py-2 text-sm font-semibold"
          :disabled="submitting"
          @click="$emit('showModal', true)"
        >
          <span> {{ modalButton?.text }}</span>
        </button>
        <button
          type="submit"
          class="form-submit px-6 py-2 text-sm font-semibold center-flex"
          :disabled="submitting"
        >
          <span>{{ submitButtonText }}</span>
          <div v-if="submitting" class="ml-4 submit-spinner"></div>
        </button>
      </div>
    </form>
  </section>
</template>
<script lang="ts">
import { defineComponent, reactive, ref, watch, type PropType } from 'vue'
import type { AxiosError } from 'axios'
import { useForm } from 'vee-validate'

import InputField from '@/components/Base/InputField.vue'
import InfoIcon from '@/components/Icons/InfoIcon.vue'
import { useGlobals } from '@/composables/useGlobals'
import type { SelectOption } from '@/components/Base/InputField.vue'

/**
 * Represents a single form field's configuration, consumed by `InputField`.
 */
interface FieldConfig {
  name: string
  label: string
  hidden?: boolean
  info?: string
  inputClass?: string
  placeholder?: string
  rules?: string
  icon?: (() => unknown) | Record<string, unknown>
  type?: string
  specificType?: string
  variant?: string
  options?: SelectOption[]
  errorName?: string
  autofocus?: boolean
  extraAttrs?: Record<string, unknown>
}

/**
 * Represents a grouped section of fields, rendered under its own heading.
 */
interface SectionConfig {
  title: string
  fields: FieldConfig[]
}

/**
 * Represents a watcher descriptor: watches `item[key]` and emits `name` on change.
 */
interface WatcherConfig {
  key: string
  name: string
}

/**
 * Represents the optional secondary button used to trigger a modal/popup.
 */
interface ModalButtonConfig {
  text: string
  [key: string]: unknown
}

/**
 * Represents the reactive form model. Field values are seeded from `initialValues`
 * or defaulted to an empty string for every field declared across `sections`.
 */
export type FormItem = Record<string, string | number | boolean | File | null | undefined>

/**
 * Represents the payload the `adder` function resolves with on success.
 */
export interface AdderResult {
  data: { id: string | number; [key: string]: unknown }
  message: string
}

/**
 * Represents the function responsible for persisting the `item` payload.
 */
export type Adder = (payload: Record<string, unknown>) => Promise<AdderResult>

/**
 * @module components/Base/CreationFormLayout
 * @description Renders grouped form sections, wires vee-validate validation,
 * and delegates creation/update submissions to a provided API helper.
 * Extra parameters and watcher descriptors let parents inject context data and react to field changes.
 */
export default defineComponent({
  name: 'CreationFormLayout',

  inheritAttrs: false,

  components: { InputField, InfoIcon },

  props: {
    /**
     * A description of the page to be displayed above the tabs.
     * @type {String}
     * @required
     */
    pageDescription: { type: String, required: true },

    /**
     * The large heading that describes what the form is about.
     * @type {String}
     * @required
     */
    pageHeading: { type: String, required: true },

    /**
     * The section/field configuration used to render `InputField` instances.
     * Each section should contain a `title` and a `fields` array describing the inputs to render.
     * @type {Array<{title: string, fields: Array<object>}>}
     * @required
     */
    sections: {
      type: Array as PropType<SectionConfig[]>,
      required: true,
    },

    /**
     * Human-readable resource name used in the submit button text and success messaging.
     * @type {String}
     * @required
     */
    name: { type: String, required: true },

    /**
     * Route name to navigate to once the creation succeeds.
     * @type {String}
     * @required
     */
    detailsPage: { type: String, required: false, default: null },

    /**
     * API helper responsible for persisting the `item` payload.
     * Should return a promise that resolves with `{ data, message }`.
     * @type {Function}
     * @required
     */
    adder: {
      type: Function as PropType<Adder>,
      required: true,
    },

    /**
     * Optional initial field values (used by update forms).
     * @type {Object<string, any>}
     */
    initialValues: {
      type: Object as PropType<FormItem | null>,
      required: false,
      default: null,
    },

    // Extra Values to be used in getter
    /**
     * Any additional payload that should be merged into the `adder` call.
     * Useful when the parent must inject contextual IDs (e.g., partner) without changing the input sections.
     * @type {Object<string, any>}
     */
    extraParams: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },

    /**
     * Optional watcher descriptors emitted when `item[key]` changes.
     * Each entry should include `key` (field name) and `name` (event to dispatch).
     * @type {Array<{key: string, name: string}>}
     */
    watcher: {
      type: Array as PropType<WatcherConfig[] | null>,
      default: null,
    },

    // Button to trigger popup/modal
    modalButton: {
      type: Object as PropType<ModalButtonConfig | null>,
      default: null,
    },
  },

  computed: {
    /**
     * Computes the text for the submit button based on the `submitting` state.
     * Uses `initialValues` to decide whether this is an update or create experience.
     * @returns {string}
     */
    submitButtonText(): string {
      const verb = this.initialValues ? 'Updating' : 'Adding'
      return this.submitting ? `${verb} ${this.name}...` : 'Submit'
    },
  },

  /**
   * Builds the reactive item model, injects the routing/notification helpers,
   * and wires `useForm`/`handleSubmit` so the form can validate and submit via `adder`.
   */
  setup(props, { emit }) {
    const { $notifySuccess, $notifyError, $router } = useGlobals()

    // Initialize user object with all keys from formFields
    const item = reactive<FormItem>({})
    const submitting = ref(false)

    /**
     * Ensures `item` contains all configured fields (copying defaults or initial values)
     * before the template renders so `v-model` bindings stay reactive.
     */
    if (props.initialValues !== null) {
      Object.assign(item, props.initialValues)
    }
    props.sections.forEach((section) => {
      section.fields.forEach(({ name }) => {
        if (!(name in item)) {
          item[name] = ''
        }
      })
    })

    // Initialize the form with VeeValidate
    const { handleSubmit, setFieldError } = useForm({ initialValues: item })

    /**
     * Submit handler wrapped with VeeValidate that calls `adder`, merges `extraParams`,
     * shows notifications, and routes or emits close events after success.
     */
    const addItem = handleSubmit(async (values) => {
      try {
        submitting.value = true
        const result = await props.adder({ ...values, ...props.extraParams })
        $notifySuccess(result.message)
        if (!props.detailsPage) {
          emit('close', 'showDetails')
        } else {
          $router.push({
            name: props.detailsPage,
            params: { id: result.data.id },
          })
        }
      } catch (e: unknown) {
        const error = e as AxiosError

        if (error?.response?.data) {
          Object.entries(error.response.data).forEach(([field, messages]) => {
            setFieldError(field, messages[0])
          })
        }
        $notifyError(error.message ?? 'Unable to submit this form.')
      } finally {
        submitting.value = false
      }
    })

    if (props.watcher) {
      /**
       * Emit the specified `watcher.name` event whenever `item[watcher.key]` changes.
       * This lets parents update related state (e.g., file type or realm selection).
       */
      for (const watcher of props.watcher) {
        watch(
          () => item[watcher.key],
          (next) => {
            emit(watcher.name, next)
          },
        )
      }
    }

    return { item, addItem, submitting }
  },
})
</script>
<style></style>
