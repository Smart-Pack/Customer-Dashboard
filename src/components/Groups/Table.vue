<!--
  GroupsTable

  Displays groups available to the authenticated user, including their
  membership and management information.

  Features:
  - Fetches groups through the API with SQLite offline caching on native platforms.
  - Supports role-based filtering using All, Managed, and Member tabs.
  - Supports searching and sorting group records.
  - Provides navigation to individual group details.

  Offline retrieval uses the authenticated user's group roles to apply
  the appropriate filters to locally cached data.
-->

<template>
  <TablePageLayout
    :getter="getGroupsList"
    page-description="Manage groups, view their members and SmartPacks, and keep track of group ownership and creation."
    :tabs="groupTabs"
    name="Groups"
    :item-headings="groupHeadings"
    :enable-search="true"
    nav-class="grid-cols-3 lg:text-base"
  />
</template>

<script setup lang="ts">
import TablePageLayout from '@/components/Base/TablePageLayout.vue'
import { listWithCache, type GroupQueryParams } from '@/api/modules/groups'
import { useAuthStore } from '@/stores/modules/auth'
import Filters from '@/helpers/filters'

defineOptions({
  name: 'GroupsTable',
})

const authStore = useAuthStore()

/**
 * Fetches groups using the API with local caching support.
 *
 * Passes the authenticated user's groups to support role-based filtering
 * when retrieving cached data offline.
 *
 * @param params - Group filters and pagination parameters.
 */
function getGroupsList(params: GroupQueryParams) {
  return listWithCache(params, authStore.loggedInUser?.groups ?? [])
}

/**
 * Defines the available group table tabs and their associated filters.
 *
 * - All: Displays all groups available to the authenticated user.
 * - Created: Displays groups owned by the current user.
 * - Member: Displays groups where the current user is a member.
 *
 * The `owner` and `member` query parameters use the authenticated user's ID.
 */
const groupTabs: Array<{
  id: string
  caption: string
  label: string
  params: GroupQueryParams
}> = [
  {
    id: 'all',
    caption: 'All Groups',
    label: 'All',
    params: {},
  },
  {
    id: 'admin',
    caption: 'Groups I Manage',
    label: 'Managed',
    params: { has_admin_access: true },
  },
  {
    id: 'member',
    caption: 'Groups I Belong To',
    label: 'Member',
    params: { role: 'member' },
  },
]

/**
 * Defines the columns displayed in the groups table.
 *
 * Displays each group's name, total number of users, total number of
 * SmartPacks, creation date, and an action for viewing group details.
 *
 * The `updated` field is intentionally excluded.
 */
const groupHeadings = [
  {
    key: 'name',
    label: 'Group Name',
    sortable: true,
    dataClass: 'primary-text font-bold',
  },
  {
    key: 'total_users',
    label: 'Total Users',
    sortable: true,
  },
  {
    key: 'total_smartpacks',
    label: 'Total SmartPacks',
    sortable: true,
  },
  {
    key: 'created',
    label: 'Created',
    sortable: true,
    formatter: (value: unknown) => Filters.dateTime(value as string | null | undefined),
  },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false,
    action: {
      name: 'View',
      route: 'group-details',
    },
  },
]
</script>
