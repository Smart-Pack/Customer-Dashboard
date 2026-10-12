import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import SmartPacksTable from '@/components/Smartpacks/Table.vue'
import TablePageLayout, { type Getter } from '@/components/Base/TablePageLayout.vue'

const mockSmartPacksList = vi.fn<Getter>()

const mountTable = (refreshKey = 0) =>
  mount(SmartPacksTable, {
    props: {
      refreshKey,
    },
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

      expect(layout.props('pageDescription')).toContain(
        'Monitor your SmartPacks, track their connectivity and assignment status, and manage their group associations.',
      )
      expect(layout.props('name')).toBe('SmartPacks')
      expect(layout.props('navClass')).toBe('grid-cols-3 lg:text-base')
      expect(layout.props('enableSearch')).toBe(true)
    })

    it('passes the SmartPacks API getter', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)

      expect(layout.props('getter')).toBe(mockSmartPacksList)
    })

    it('passes the refresh key through', () => {
      const wrapper = mountTable(3)
      const layout = wrapper.findComponent(TablePageLayout)

      expect(layout.props('refreshKey')).toBe(3)
    })
  })

  describe('smartPackTabs', () => {
    it('passes three tabs', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{ id: string; label: string }>

      expect(tabs).toHaveLength(3)
      expect(tabs.map((tab) => tab.id)).toEqual(['all', 'grouped', 'ungrouped'])
      expect(tabs.map((tab) => tab.label)).toEqual(['All', 'Grouped', 'Ungrouped'])
    })

    it('passes the correct filter parameters', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{
        id: string
        params: Record<string, unknown>
      }>

      expect(tabs.find((tab) => tab.id === 'all')?.params).toEqual({})

      expect(tabs.find((tab) => tab.id === 'grouped')?.params).toEqual({
        has_group: true,
      })

      expect(tabs.find((tab) => tab.id === 'ungrouped')?.params).toEqual({
        has_group: false,
      })
    })

    it('provides the correct captions for each tab', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{ id: string; caption: string }>

      expect(tabs.find((tab) => tab.id === 'all')?.caption).toBe('All SmartPacks')
      expect(tabs.find((tab) => tab.id === 'grouped')?.caption).toBe('SmartPacks with Groups')
      expect(tabs.find((tab) => tab.id === 'ungrouped')?.caption).toBe('SmartPacks without Groups')
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
        'firmware_version',
        'is_online',
        'group',
        'child_name',
        'created',
        'actions',
      ])
    })

    it('marks imei with the bold primary-text dataClass', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        dataClass?: string
      }>

      const imei = headings.find((heading) => heading.key === 'imei')

      expect(imei?.dataClass).toBe('primary-text font-bold')
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

    it('formats group as its name or a dash when no group is assigned', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        formatter?: (value: unknown) => unknown
      }>

      const group = headings.find((heading) => heading.key === 'group')

      expect(group?.formatter?.({ id: 1, name: 'SmartPack Family' })).toBe('SmartPack Family')
      expect(group?.formatter?.(null)).toBe('-')
    })

    it('configures group as a sortable column', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        sortable: boolean
      }>

      const group = headings.find((heading) => heading.key === 'group')

      expect(group?.sortable).toBe(true)
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
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        sortable: boolean
      }>

      const sortableKeys = headings
        .filter((heading) => heading.sortable)
        .map((heading) => heading.key)

      const nonSortableKeys = headings
        .filter((heading) => !heading.sortable)
        .map((heading) => heading.key)

      expect(sortableKeys).toEqual([
        'imei',
        'firmware_version',
        'is_online',
        'group',
        'child_name',
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

      expect(actions?.action).toEqual({
        name: 'View',
        route: 'smartpack-details',
      })
    })
  })
})
