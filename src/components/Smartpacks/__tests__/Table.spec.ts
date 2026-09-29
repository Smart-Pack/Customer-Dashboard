import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import SmartPacksTable from '@/components/Smartpacks/Table.vue'
import TablePageLayout, { type Getter } from '@/components/Base/TablePageLayout.vue'

const mockSmartPacksList = vi.fn<Getter>()

const mountTable = () =>
  mount(SmartPacksTable, {
    global: {
      mocks: {
        $api: {
          smartpacks: {
            list: mockSmartPacksList,
          },
        },
      },
      stubs: {
        TablePageLayout: true,
        RouterLink: true,
      },
    },
  })

describe('SmartPacksTable', () => {
  describe('rendering', () => {
    it('renders a TablePageLayout', () => {
      const wrapper = mountTable()

      expect(wrapper.findComponent(TablePageLayout).exists()).toBe(true)
    })

    it('passes the page description, name, and nav class through', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)

      expect(layout.props('pageDescription')).toContain('Manage registered SmartPacks')
      expect(layout.props('name')).toBe('SmartPacks')
      expect(layout.props('navClass')).toBe('grid-cols-3 lg:text-base')
      expect(layout.props('enableSearch')).toBe(true)
    })

    it('passes the smartpacks API getter', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)

      expect(layout.props('getter')).toBe(mockSmartPacksList)
    })
  })

  describe('smartPackTabs', () => {
    it('passes 3 tabs', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{ id: string; label: string }>

      expect(tabs).toHaveLength(3)
      expect(tabs.map((tab) => tab.id)).toEqual(['all', 'assigned', 'unassigned'])
      expect(tabs.map((tab) => tab.label)).toEqual(['All', 'Assigned', 'Unassigned'])
    })

    it('passes the correct filter parameters', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{
        id: string
        params: Record<string, unknown>
      }>

      expect(tabs.find((tab) => tab.id === 'all')?.params).toEqual({})

      expect(tabs.find((tab) => tab.id === 'assigned')?.params).toEqual({
        is_assigned: true,
      })

      expect(tabs.find((tab) => tab.id === 'unassigned')?.params).toEqual({
        is_assigned: false,
      })
    })
  })

  describe('smartPackHeadings', () => {
    it('passes seven column headings', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{ key: string }>

      expect(headings).toHaveLength(7)
      expect(headings.map((heading) => heading.key)).toEqual([
        'imei',
        'hardware_model',
        'firmware_version',
        'is_online',
        'assigned_to',
        'created',
        'actions',
      ])
    })

    it('marks hardware_model with the bold primary-text dataClass', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{ key: string; dataClass?: string }>

      const hardwareModel = headings.find((heading) => heading.key === 'hardware_model')

      expect(hardwareModel?.dataClass).toBe('primary-text font-bold')
    })

    it('formats is_online as Online or Offline', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        formatter?: (value: unknown) => unknown
      }>

      const isOnline = headings.find((heading) => heading.key === 'is_online')

      expect(isOnline?.formatter?.(true)).toBe('Online')
      expect(isOnline?.formatter?.(false)).toBe('Offline')
    })

    it('formats assigned_to using the assigned user full name', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        formatter?: (value: unknown) => unknown
      }>

      const assignedTo = headings.find((heading) => heading.key === 'assigned_to')

      expect(
        assignedTo?.formatter?.({
          id: 1,
          uuid: 'abc-123',
          full_name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+254712345678',
        }),
      ).toBe('Jane Doe')
      expect(assignedTo?.formatter?.(null)).toBe('Unassigned')
    })

    it('formats created using Filters.dateTime', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        formatter?: (value: unknown) => unknown
      }>

      const created = headings.find((heading) => heading.key === 'created')

      expect(created?.formatter?.('2026-09-23T14:30:00Z')).toEqual(expect.any(String))
      expect(created?.formatter?.(null)).toBe('')
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
        'imei',
        'hardware_model',
        'firmware_version',
        'is_online',
        'assigned_to',
        'created',
      ])
      expect(nonSortableKeys).toEqual(['actions'])
    })

    it('configures the actions column with a View action routing to smartpack-details', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        action?: { name: string; route: string }
      }>

      const actions = headings.find((heading) => heading.key === 'actions')

      expect(actions?.action).toEqual({ name: 'View', route: 'smartpack-details' })
    })
  })
})
