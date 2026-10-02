<template>
  <CreationFormLayout
    pageHeading=""
    page-description="Enter the child name to assign this SmartPack."
    :sections="sections"
    name="SmartPack"
    :adder="smartPackEditAdder"
    :initial-values="initialValuesAsFormItem"
    @close="handlePageChange"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import CreationFormLayout from '@/components/Base/CreationFormLayout.vue'
import type { Adder, FormItem } from '@/components/Base/CreationFormLayout.vue'
import UserIcon from '@/components/Icons/UserIcon.vue'
import type { SmartPack } from '@/api/modules/smartpacks'
import { markRaw } from 'vue'

/**
 * @module components/Smartpacks/UpdateForm
 * @description Wraps `CreationFormLayout` to assign a SmartPack to a child by updating its child name.
 */
export default defineComponent({
  name: 'AssignChildForm',

  components: {
    CreationFormLayout,
  },

  props: {
    /**
     * Initial SmartPack values.
     */
    initialValues: {
      type: Object as PropType<SmartPack>,
      required: true,
    },
  },

  data() {
    return {
      sections: [
        {
          title: '',
          fields: [
            {
              name: 'child_name',
              label: 'Child Name',
              errorName: 'Child name',
              placeholder: 'Enter Child Name',
              specificType: 'fname',
              rules: 'max:100',
              icon: markRaw(UserIcon),
            },
          ],
        },
      ],
    }
  },

  computed: {
    smartPackEditAdder(): Adder {
      return this.$api.smartpacks.edit as unknown as Adder
    },

    initialValuesAsFormItem(): FormItem {
      return {
        id: this.initialValues.id,
        child_name: this.initialValues.child_name,
      } as unknown as FormItem
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
