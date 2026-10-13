import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import GroupsView from '@/views/Groups/index.vue'
import GroupsTable from '@/components/Groups/Table.vue'
import GroupCreationForm from '@/components/Groups/CreationForm.vue'
import { verifyInvite, joinInvite } from '@/api/modules/groupMembers'
import { useGlobals } from '@/composables/useGlobals'
import { useRoute } from 'vue-router'
import type { VerifyInviteResponse } from '@/api/modules/groupMembers'

const mocks = vi.hoisted(() => ({
  query: { token: undefined as string | undefined },
  verifyInvite: vi.fn<(payload: { token: string }) => Promise<VerifyInviteResponse>>(),
  joinInvite: vi.fn<(payload: { token: string }) => Promise<unknown>>(),
  notifyError: vi.fn<(message: string) => void>(),
  notifySuccess: vi.fn<(message: string) => void>(),
  deleteModal:
    vi.fn<(title: string, message: string, options: { text: string }) => Promise<boolean>>(),
  routerPush: vi.fn<(location: { name: string; params?: { id: number } }) => Promise<void>>(),
}))

vi.mock('vue-router', () => ({
  useRoute: vi.fn<() => ReturnType<typeof useRoute>>(),
}))

vi.mock('@/api/modules/groupMembers', () => ({
  verifyInvite: mocks.verifyInvite,
  joinInvite: mocks.joinInvite,
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: vi.fn<() => ReturnType<typeof useGlobals>>(),
}))

const mockInvitation: VerifyInviteResponse = {
  id: 1,
  group: {
    id: 10,
    name: 'SmartPack Team',
  },
  email: 'john.doe@example.com',
  role: 'member',
  invited_by: {
    id: 2,
    uuid: '7b9f3c21-84d6-4a17-b2e8-51c7d9036f42',
    full_name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+254712345678',
  },
  expires_at: '2026-10-19T10:00:00Z',
  is_expired: false,
}

const mountGroupsView = () =>
  mount(GroupsView, {
    global: {
      stubs: {
        GroupsTable: true,
        GroupCreationForm: true,
      },
    },
  })

describe('GroupsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.query.token = undefined

    vi.mocked(useRoute).mockReturnValue({
      query: mocks.query,
    } as unknown as ReturnType<typeof useRoute>)

    vi.mocked(useGlobals).mockReturnValue({
      $notifyError: mocks.notifyError,
      $notifySuccess: mocks.notifySuccess,
      $deleteModal: mocks.deleteModal,
      $router: {
        push: mocks.routerPush,
      },
    } as unknown as ReturnType<typeof useGlobals>)
  })

  describe('rendering', () => {
    it('renders the Groups heading', () => {
      const wrapper = mountGroupsView()

      expect(wrapper.find('h2').text()).toBe('Groups')
    })

    it('renders the GroupsTable by default', () => {
      const wrapper = mountGroupsView()

      expect(wrapper.findComponent(GroupsTable).exists()).toBe(true)
      expect(wrapper.findComponent(GroupCreationForm).exists()).toBe(false)
    })

    it('renders the Add Group button by default', () => {
      const wrapper = mountGroupsView()
      const addButton = wrapper.findAll('button')[0]

      expect(addButton?.text()).toBe('Add Group')
      expect(addButton?.classes()).toContain('form-submit')
      expect(addButton?.classes()).not.toContain('hidden')
    })

    it('hides the Cancel button by default', () => {
      const wrapper = mountGroupsView()
      const cancelButton = wrapper.findAll('button')[1]

      expect(cancelButton?.text()).toBe('Cancel')
      expect(cancelButton?.classes()).toContain('hidden')
    })
  })

  describe('navigation to group creation', () => {
    it('shows the group creation form when Add Group is clicked', async () => {
      const wrapper = mountGroupsView()

      await wrapper.findAll('button')[0]!.trigger('click')

      expect(wrapper.findComponent(GroupCreationForm).exists()).toBe(true)
      expect(wrapper.findComponent(GroupsTable).exists()).toBe(false)
    })

    it('hides the Add Group button and shows the Cancel button', async () => {
      const wrapper = mountGroupsView()

      await wrapper.findAll('button')[0]!.trigger('click')

      const buttons = wrapper.findAll('button')
      const addButton = buttons[0]
      const cancelButton = buttons[1]

      expect(addButton?.classes()).toContain('hidden')
      expect(cancelButton?.classes()).toContain('form-submit')
      expect(cancelButton?.classes()).not.toContain('hidden')
    })
  })

  describe('navigation back to groups list', () => {
    it('shows the groups table when Cancel is clicked', async () => {
      const wrapper = mountGroupsView()

      await wrapper.findAll('button')[0]!.trigger('click')
      await wrapper.findAll('button')[1]!.trigger('click')

      expect(wrapper.findComponent(GroupsTable).exists()).toBe(true)
      expect(wrapper.findComponent(GroupCreationForm).exists()).toBe(false)
    })

    it('shows the Add Group button and hides the Cancel button', async () => {
      const wrapper = mountGroupsView()

      await wrapper.findAll('button')[0]!.trigger('click')
      await wrapper.findAll('button')[1]!.trigger('click')

      const buttons = wrapper.findAll('button')
      const addButton = buttons[0]
      const cancelButton = buttons[1]

      expect(addButton?.classes()).toContain('form-submit')
      expect(addButton?.classes()).not.toContain('hidden')
      expect(cancelButton?.classes()).toContain('hidden')
    })
  })

  describe('group invitation', () => {
    it('does not verify an invitation when the token is missing', async () => {
      mountGroupsView()

      await flushPromises()

      expect(verifyInvite).not.toHaveBeenCalled()
    })

    it('verifies an invitation and prompts the user to join the group', async () => {
      mocks.query.token = 'valid-token'
      mocks.verifyInvite.mockResolvedValueOnce(mockInvitation)
      mocks.deleteModal.mockResolvedValueOnce(false)

      mountGroupsView()

      await flushPromises()

      expect(verifyInvite).toHaveBeenCalledExactlyOnceWith({
        token: 'valid-token',
      })

      expect(mocks.deleteModal).toHaveBeenCalledExactlyOnceWith('Join Group', '', {
        text: 'Would you like to join the group "SmartPack Team"?',
      })

      expect(joinInvite).not.toHaveBeenCalled()
    })

    it('shows an error when invitation verification fails', async () => {
      mocks.query.token = 'invalid-token'
      mocks.verifyInvite.mockRejectedValueOnce(new Error('Invalid invitation token.'))

      mountGroupsView()

      await flushPromises()

      expect(mocks.notifyError).toHaveBeenCalledExactlyOnceWith('Invalid invitation token.')
      expect(mocks.deleteModal).not.toHaveBeenCalled()
      expect(joinInvite).not.toHaveBeenCalled()
    })

    it('shows an error when the invitation has expired', async () => {
      mocks.query.token = 'expired-token'
      mocks.verifyInvite.mockResolvedValueOnce({
        ...mockInvitation,
        is_expired: true,
      })

      mountGroupsView()

      await flushPromises()

      expect(mocks.notifyError).toHaveBeenCalledExactlyOnceWith(
        'This group invitation has expired.',
      )
      expect(mocks.deleteModal).not.toHaveBeenCalled()
      expect(joinInvite).not.toHaveBeenCalled()
    })

    it('joins the group and navigates to its details when confirmed', async () => {
      mocks.query.token = 'valid-token'
      mocks.verifyInvite.mockResolvedValueOnce(mockInvitation)
      mocks.deleteModal.mockResolvedValueOnce(true)
      mocks.joinInvite.mockResolvedValueOnce({})

      mountGroupsView()

      await flushPromises()

      expect(joinInvite).toHaveBeenCalledExactlyOnceWith({
        token: 'valid-token',
      })

      expect(mocks.notifySuccess).toHaveBeenCalledExactlyOnceWith(
        'You have successfully joined SmartPack Team.',
      )

      expect(mocks.routerPush).toHaveBeenCalledExactlyOnceWith({
        name: 'group-details',
        params: { id: 10 },
      })
    })

    it('shows an error when joining the group fails', async () => {
      mocks.query.token = 'valid-token'
      mocks.verifyInvite.mockResolvedValueOnce(mockInvitation)
      mocks.deleteModal.mockResolvedValueOnce(true)
      mocks.joinInvite.mockRejectedValueOnce(new Error('Unable to join group.'))

      mountGroupsView()

      await flushPromises()

      expect(mocks.notifyError).toHaveBeenCalledExactlyOnceWith('Unable to join group.')
      expect(mocks.routerPush).not.toHaveBeenCalled()
    })
  })
})
