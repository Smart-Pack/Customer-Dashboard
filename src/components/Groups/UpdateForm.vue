<template>
  <CreationFormLayout
    page-heading="Update Group"
    page-description="Review and update the group details to keep its information accurate."
    :sections="sections"
    name="Group"
    :adder="groupsEditAdder"
    :initial-values="initialValuesAsFormItem"
    @close="handlePageChange"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import CreationFormLayout from '@/components/Base/CreationFormLayout.vue'
import type { Adder, FormItem } from '@/components/Base/CreationFormLayout.vue'
import { getGroupSections } from '@/data/forms/groupSections'
import type { GroupDetail } from '@/api/modules/groups'

/**
 * @module components/Groups/UpdateForm
 * @description Wraps `CreationFormLayout` to edit an existing group; reuses the shared sections defined in `groupSections` and feeds the current group as `initialValues`.
 */
export default defineComponent({
  name: 'GroupUpdateForm',

  components: {
    CreationFormLayout,
  },

  props: {
    /**
     * Initial field values for the group being updated.
     */
    initialValues: {
      type: Object as PropType<GroupDetail>,
      required: true,
    },
  },

  data() {
    return {
      sections: getGroupSections(),
    }
  },

  computed: {
    groupsEditAdder(): Adder {
      return this.$api.groups.edit as unknown as Adder
    },

    initialValuesAsFormItem(): FormItem {
      return this.initialValues as unknown as FormItem
    },
  },

  methods: {
    /**
     * Emits the page change event and requests the parent to refresh the group.
     *
     * @param value - The page to display.
     */
    handlePageChange(value: unknown): void {
      this.$emit('close', value, true)
    },
  },
})
</script>

<style scoped></style>
