<template>
  <button
    :type="type"
    :disabled="disabled"
    :aria-busy="ariaBusy ?? undefined"
    class="form-submit w-full px-2 py-2 mt-2 h-10 lg:h-12"
  >
    <slot>{{ label }}</slot>
  </button>
</template>

<script lang="ts">
/**
 * A standardized, theme-aware button component for use in forms and actions.
 * It applies consistent styling and handles disabled/busy states.
 */
export default {
  name: 'BaseButton',

  props: {
    /**
     * The default text to display inside the button. Can be overridden by the default slot.
     */
    label: {
      type: String,
      default: 'Submit',
    },

    /**
     * The button's type attribute.
     * @values 'button', 'submit', 'reset'
     */
    type: {
      type: String as () => 'button' | 'submit' | 'reset',
      default: 'button',
    },

    /**
     * Whether the button is disabled and non-interactive.
     */
    disabled: {
      type: Boolean,
      default: false,
    },

    /**
     * Whether to apply the `aria-busy` attribute, indicating a loading state.
     */
    ariaBusy: {
      type: Boolean,
      default: null,
    },
  },
}
</script>
