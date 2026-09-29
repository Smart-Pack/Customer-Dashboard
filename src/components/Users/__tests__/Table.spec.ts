import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import UsersTable from '@/components/Users/Table.vue'
import TablePageLayout, { type Getter } from '@/components/Base/TablePageLayout.vue'

const mockUsersList = vi.fn<Getter>()

const mountTable = () =>
  mount(UsersTable, {
    global: {
      mocks: {
        $api: {
          users: {
            list: mockUsersList,
          },
        },
      },
      stubs: {
        TablePageLayout: true,
      },
    },
  })

describe('UsersTable', () => {
  describe('rendering', () => {
    it('renders a TablePageLayout', () => {
      const wrapper = mountTable()

      expect(wrapper.findComponent(TablePageLayout).exists()).toBe(true)
    })

    it('passes the page description, name, and nav class through', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)

      expect(layout.props('pageDescription')).toContain('Manage the users currently enrolled')
      expect(layout.props('name')).toBe('Users')
      expect(layout.props('navClass')).toBe('grid-cols-4 lg:text-base')
      expect(layout.props('enableSearch')).toBe(true)
    })

    it('passes the users API getter', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)

      expect(typeof layout.props('getter')).toBe('function')
    })
  })

  describe('userTabs', () => {
    it('passes four tabs with the expected ids and labels', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{ id: string; label: string }>

      expect(tabs).toHaveLength(4)
      expect(tabs.map((tab) => tab.id)).toEqual(['all', 'customers', 'internal', 'inactive'])
      expect(tabs.map((tab) => tab.label)).toEqual(['All', 'Customers', 'Internal', 'Suspended'])
    })

    it('scopes the customers tab to customer accounts', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{
        id: string
        params: Record<string, unknown>
      }>

      const customers = tabs.find((tab) => tab.id === 'customers')

      expect(customers?.params).toEqual({ account_type: 'customer' })
    })

    it('scopes the internal tab to internal accounts', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{
        id: string
        params: Record<string, unknown>
      }>

      const internal = tabs.find((tab) => tab.id === 'internal')

      expect(internal?.params).toEqual({ account_type: 'internal' })
    })

    it('scopes the inactive tab to suspended users', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{
        id: string
        params: Record<string, unknown>
      }>

      const inactive = tabs.find((tab) => tab.id === 'inactive')

      expect(inactive?.params).toEqual({ is_active: false })
    })

    it('leaves the all tab unscoped', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{
        id: string
        params: Record<string, unknown>
      }>

      const all = tabs.find((tab) => tab.id === 'all')

      expect(all?.params).toEqual({})
    })
  })

  describe('userHeadings', () => {
    it('passes seven column headings', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{ key: string }>

      expect(headings).toHaveLength(7)
      expect(headings.map((heading) => heading.key)).toEqual([
        'first_name',
        'last_name',
        'email',
        'account_type',
        'role',
        'created_at',
        'actions',
      ])
    })

    it('marks first_name with the bold primary-text dataClass', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{ key: string; dataClass?: string }>

      const firstName = headings.find((heading) => heading.key === 'first_name')

      expect(firstName?.dataClass).toBe('primary-text font-bold')
    })

    it('formats account_type using Filters.capitalize', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        formatter?: (value: unknown) => unknown
      }>

      const accountType = headings.find((heading) => heading.key === 'account_type')

      expect(accountType?.formatter?.('admin')).toBe('Admin')
    })

    it('formats role using Filters.capitalize', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        formatter?: (value: unknown) => unknown
      }>

      const role = headings.find((heading) => heading.key === 'role')

      expect(role?.formatter?.('staff')).toBe('Staff')
    })

    it('formats created_at using Filters.dateTime', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        formatter?: (value: unknown) => unknown
      }>

      const createdAt = headings.find((heading) => heading.key === 'created_at')

      expect(createdAt?.formatter?.('2026-09-23T14:30:00Z')).toEqual(expect.any(String))
      expect(createdAt?.formatter?.(null)).toBe('')
    })

    it('marks all sortable columns except actions', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{ key: string; sortable: boolean }>

      const sortableKeys = headings
        .filter((heading) => heading.sortable)
        .map((heading) => heading.key)
      const nonSortableKeys = headings
        .filter((heading) => !heading.sortable)
        .map((heading) => heading.key)

      expect(sortableKeys).toEqual([
        'first_name',
        'last_name',
        'email',
        'account_type',
        'role',
        'created_at',
      ])
      expect(nonSortableKeys).toEqual(['actions'])
    })

    it('configures the actions column with a View action routing to user-details', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        action?: { name: string; route: string }
      }>

      const actions = headings.find((heading) => heading.key === 'actions')

      expect(actions?.action).toEqual({ name: 'View', route: 'user-details' })
    })
  })
})
