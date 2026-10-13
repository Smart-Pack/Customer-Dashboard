import { defineComponent, h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MembersActions from '../MembersActions.vue'
import UpdateRoleModal from '../UpdateRoleModal.vue'
import { removeGroupMember } from '@/api/modules/groupMembers'
import { useGlobals } from '@/composables/useGlobals'
import { useAuthStore } from '@/stores/modules/auth'
import { mockGroupMembers } from '@/tests/constants'

const { mockUserId } = vi.hoisted(() => ({
  mockUserId: { value: 1 },
}))

vi.mock('@/api/modules/groupMembers', () => ({
  removeGroupMember: vi.fn<typeof import('@/api/modules/groupMembers').removeGroupMember>(),
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: vi.fn<typeof import('@/composables/useGlobals').useGlobals>(),
}))

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: vi.fn<() => { userId: number }>(),
}))

const mockDeleteModal =
  vi.fn<(title: string, message: string, options: { text: string }) => Promise<boolean>>()

const mockNotifySuccess = vi.fn<(message: string) => void>()
const mockNotifyError = vi.fn<(message: string) => void>()

/**
 * Stub the role modal to test its parent event handling independently.
 */
const UpdateRoleModalStub = defineComponent({
  name: 'UpdateRoleModal',

  props: {
    groupMember: {
      type: Object,
      required: true,
    },
  },

  emits: ['close', 'success', 'refresh'],

  setup(_, { emit }) {
    return () =>
      h('div', { 'data-testid': 'role-modal' }, [
        h(
          'button',
          {
            type: 'button',
            'data-testid': 'modal-close',
            onClick: () => emit('close'),
          },
          'Close Modal',
        ),
        h(
          'button',
          {
            type: 'button',
            'data-testid': 'modal-success',
            onClick: () => emit('success'),
          },
          'Role Updated',
        ),
        h(
          'button',
          {
            type: 'button',
            'data-testid': 'modal-refresh',
            onClick: () => emit('refresh'),
          },
          'Refresh Modal',
        ),
      ])
  },
})

const mockGroupMember = mockGroupMembers[1]!

const mountComponent = () =>
  mount(MembersActions, {
    props: { item: mockGroupMember },
    global: {
      stubs: { UpdateRoleModal: UpdateRoleModalStub },
    },
  })

describe('MembersActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUserId.value = 1

    vi.mocked(useAuthStore).mockReturnValue({
      userId: mockGroupMember.user.id,
    } as unknown as ReturnType<typeof useAuthStore>)

    vi.mocked(useGlobals).mockReturnValue({
      $deleteModal: mockDeleteModal,
      $notifySuccess: mockNotifySuccess,
      $notifyError: mockNotifyError,
    } as unknown as ReturnType<typeof useGlobals>)

    vi.mocked(useAuthStore).mockReturnValue({
      userId: mockUserId.value,
    } as unknown as ReturnType<typeof useAuthStore>)
  })

  describe('button visibility', () => {
    it('renders Change Role and Delete for another non-owner member', () => {
      const wrapper = mountComponent()

      expect(wrapper.text()).toContain('Change Role')
      expect(wrapper.text()).toContain('Delete')
    })

    it('hides both actions when the current user is the group member', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        userId: mockGroupMember.user.id,
      } as unknown as ReturnType<typeof useAuthStore>)

      const wrapper = mountComponent()

      expect(wrapper.text()).not.toContain('Change Role')
      expect(wrapper.text()).not.toContain('Delete')
    })

    it('hides both actions for an owner', () => {
      const owner = mockGroupMembers[0]!

      const wrapper = mount(MembersActions, {
        props: {
          item: owner,
        },
        global: {
          stubs: {
            UpdateRoleModal: UpdateRoleModalStub,
          },
        },
      })

      expect(wrapper.text()).not.toContain('Change Role')
      expect(wrapper.text()).not.toContain('Delete')
    })
  })

  describe('role modal', () => {
    it('opens the role modal when Change Role is clicked', async () => {
      const wrapper = mountComponent()

      expect(wrapper.find('[data-testid="role-modal"]').exists()).toBe(false)

      await wrapper.get('button').trigger('click')

      expect(wrapper.find('[data-testid="role-modal"]').exists()).toBe(true)
    })

    it('passes the selected group member to the role modal', async () => {
      const wrapper = mountComponent()

      await wrapper.get('button').trigger('click')

      const modal = wrapper.findComponent(UpdateRoleModal)

      expect(modal.exists()).toBe(true)
      expect(modal.props('groupMember')).toEqual(mockGroupMember)
    })

    it('closes the role modal when close is emitted', async () => {
      const wrapper = mountComponent()

      await wrapper.get('button').trigger('click')
      await wrapper.get('[data-testid="modal-close"]').trigger('click')

      expect(wrapper.find('[data-testid="role-modal"]').exists()).toBe(false)
    })

    it('closes the modal and emits refresh after a successful role update', async () => {
      const wrapper = mountComponent()

      await wrapper.get('button').trigger('click')
      await wrapper.get('[data-testid="modal-success"]').trigger('click')

      expect(wrapper.find('[data-testid="role-modal"]').exists()).toBe(false)
      expect(wrapper.emitted('refresh')).toHaveLength(1)
    })

    it('closes the modal and emits refresh when the modal requests a refresh', async () => {
      const wrapper = mountComponent()

      await wrapper.get('button').trigger('click')
      await wrapper.get('[data-testid="modal-refresh"]').trigger('click')

      expect(wrapper.find('[data-testid="role-modal"]').exists()).toBe(false)
      expect(wrapper.emitted('refresh')).toHaveLength(1)
    })
  })

  describe('member deletion', () => {
    it('opens the confirmation dialog with the member name', async () => {
      mockDeleteModal.mockResolvedValueOnce(false)

      const wrapper = mountComponent()

      await wrapper.get('button:nth-of-type(2)').trigger('click')
      await flushPromises()

      expect(mockDeleteModal).toHaveBeenCalledExactlyOnceWith('Remove Group Member', '', {
        text: 'Are you sure you want to remove Jane Doe from this group?',
      })

      expect(removeGroupMember).not.toHaveBeenCalled()
    })

    it('does not delete the member when deletion is cancelled', async () => {
      mockDeleteModal.mockResolvedValueOnce(false)

      const wrapper = mountComponent()

      await wrapper.get('button:nth-of-type(2)').trigger('click')
      await flushPromises()

      expect(removeGroupMember).not.toHaveBeenCalled()
      expect(mockNotifySuccess).not.toHaveBeenCalled()
      expect(wrapper.emitted('refresh')).toBeUndefined()
    })

    it('deletes the member after confirmation', async () => {
      mockDeleteModal.mockResolvedValueOnce(true)
      vi.mocked(removeGroupMember).mockResolvedValueOnce('Group member removed successfully.')

      const wrapper = mountComponent()

      await wrapper.get('button:nth-of-type(2)').trigger('click')
      await flushPromises()

      expect(removeGroupMember).toHaveBeenCalledExactlyOnceWith(mockGroupMember.id)

      expect(mockNotifySuccess).toHaveBeenCalledExactlyOnceWith(
        'Group member removed successfully.',
      )

      expect(wrapper.emitted('refresh')).toHaveLength(1)
      expect(mockNotifyError).not.toHaveBeenCalled()
    })

    it('displays an error when deletion fails', async () => {
      mockDeleteModal.mockResolvedValueOnce(true)

      vi.mocked(removeGroupMember).mockRejectedValueOnce(new Error('Failed to remove group member'))

      const wrapper = mountComponent()

      await wrapper.get('button:nth-of-type(2)').trigger('click')
      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledExactlyOnceWith('Failed to remove group member')

      expect(wrapper.emitted('refresh')).toBeUndefined()
    })

    it('displays a fallback error for non-Error values', async () => {
      mockDeleteModal.mockResolvedValueOnce(true)

      vi.mocked(removeGroupMember).mockRejectedValueOnce('Unexpected failure')

      const wrapper = mountComponent()

      await wrapper.get('button:nth-of-type(2)').trigger('click')
      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledExactlyOnceWith('Failed to remove the group member.')
    })

    it('displays an error when the confirmation dialog fails', async () => {
      mockDeleteModal.mockRejectedValueOnce(new Error('Confirmation failed'))

      const wrapper = mountComponent()

      await wrapper.get('button:nth-of-type(2)').trigger('click')
      await flushPromises()

      expect(removeGroupMember).not.toHaveBeenCalled()

      expect(mockNotifyError).toHaveBeenCalledExactlyOnceWith('Confirmation failed')
    })
  })
})
