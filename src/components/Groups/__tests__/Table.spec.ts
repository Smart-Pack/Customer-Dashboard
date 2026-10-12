import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { groups } from '@/api/modules'
import GroupsTable from '@/components/Groups/Table.vue'
import TablePageLayout from '@/components/Base/TablePageLayout.vue'

const mockAuthStore = {
  userId: 42,
}

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

const mountGroupsTable = () =>
  mount(GroupsTable, {
    global: {
      mocks: {
        $api: {
          groups: {
            list: vi.fn<typeof groups.list>(() =>
              Promise.resolve({
                count: 0,
                next: null,
                previous: null,
                results: [],
              }),
            ),
          },
        },
      },
      stubs: {
        TablePageLayout: true,
      },
    },
  })

describe('GroupsTable', () => {
  beforeEach(() => {
    mockAuthStore.userId = 42
  })

  describe('rendering', () => {
    it('renders a TablePageLayout', () => {
      const wrapper = mountGroupsTable()

      expect(wrapper.findComponent(TablePageLayout).exists()).toBe(true)
    })

    it('passes the groups API getter and table name', () => {
      const wrapper = mountGroupsTable()
      const layout = wrapper.findComponent(TablePageLayout)

      expect(layout.props('getter')).toBeDefined()
      expect(layout.props('name')).toBe('Groups')
    })

    it('passes the page description', () => {
      const wrapper = mountGroupsTable()
      const layout = wrapper.findComponent(TablePageLayout)

      expect(layout.props('pageDescription')).toBe(
        'Manage groups, view their members and SmartPacks, and keep track of group ownership and creation.',
      )
    })

    it('enables search', () => {
      const wrapper = mountGroupsTable()
      const layout = wrapper.findComponent(TablePageLayout)

      expect(layout.props('enableSearch')).toBe(true)
    })

    it('passes the navigation class', () => {
      const wrapper = mountGroupsTable()
      const layout = wrapper.findComponent(TablePageLayout)

      expect(layout.props('navClass')).toBe('grid-cols-3 lg:text-base')
    })
  })

  describe('groupTabs', () => {
    it('passes three tabs', () => {
      const wrapper = mountGroupsTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{
        id: string
        caption: string
        label: string
        params: Record<string, unknown>
      }>

      expect(tabs).toHaveLength(3)
    })

    it('configures the All tab without filters', () => {
      const wrapper = mountGroupsTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{
        id: string
        caption: string
        label: string
        params: Record<string, unknown>
      }>

      expect(tabs[0]).toEqual({
        id: 'all',
        caption: 'All Groups',
        label: 'All',
        params: {},
      })
    })

    it('configures the Created tab using the authenticated user ID as owner', () => {
      const wrapper = mountGroupsTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{
        id: string
        caption: string
        label: string
        params: Record<string, unknown>
      }>

      expect(tabs[1]).toEqual({
        id: 'created',
        caption: 'Groups I Created',
        label: 'Created',
        params: { owner: 42 },
      })
    })

    it('configures the Member tab using the authenticated user ID as member', () => {
      const wrapper = mountGroupsTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{
        id: string
        caption: string
        label: string
        params: Record<string, unknown>
      }>

      expect(tabs[2]).toEqual({
        id: 'member',
        caption: 'Groups I Belong To',
        label: 'Member',
        params: { member: 42 },
      })
    })
  })

  describe('groupHeadings', () => {
    it('passes five column headings in the expected order', () => {
      const wrapper = mountGroupsTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{ key: string }>

      expect(headings).toHaveLength(5)
      expect(headings.map((heading) => heading.key)).toEqual([
        'name',
        'total_users',
        'total_smartpacks',
        'created',
        'actions',
      ])
    })

    it('makes the group name, user count, SmartPack count, and creation date sortable', () => {
      const wrapper = mountGroupsTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        sortable: boolean
      }>

      expect(headings.find((heading) => heading.key === 'name')?.sortable).toBe(true)
      expect(headings.find((heading) => heading.key === 'total_users')?.sortable).toBe(true)
      expect(headings.find((heading) => heading.key === 'total_smartpacks')?.sortable).toBe(true)
      expect(headings.find((heading) => heading.key === 'created')?.sortable).toBe(true)
    })

    it('formats the creation date using Filters.dateTime', () => {
      const wrapper = mountGroupsTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        formatter?: (value: unknown) => unknown
      }>

      const created = headings.find((heading) => heading.key === 'created')

      expect(created?.formatter?.('2026-09-23T14:30:00Z')).toEqual(expect.any(String))
      expect(created?.formatter?.(null)).toBe('')
    })

    it('configures the Actions column with a View action linking to group details', () => {
      const wrapper = mountGroupsTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        label: string
        sortable: boolean
        action?: {
          name: string
          route: string
        }
      }>

      const actions = headings.find((heading) => heading.key === 'actions')

      expect(actions?.label).toBe('Actions')
      expect(actions?.sortable).toBe(false)
      expect(actions?.action).toEqual({
        name: 'View',
        route: 'group-details',
      })
    })

    it('does not include the updated field', () => {
      const wrapper = mountGroupsTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{ key: string }>

      expect(headings.some((heading) => heading.key === 'updated')).toBe(false)
    })
  })
})
