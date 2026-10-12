import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Assets from '@/components/Groups/Assets.vue'
import TablePageLayout from '@/components/Base/TablePageLayout.vue'
import api from '@/api'

const mocks = vi.hoisted(() => ({
  groupMembersList: vi.fn<typeof api.groups.list>(),
  smartpacksList: vi.fn<typeof api.smartpacks.list>(),
}))

describe('GroupAssets', () => {
  const defaultProps = {
    groupId: 3,
    groupName: 'Family Group',
    refreshKey: '2026-10-12T08:00:00Z',
  }

  const mountAssets = async (props: Partial<typeof defaultProps> = {}) => {
    const wrapper = shallowMount(Assets, {
      props: {
        ...defaultProps,
        ...props,
      },
      global: {
        mocks: {
          $api: {
            groupMembers: {
              list: mocks.groupMembersList,
            },
            smartpacks: {
              list: mocks.smartpacksList,
            },
          },
        },
      },
    })

    await flushPromises()

    return wrapper
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the Assets heading', async () => {
      const wrapper = await mountAssets()

      expect(wrapper.find('h3').text()).toBe('Assets')
    })

    it('displays the Users table by default', async () => {
      const wrapper = await mountAssets()

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.exists()).toBe(true)
      expect(table.props('name')).toBe('Users')
      expect(table.props('getter')).toBe(mocks.groupMembersList)
    })

    it('displays the Show SmartPacks button by default', async () => {
      const wrapper = await mountAssets()

      expect(wrapper.find('button').text()).toBe('Show SmartPacks')
    })

    it('passes the group members table description', async () => {
      const wrapper = await mountAssets()

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.props('pageDescription')).toBe(
        'Members of Family Group, including their contact details and group roles.',
      )
    })

    it('passes the group ID to the member table filters', async () => {
      const wrapper = await mountAssets()

      const table = wrapper.findComponent(TablePageLayout)
      const tabs = table.props('tabs')

      expect(tabs).toEqual([
        {
          id: 'all',
          caption: 'All Group Members',
          label: 'All',
          params: {
            group: 3,
          },
        },
        {
          id: 'admins',
          caption: 'Group Admins',
          label: 'Admins',
          params: {
            group: 3,
            has_admin_access: true,
          },
        },
        {
          id: 'members',
          caption: 'Regular Group Members',
          label: 'Members',
          params: {
            group: 3,
            role: 'member',
          },
        },
      ])
    })

    it('passes the member table column headings', async () => {
      const wrapper = await mountAssets()

      const table = wrapper.findComponent(TablePageLayout)
      const headings = table.props('itemHeadings')

      expect(headings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'user.full_name',
            label: 'Full Name',
          }),
          expect.objectContaining({
            key: 'user.email',
            label: 'Email',
          }),
          expect.objectContaining({
            key: 'user.phone',
            label: 'Phone',
          }),
          expect.objectContaining({
            key: 'role',
            label: 'Group Role',
          }),
          expect.objectContaining({
            key: 'created',
            label: 'Date Added',
          }),
          expect.objectContaining({
            key: 'id',
            label: 'Actions',
            component: expect.any(Object),
          }),
        ]),
      )
    })

    it('passes the refresh key to the member table', async () => {
      const wrapper = await mountAssets()

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.props('refreshKey')).toBe(defaultProps.refreshKey)
    })

    it('enables search for the member table', async () => {
      const wrapper = await mountAssets()

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.props('enableSearch')).toBe(true)
    })

    it('uses the expected layout configuration for the member table', async () => {
      const wrapper = await mountAssets()

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.props('navClass')).toBe('grid-cols-3 lg:text-base')
    })
  })

  describe('switching between assets', () => {
    it('switches to the SmartPacks table when Show SmartPacks is clicked', async () => {
      const wrapper = await mountAssets()

      await wrapper.find('button').trigger('click')
      await flushPromises()

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.props('name')).toBe('SmartPacks')
      expect(table.props('getter')).toBe(mocks.smartpacksList)
    })

    it('displays the Show Users button on the SmartPacks page', async () => {
      const wrapper = await mountAssets()

      await wrapper.find('button').trigger('click')

      expect(wrapper.find('button').text()).toBe('Show Users')
    })

    it('switches back to the Users table when Show Users is clicked', async () => {
      const wrapper = await mountAssets()

      await wrapper.find('button').trigger('click')
      await flushPromises()

      await wrapper.find('button').trigger('click')
      await flushPromises()

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.props('name')).toBe('Users')
      expect(table.props('getter')).toBe(mocks.groupMembersList)
    })
  })

  describe('SmartPacks table', () => {
    it('passes the SmartPacks table description', async () => {
      const wrapper = await mountAssets()

      await wrapper.find('button').trigger('click')

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.props('pageDescription')).toBe(
        'SmartPacks assigned to Family Group, with their connectivity and firmware details.',
      )
    })

    it('filters SmartPacks by group ID', async () => {
      const wrapper = await mountAssets()

      await wrapper.find('button').trigger('click')

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.props('tabs')).toEqual([
        {
          id: 'all',
          caption: 'All Group SmartPacks',
          label: 'All',
          params: {
            group: 3,
          },
        },
      ])
    })

    it('passes the SmartPacks column headings', async () => {
      const wrapper = await mountAssets()

      await wrapper.find('button').trigger('click')

      const table = wrapper.findComponent(TablePageLayout)
      const headings = table.props('itemHeadings')

      expect(headings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'imei',
            label: 'IMEI',
          }),
          expect.objectContaining({
            key: 'firmware_version',
            label: 'Firmware',
          }),
          expect.objectContaining({
            key: 'is_online',
            label: 'Status',
          }),
          expect.objectContaining({
            key: 'child_name',
            label: 'Child',
          }),
          expect.objectContaining({
            key: 'created',
            label: 'Added',
          }),
          expect.objectContaining({
            key: 'actions',
            label: 'Actions',
          }),
        ]),
      )
    })

    it('passes the refresh key to the SmartPacks table', async () => {
      const wrapper = await mountAssets()

      await wrapper.find('button').trigger('click')

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.props('refreshKey')).toBe(defaultProps.refreshKey)
    })

    it('enables search for the SmartPacks table', async () => {
      const wrapper = await mountAssets()

      await wrapper.find('button').trigger('click')

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.props('enableSearch')).toBe(true)
    })

    it('uses the expected layout configuration for the SmartPacks table', async () => {
      const wrapper = await mountAssets()

      await wrapper.find('button').trigger('click')

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.props('navClass')).toBe('grid-cols-1 lg:text-base')
    })
  })

  describe('props', () => {
    it('uses the supplied group name in the member description', async () => {
      const wrapper = await mountAssets({
        groupName: 'School Group',
      })

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.props('pageDescription')).toBe(
        'Members of School Group, including their contact details and group roles.',
      )
    })

    it('uses the supplied group ID in the member filters', async () => {
      const wrapper = await mountAssets({
        groupId: 12,
      })

      const table = wrapper.findComponent(TablePageLayout)
      const tabs = table.props('tabs') as Array<{
        params: Record<string, unknown>
      }>

      expect(tabs.every((tab) => tab.params.group === 12)).toBe(true)
    })

    it('uses the supplied group name in the SmartPacks description', async () => {
      const wrapper = await mountAssets({
        groupName: 'Class Eight',
      })

      await wrapper.find('button').trigger('click')

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.props('pageDescription')).toBe(
        'SmartPacks assigned to Class Eight, with their connectivity and firmware details.',
      )
    })

    it('updates the member table when the refresh key changes', async () => {
      const wrapper = await mountAssets()

      await wrapper.setProps({
        refreshKey: '2026-10-12T09:00:00Z',
      })

      const table = wrapper.findComponent(TablePageLayout)

      expect(table.props('refreshKey')).toBe('2026-10-12T09:00:00Z')
    })
  })

  describe('empty group', () => {
    it('does not render the member table when group ID is zero', async () => {
      const wrapper = await mountAssets({
        groupId: 0,
      })

      expect(wrapper.findComponent(TablePageLayout).exists()).toBe(false)
    })

    it('does not render the SmartPacks table when group ID is zero', async () => {
      const wrapper = await mountAssets({
        groupId: 0,
      })

      await wrapper.find('button').trigger('click')

      expect(wrapper.findComponent(TablePageLayout).exists()).toBe(false)
    })

    it('uses the default group ID when it is omitted', async () => {
      const wrapper = shallowMount(Assets, {
        props: {
          groupId: 0,
          groupName: 'Family Group',
        },
        global: {
          mocks: {
            $api: {
              groupMembers: {
                list: mocks.groupMembersList,
              },
              smartpacks: {
                list: mocks.smartpacksList,
              },
            },
          },
        },
      })

      await flushPromises()

      expect(wrapper.findComponent(TablePageLayout).exists()).toBe(false)
    })
  })
})
