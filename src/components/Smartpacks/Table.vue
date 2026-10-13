<template>
  <TablePageLayout
    :getter="$api.smartpacks.list"
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
import type { SmartPackQueryParams, SmartPackGroup } from '@/api/modules/smartpacks'
import Filters from '@/helpers/filters'

defineOptions({
  name: 'SmartPacksTable',
})

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
