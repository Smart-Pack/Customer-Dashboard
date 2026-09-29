<template>
  <CreationFormLayout
    page-heading="Update User"
    page-description="Review and update the user so their profile and role stay accurate."
    :sections="sections"
    name="User"
    :adder="usersEditAdder"
    :initial-values="initialValuesAsFormItem"
    @close="handlePageChange"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import CreationFormLayout from '@/components/Base/CreationFormLayout.vue'
import type { Adder, FormItem } from '@/components/Base/CreationFormLayout.vue'
import { getUserSections } from '@/data/forms/userSections'
import type { User } from '@/api/modules/users'

/**
 * @module components/Users/UserUpdateForm
 * @description Wraps `CreationFormLayout` to edit an existing user; reuses the shared sections defined in `userSections.js` and feeds the current user as `initialValues`.
 */
export default defineComponent({
  name: 'UserUpdateForm',

  components: {
    CreationFormLayout,
  },

  props: {
    /**
     * Initial field values for the user being updated.
     */
    initialValues: {
      type: Object as PropType<User>,
      required: true,
    },
  },

  data() {
    return {
      sections: getUserSections(),
    }
  },
  computed: {
    usersEditAdder(): Adder {
      return this.$api.users.edit as unknown as Adder
    },
    initialValuesAsFormItem(): FormItem {
      return this.initialValues as unknown as FormItem
    },
  },

  methods: {
    handlePageChange(value: unknown) {
      this.$emit('close', value, true)
    },
  },
})
</script>

<style scoped></style>
