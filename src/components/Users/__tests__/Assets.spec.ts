import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import SmartPacksTable from '@/components/Users/Assets.vue'
import TablePageLayout, { type Getter } from '@/components/Base/TablePageLayout.vue'
import Filters from '@/helpers/filters'

const mockSmartPacksList = vi.fn<Getter>()

type Heading = {
  key: string
  label?: string
  sortable?: boolean
  dataClass?: string | { fmt: (value: unknown) => unknown }
  formatter?: (value: unknown) => unknown
  action?: { name: string; route: string }
}

const mountTable = () =>
  mount(SmartPacksTable, {
    props: {
      userId: 1,
      userName: 'Jane Doe',
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

const getHeadings = (): Heading[] => {
  const wrapper = mountTable()
  const layout = wrapper.findComponent(TablePageLayout)

  return layout.props('itemHeadings') as Heading[]
}

const findHeading = (key: string): Heading | undefined =>
  getHeadings().find((heading) => heading.key === key)

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
        'SmartPacks assigned to Jane Doe, with their connectivity and firmware details.',
      )
      expect(layout.props('name')).toBe('SmartPacks')
      expect(layout.props('navClass')).toBe('grid-cols-1 lg:text-base')
      expect(layout.props('enableSearch')).toBe(true)
    })

    it('passes the smartpacks API getter', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)

      expect(layout.props('getter')).toBe(mockSmartPacksList)
    })
  })

  describe('smartPackTabs', () => {
    it('passes a single All tab', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{
        id: string
        caption: string
        label: string
      }>

      expect(tabs).toHaveLength(1)
      expect(tabs[0]).toMatchObject({
        id: 'all',
        caption: 'All SmartPacks',
        label: 'All',
      })
    })

    it('passes the user ID as a filter for the All tab', () => {
      const wrapper = mountTable()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{
        id: string
        params: Record<string, unknown>
      }>

      expect(tabs.find((tab) => tab.id === 'all')?.params).toEqual({
        assigned_to: 1,
      })
    })
  })

  describe('smartPackHeadings', () => {
    it('passes seven column headings', () => {
      const headings = getHeadings()

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

    it('uses the expected column labels', () => {
      expect(getHeadings().map((heading) => heading.label)).toEqual([
        'IMEI',
        'Hardware Model',
        'Firmware',
        'Status',
        'Assigned To',
        'Added',
        'Actions',
      ])
    })

    it('marks hardware_model with the bold primary-text dataClass', () => {
      expect(findHeading('hardware_model')?.dataClass).toBe('primary-text font-bold')
    })

    it('formats is_online as Online or Offline', () => {
      const isOnline = findHeading('is_online')

      expect(isOnline?.formatter?.(true)).toBe('Online')
      expect(isOnline?.formatter?.(false)).toBe('Offline')
    })

    it('styles is_online using Filters.activeClass', () => {
      const dataClass = findHeading('is_online')?.dataClass as {
        fmt: (value: unknown) => unknown
      }

      expect(dataClass.fmt(true)).toBe(Filters.activeClass(true))
      expect(dataClass.fmt(false)).toBe(Filters.activeClass(false))
      expect(dataClass.fmt(undefined)).toBe(Filters.activeClass(false))
    })

    it('formats assigned_to using the assigned user full name', () => {
      const assignedTo = findHeading('assigned_to')

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
      const created = findHeading('created')

      expect(created?.formatter?.('2026-09-23T14:30:00Z')).toBe(
        Filters.dateTime('2026-09-23T14:30:00Z'),
      )
      expect(created?.formatter?.(null)).toBe(Filters.dateTime(null))
    })

    it('marks all sortable columns except actions', () => {
      const headings = getHeadings()

      expect(headings.filter((heading) => heading.sortable).map((heading) => heading.key)).toEqual([
        'imei',
        'hardware_model',
        'firmware_version',
        'is_online',
        'assigned_to',
        'created',
      ])
      expect(headings.filter((heading) => !heading.sortable).map((heading) => heading.key)).toEqual(
        ['actions'],
      )
    })

    it('configures the actions column with a View action routing to smartpack-details', () => {
      expect(findHeading('actions')?.action).toEqual({
        name: 'View',
        route: 'smartpack-details',
      })
    })
  })
})
