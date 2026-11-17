<!--
  SmartPacksTable

  Displays SmartPacks available to the authenticated user, including their
  connectivity, firmware, assignment, and group information.

  Features:
  - Fetches SmartPacks through the API with SQLite offline caching on native platforms.
  - Supports filtering using All, Grouped, and Ungrouped tabs.
  - Supports searching and sorting SmartPack records.
  - Provides navigation to individual SmartPack details.

  Offline retrieval applies the requested filters and pagination to locally
  cached SmartPack records.
-->

<template>
  <TablePageLayout
    :getter="getSmartPacksList"
    page-description="Monitor your SmartPacks, track their connectivity and assignment status, and manage their group associations."
    :tabs="smartPackTabs"
    name="SmartPacks"
    :item-headings="smartPackHeadings"
    :enable-search="true"
    :refresh-key="refreshKey"
    nav-class="grid-cols-3 lg:text-base"
  />
</template>

<script setup lang="ts">
import TablePageLayout from '@/components/Base/TablePageLayout.vue'
import {
  listWithCache,
  type SmartPackQueryParams,
  type SmartPackGroup,
} from '@/api/modules/smartpacks'
import Filters from '@/helpers/filters'

defineOptions({
  name: 'SmartPacksTable',
})

/**
 * Fetches SmartPacks using the API with local caching support.
 *
 * @param params - SmartPack filters and pagination parameters.
 */
function getSmartPacksList(params: SmartPackQueryParams) {
  return listWithCache(params)
}

/**
 * Defines the available SmartPack table tabs and their associated filters.
 *
 * - All: Displays all SmartPacks available to the authenticated user.
 * - Grouped: Displays SmartPacks associated with a group.
 * - Ungrouped: Displays SmartPacks without a group.
 */
const smartPackTabs: Array<{
  id: string
  caption: string
  label: string
  params: SmartPackQueryParams
}> = [
  {
    id: 'all',
    caption: 'All SmartPacks',
    label: 'All',
    params: {},
  },
  {
    id: 'grouped',
    caption: 'SmartPacks with Groups',
    label: 'Grouped',
    params: {
      has_group: true,
    },
  },
  {
    id: 'ungrouped',
    caption: 'SmartPacks without Groups',
    label: 'Ungrouped',
    params: {
      has_group: false,
    },
  },
]

/**
 * Defines the columns displayed in the SmartPacks table.
 *
 * Displays each SmartPack's IMEI, firmware version, connectivity status,
 * associated group, child name, creation date, and an action for viewing
 * SmartPack details.
 */
const smartPackHeadings = [
  {
    key: 'imei',
    label: 'IMEI',
    sortable: true,
    dataClass: 'primary-text font-bold',
  },
  {
    key: 'firmware_version',
    label: 'Firmware',
    sortable: true,
  },
  {
    key: 'is_online',
    label: 'Status',
    sortable: true,
    formatter: (value: unknown) => (value ? 'Online' : 'Offline'),
    dataClass: {
      fmt: (value: unknown) => Filters.activeClass(Boolean(value)),
    },
  },
  {
    key: 'group',
    label: 'Group',
    sortable: true,
    formatter: (value: unknown) => {
      const group = value as SmartPackGroup | null

      return group ? group.name : '-'
    },
  },
  {
    key: 'child_name',
    label: 'Child',
    sortable: true,
  },
  {
    key: 'created',
    label: 'Added',
    sortable: true,
    formatter: (value: unknown) => Filters.dateTime(value as string | null | undefined),
  },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false,
    action: {
      name: 'View',
      route: 'smartpack-details',
    },
  },
]

/**
 * Props for the SmartPacks table.
 */
const { refreshKey } = defineProps<{
  /**
   * Key used to trigger a table refresh after SmartPack changes.
   */
  refreshKey: number
}>()
</script>
