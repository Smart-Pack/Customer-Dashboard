import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import GroupDetails from '@/views/Groups/details.vue'
import GroupUpdateForm from '@/components/Groups/UpdateForm.vue'
import GroupAssets from '@/components/Groups/Assets.vue'
import SendInviteModal from '@/components/Groups/SendInviteModal.vue'

import type { GroupDetail } from '@/api/modules/groups'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type GroupIdParams = {
  id: string
}

type RouterLocation = {
  name: string
}

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  getById: vi.fn<(params: GroupIdParams) => Promise<GroupDetail>>(),
  remove: vi.fn<(groupId: number) => Promise<string>>(),

  deleteModal: vi.fn<(title: string, message: string) => Promise<boolean>>(),

  notifySuccess: vi.fn<(message: string) => void>(),
  notifyError: vi.fn<(message: string) => void>(),

  routerPush: vi.fn<(location: RouterLocation) => Promise<unknown>>(),

  dateTime: vi.fn<(value: string) => string>(),

  isGroupAdmin: vi.fn<(groupId: number) => boolean>(),
  isGroupOwner: vi.fn<(groupId: number) => boolean>(),
}))

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => ({
    isGroupAdmin: mocks.isGroupAdmin,
    isGroupOwner: mocks.isGroupOwner,
  }),
}))

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

const mockGroup = {
  id: 7,
  name: 'Family Group',
  created: '2026-10-01T08:00:00Z',
  updated: '2026-10-10T08:00:00Z',
  members: [
    {
      id: 1,
      role: 'owner',
      user: {
        id: 10,
        full_name: 'Trevor Muriuki',
      },
    },
    {
      id: 2,
      role: 'admin',
      user: {
        id: 11,
        full_name: 'Jane Doe',
      },
    },
    {
      id: 3,
      role: 'member',
      user: {
        id: 12,
        full_name: 'John Doe',
      },
    },
  ],
  smartpacks: [
    {
      id: 101,
      hardware_model: 'SmartPack V1',
    },
  ],
} as unknown as GroupDetail

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const mountGroupDetails = async (routeId = '7'): Promise<VueWrapper> => {
  const wrapper = shallowMount(GroupDetails, {
    global: {
      mocks: {
        $pinia: {}, // Add this
        $api: {
          groups: {
            getById: mocks.getById,
            remove: mocks.remove,
          },
        },
        $notifySuccess: mocks.notifySuccess,
        $notifyError: mocks.notifyError,
        $deleteModal: mocks.deleteModal,
        $router: {
          push: mocks.routerPush,
        },
        $route: {
          params: {
            id: routeId,
          },
        },
        $filters: {
          dateTime: mocks.dateTime,
        },
      },
      stubs: {
        RouterLink: true,
      },
    },
  })

  await flushPromises()

  return wrapper
}

const clickButton = async (wrapper: VueWrapper, label: string): Promise<void> => {
  const button = wrapper.findAll('button').find((candidate) => candidate.text().trim() === label)

  if (!button) {
    throw new Error(`Button "${label}" was not found`)
  }

  await button.trigger('click')
  await flushPromises()
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('GroupDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getById.mockResolvedValue(mockGroup)
    mocks.remove.mockResolvedValue('Group deleted successfully.')
    mocks.deleteModal.mockResolvedValue(true)
    mocks.routerPush.mockResolvedValue(undefined)

    mocks.dateTime.mockImplementation((value) => `Formatted: ${value}`)

    mocks.isGroupAdmin.mockReturnValue(true)
    mocks.isGroupOwner.mockReturnValue(true)
  })

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('rendering', () => {
    it('renders the group details', async () => {
      const wrapper = await mountGroupDetails()

      expect(wrapper.text()).toContain('Family Group')
      expect(wrapper.text()).toContain('Details')
      expect(wrapper.text()).toContain('Group Name')
      expect(wrapper.text()).toContain('Owner')
      expect(wrapper.text()).toContain('Created')
    })

    it('displays the group owner', async () => {
      const wrapper = await mountGroupDetails()

      expect(wrapper.text()).toContain('Trevor Muriuki')
    })

    it('displays the total number of users', async () => {
      const wrapper = await mountGroupDetails()

      expect(wrapper.text()).toContain('3')
      expect(wrapper.text()).toContain('Users')
    })

    it('uses the singular User label when there is one member', async () => {
      mocks.getById.mockResolvedValueOnce({
        ...mockGroup,
        members: [mockGroup.members![0]],
      } as GroupDetail)

      const wrapper = await mountGroupDetails()

      expect(wrapper.text()).toContain('1')
      expect(wrapper.text()).toContain('User')
      expect(wrapper.text()).not.toContain('1 Users')
    })

    it('displays the total number of SmartPacks', async () => {
      const wrapper = await mountGroupDetails()

      expect(wrapper.text()).toContain('1')
      expect(wrapper.text()).toContain('SmartPack')
    })

    it('formats the group creation timestamp', async () => {
      const wrapper = await mountGroupDetails()

      expect(mocks.dateTime).toHaveBeenCalledExactlyOnceWith(mockGroup.created!)

      expect(wrapper.text()).toContain(`Formatted: ${mockGroup.created}`)
    })

    it('displays a placeholder when no owner is assigned', async () => {
      mocks.getById.mockResolvedValueOnce({
        ...mockGroup,
        members: mockGroup.members!.filter((member) => member.role !== 'owner'),
      } as GroupDetail)

      const wrapper = await mountGroupDetails()

      expect(wrapper.text()).toContain('No owner assigned')
    })

    it('displays a fallback group name when the name is empty', async () => {
      mocks.getById.mockResolvedValueOnce({
        ...mockGroup,
        name: '',
      } as GroupDetail)

      const wrapper = await mountGroupDetails()

      expect(wrapper.text()).toContain('Group')
    })

    it('renders the group assets component', async () => {
      const wrapper = await mountGroupDetails()

      const assets = wrapper.findComponent(GroupAssets)

      expect(assets.exists()).toBe(true)
      expect(assets.props('groupId')).toBe(mockGroup.id)
      expect(assets.props('groupName')).toBe(mockGroup.name)
      expect(assets.props('refreshKey')).toBe(mockGroup.updated)
    })
  })

  // ---------------------------------------------------------------------------
  // Fetching group details
  // ---------------------------------------------------------------------------

  describe('getGroup', () => {
    it('fetches group details using the route ID', async () => {
      await mountGroupDetails('25')

      expect(mocks.getById).toHaveBeenCalledExactlyOnceWith({
        id: '25',
      })
    })

    it('shows an error notification when fetching fails', async () => {
      mocks.getById.mockRejectedValueOnce(new Error('Failed to load group'))

      await mountGroupDetails()

      expect(mocks.notifyError).toHaveBeenCalledExactlyOnceWith('Failed to load group')
    })

    it('redirects to the groups list when the error requires a reload', async () => {
      mocks.getById.mockRejectedValueOnce(
        Object.assign(new Error('Group not found'), {
          reload: true,
        }),
      )

      await mountGroupDetails()

      expect(mocks.routerPush).toHaveBeenCalledExactlyOnceWith({
        name: 'groups',
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------------------------

  describe('permissions', () => {
    it('shows Update and Send Invite to group administrators', async () => {
      mocks.isGroupAdmin.mockReturnValue(true)

      const wrapper = await mountGroupDetails()

      expect(wrapper.text()).toContain('Update')
      expect(wrapper.text()).toContain('Send Invite')
    })

    it('shows Delete to the group owner', async () => {
      mocks.isGroupOwner.mockReturnValue(true)

      const wrapper = await mountGroupDetails()

      expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Delete')).toBe(
        true,
      )
    })

    it('hides Delete from non-owners', async () => {
      mocks.isGroupOwner.mockReturnValue(false)

      const wrapper = await mountGroupDetails()

      expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Delete')).toBe(
        false,
      )
    })

    it('hides the actions section from users who are not group administrators', async () => {
      mocks.isGroupAdmin.mockReturnValue(false)

      const wrapper = await mountGroupDetails()

      expect(
        wrapper
          .findAll('button')
          .some((button) => ['Update', 'Send Invite', 'Delete'].includes(button.text().trim())),
      ).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Updating a group
  // ---------------------------------------------------------------------------

  describe('group updates', () => {
    it('opens the update form when Update is clicked', async () => {
      const wrapper = await mountGroupDetails()

      await clickButton(wrapper, 'Update')

      expect(wrapper.findComponent(GroupUpdateForm).exists()).toBe(true)
      expect(wrapper.text()).toContain('Group')
    })

    it('passes the current group to the update form', async () => {
      const wrapper = await mountGroupDetails()

      await clickButton(wrapper, 'Update')

      expect(wrapper.findComponent(GroupUpdateForm).props('initialValues')).toEqual(mockGroup)
    })

    it('returns to the details page when Cancel is clicked', async () => {
      const wrapper = await mountGroupDetails()

      await clickButton(wrapper, 'Update')
      await clickButton(wrapper, 'Cancel')

      expect(wrapper.findComponent(GroupUpdateForm).exists()).toBe(false)
      expect(wrapper.text()).toContain('Details')
    })

    it('refreshes group details when the update form requests a refresh', async () => {
      const wrapper = await mountGroupDetails()

      await clickButton(wrapper, 'Update')

      wrapper.findComponent(GroupUpdateForm).vm.$emit('close', 'showDetails', true)

      await flushPromises()

      expect(mocks.getById).toHaveBeenCalledTimes(2)
    })
  })

  // ---------------------------------------------------------------------------
  // Deleting a group
  // ---------------------------------------------------------------------------

  describe('group deletion', () => {
    it('requests confirmation before deleting the group', async () => {
      const wrapper = await mountGroupDetails()

      await clickButton(wrapper, 'Delete')

      expect(mocks.deleteModal).toHaveBeenCalledExactlyOnceWith('Delete Group', '"Family Group"?')
    })

    it('does not delete the group when confirmation is cancelled', async () => {
      mocks.deleteModal.mockResolvedValueOnce(false)

      const wrapper = await mountGroupDetails()

      await clickButton(wrapper, 'Delete')

      expect(mocks.remove).not.toHaveBeenCalled()
      expect(mocks.routerPush).not.toHaveBeenCalled()
    })

    it('deletes the group after confirmation', async () => {
      const wrapper = await mountGroupDetails()

      await clickButton(wrapper, 'Delete')

      expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(mockGroup.id)
    })

    it('shows a success notification after deletion', async () => {
      const wrapper = await mountGroupDetails()

      await clickButton(wrapper, 'Delete')

      expect(mocks.notifySuccess).toHaveBeenCalledExactlyOnceWith('Group deleted successfully.')
    })

    it('redirects to the groups list after deletion', async () => {
      const wrapper = await mountGroupDetails()

      await clickButton(wrapper, 'Delete')

      expect(mocks.routerPush).toHaveBeenCalledExactlyOnceWith({
        name: 'groups',
      })
    })

    it('shows an error notification when deletion fails', async () => {
      mocks.remove.mockRejectedValueOnce(new Error('Failed to delete group'))

      const wrapper = await mountGroupDetails()

      await clickButton(wrapper, 'Delete')

      expect(mocks.notifyError).toHaveBeenCalledExactlyOnceWith('Failed to delete group')
    })

    it('redirects when deletion fails and the error requires a reload', async () => {
      mocks.remove.mockRejectedValueOnce(
        Object.assign(new Error('Group not found'), {
          reload: true,
        }),
      )

      const wrapper = await mountGroupDetails()

      await clickButton(wrapper, 'Delete')

      expect(mocks.routerPush).toHaveBeenCalledExactlyOnceWith({
        name: 'groups',
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Group invitations
  // ---------------------------------------------------------------------------

  describe('group invitations', () => {
    it('opens the invitation modal when Send Invite is clicked', async () => {
      const wrapper = await mountGroupDetails()

      await clickButton(wrapper, 'Send Invite')

      const modal = wrapper.findComponent(SendInviteModal)

      expect(modal.exists()).toBe(true)
      expect(modal.props('groupId')).toBe(mockGroup.id)
    })

    it('closes the invitation modal when it emits close', async () => {
      const wrapper = await mountGroupDetails()

      await clickButton(wrapper, 'Send Invite')

      wrapper.findComponent(SendInviteModal).vm.$emit('close')

      await flushPromises()

      expect(wrapper.findComponent(SendInviteModal).exists()).toBe(false)
    })

    it('refreshes group details after an invitation succeeds', async () => {
      const wrapper = await mountGroupDetails()

      await clickButton(wrapper, 'Send Invite')

      wrapper.findComponent(SendInviteModal).vm.$emit('success')

      await flushPromises()

      expect(wrapper.findComponent(SendInviteModal).exists()).toBe(false)
      expect(mocks.getById).toHaveBeenCalledTimes(2)
    })
  })

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  describe('loading state', () => {
    it('disables the action buttons while submitting', async () => {
      const wrapper = await mountGroupDetails()

      ;(wrapper.vm.$data as { submitting: boolean }).submitting = true

      await flushPromises()

      const updateButton = wrapper
        .findAll('button')
        .find((button) => button.text().trim() === 'Update')

      const inviteButton = wrapper
        .findAll('button')
        .find((button) => button.text().trim() === 'Send Invite')

      const deleteButton = wrapper
        .findAll('button')
        .find((button) => button.text().trim() === 'Delete')

      expect(updateButton).toBeDefined()
      expect(inviteButton).toBeDefined()
      expect(deleteButton).toBeDefined()

      if (!updateButton || !inviteButton || !deleteButton) {
        throw new Error('Expected all group action buttons to exist')
      }

      expect((updateButton.element as HTMLButtonElement).disabled).toBe(true)
      expect((inviteButton.element as HTMLButtonElement).disabled).toBe(true)
      expect((deleteButton.element as HTMLButtonElement).disabled).toBe(true)
    })
  })
})
