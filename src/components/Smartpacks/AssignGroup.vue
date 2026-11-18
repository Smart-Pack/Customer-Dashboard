<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="main-card h-[80%] w-[80%] flex flex-col">
      <div class="flex items-center justify-between gap-3 p-4">
        <button
          type="button"
          class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
          @click="handleClose"
        >
          Cancel
        </button>

        <button
          type="button"
          class="px-4 py-2 rounded-full text-sm font-semibold form-submit-secondary"
          :disabled="!selectedGroup.id || submitting"
          @click="handleAssign"
        >
          Assign Group
        </button>
      </div>

      <div class="overflow-auto">
        <TablePageLayout
          :getter="getGroupsList"
          :tabs="groupTabs"
          name="Groups"
          :item-headings="groupHeadings"
          nav-class="hidden"
          :enable-search="true"
          :extra-props="extraProps"
          @selection-change="handleSelectionChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @module components/SmartPacks/AssignGroup
 * @description Displays a modal for selecting and assigning a group to a
 * SmartPack. Lists groups where the authenticated user has owner or admin
 * access, with pagination, searching, and offline data caching support.
 *
 * Uses the shared TablePageLayout for group retrieval and selection.
 * Emits the selected group to the parent component when assignment is
 * submitted.
 */

import { ref } from 'vue'
import TablePageLayout from '@/components/Base/TablePageLayout.vue'
import { listWithCache, type Group, type GroupQueryParams } from '@/api/modules/groups'
import { useAuthStore } from '@/stores/modules/auth'
import Filters from '@/helpers/filters'

defineOptions({
  name: 'AssignGroup',
})

const authStore = useAuthStore()

/**
 * Fetches groups using the API with local caching support.
 *
 * Passes the authenticated user's groups to support role-based filtering
 * when retrieving cached data offline.
 *
 * @param params - Group filters and pagination parameters.
 * @returns Paginated groups from the API or local cache.
 */
function getGroupsList(params: GroupQueryParams) {
  return listWithCache(params, authStore.loggedInUser?.groups ?? [])
}

/**
 * Component props.
 *
 * @property {boolean} submitting
 * Indicates whether an assignment request is currently being processed.
 * Used to prevent duplicate submissions.
 */
defineProps<{
  submitting: boolean
}>()

/**
 * Component events.
 *
 * @event close
 * Emitted when the assignment modal is closed.
 *
 * @event assign
 * Emitted with the selected group when the assignment is submitted.
 */
const emit = defineEmits<{
  close: [value: boolean]
  assign: [group: Group]
}>()

/**
 * Currently selected group.
 *
 * A partial Group object is used because the selection is initially empty
 * and is populated once the user selects a row from the table.
 */
const selectedGroup = ref<Partial<Group>>({})

/**
 * Additional properties passed to TablePageLayout.
 *
 * Configures the table to use radio-button selection so that only
 * one group can be selected for assignment.
 */
const extraProps = {
  'selection-type': 'radio',
  'selection-name': 'assignGroup',
}

/**
 * Group table tabs.
 *
 * The group list is restricted to groups where the authenticated user
 * has owner or admin access.
 */
const groupTabs: Array<{
  id: string
  caption: string
  label: string
  params: GroupQueryParams
}> = [
  {
    id: 'admin-access',
    caption: 'Assign Group',
    label: 'Groups',
    params: {
      has_admin_access: true,
    },
  },
]

/**
 * Group table column definitions.
 *
 * Defines the fields displayed in the group selection table, including
 * sortable fields and date formatting.
 */
const groupHeadings = [
  {
    key: 'selection',
    label: 'Select',
    sortable: false,
    dataClass: 'secondary-text font-bold',
  },
  {
    key: 'name',
    label: 'Group Name',
    sortable: true,
    dataClass: 'primary-text font-bold',
  },
  {
    key: 'total_users',
    label: 'Users',
    sortable: true,
  },
  {
    key: 'total_smartpacks',
    label: 'SmartPacks',
    sortable: true,
  },
  {
    key: 'created',
    label: 'Created',
    sortable: true,
    formatter: (value: unknown) => Filters.dateTime(value as string | null | undefined),
  },
]

/**
 * Closes the assignment modal and clears the current selection.
 *
 * @returns {void}
 */
function handleClose(): void {
  selectedGroup.value = {}
  emit('close', false)
}

/**
 * Submits the selected group for assignment.
 *
 * Does nothing when no group has been selected.
 *
 * @returns {void}
 */
function handleAssign(): void {
  if (!selectedGroup.value.id) return

  emit('assign', selectedGroup.value as Group)
}

/**
 * Updates the selected group when the table selection changes.
 *
 * Since the table is configured for radio selection, only the first
 * selected group is used.
 *
 * @param {Group[]} groups - Currently selected groups.
 * @returns {void}
 */
function handleSelectionChange(groups: Group[]): void {
  selectedGroup.value = groups.length > 0 ? groups[0]! : {}
}
</script>
