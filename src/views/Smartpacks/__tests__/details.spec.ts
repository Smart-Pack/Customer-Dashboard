import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import SmartPackDetails from '@/views/Smartpacks/details.vue'
import AssignUser from '@/components/Smartpacks/AssignUser.vue'
import { mockUser } from '@/tests/constants'
import type { SmartPack } from '@/api/modules/smartpacks'
import type { User } from '@/api/modules/users'
import SmartPackQrComponent from '@/components/Smartpacks/QrCode.vue'

const mockGetById = vi.fn<(params: { id: string }) => Promise<SmartPack>>()
const mockAssign =
  vi.fn<(id: string | number, payload: { assigned_to: number }) => Promise<string>>()
const mockUnassign = vi.fn<(id: string | number) => Promise<string>>()
const mockNotifyError = vi.fn<(message: string) => void>()
const mockNotifySuccess = vi.fn<(message: string) => void>()
const mockDeleteModal = vi.fn<(action: string, name: string) => Promise<boolean>>()
const mockRouterPush = vi.fn<(location: { name: string }) => void>()

const mockAuthStore = {
  isAdmin: true,
}

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

const mockFilters = {
  dateTime: (value: string) => `dateTime(${value})`,
  activeClass: (isOnline: boolean) => (isOnline ? 'is-online' : 'is-offline'),
}

const mockSmartPack: SmartPack = {
  id: 1,
  device_uid: 'SP-0001',
  hardware_model: 'SP-X1',
  imei: '490154203237518',
  firmware_version: '1.4.2',
  last_seen: '2026-09-23T14:30:00Z',
  is_online: true,
  assigned_to: null,
  child_name: 'Amara',
  created: '2026-01-05T09:00:00.000Z',
  updated: '2026-09-23T14:30:00Z',
}

const mountView = () =>
  mount(SmartPackDetails, {
    global: {
      mocks: {
        $api: {
          smartpacks: {
            getById: mockGetById,
            assign: mockAssign,
            unassign: mockUnassign,
          },
        },
        $pinia: {},
        $filters: mockFilters,
        $notifyError: mockNotifyError,
        $notifySuccess: mockNotifySuccess,
        $deleteModal: mockDeleteModal,
        $route: {
          params: { id: mockSmartPack.id.toString() },
        },
        $router: {
          push: mockRouterPush,
        },
      },
      stubs: {
        AssignUser: true,
        SmartPackQrComponent: true,
        RouterLink: {
          name: 'RouterLink',
          props: ['to'],
          template: '<a><slot /></a>',
        },
      },
    },
  })

describe('SmartPackDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthStore.isAdmin = true
    mockGetById.mockResolvedValue(mockSmartPack)
  })

  describe('fetching the smartpack', () => {
    it('fetches the smartpack by route id on mount', async () => {
      mountView()
      await flushPromises()

      expect(mockGetById).toHaveBeenCalledWith({ id: mockSmartPack.id.toString() })
    })

    it('renders the fetched smartpack details', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain(mockSmartPack.hardware_model)
      expect(wrapper.text()).toContain(mockSmartPack.imei)
      expect(wrapper.text()).toContain(mockSmartPack.firmware_version)
    })

    it('notifies and redirects to smartpacks list when fetch fails with a reload error', async () => {
      mockGetById.mockRejectedValueOnce({ message: 'SmartPack not found', reload: true })

      mountView()
      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('SmartPack not found')
      expect(mockRouterPush).toHaveBeenCalledWith({ name: 'smartpacks' })
    })

    it('notifies without redirecting when fetch fails without a reload flag', async () => {
      mockGetById.mockRejectedValueOnce({ message: 'Server error', reload: false })

      mountView()
      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Server error')
      expect(mockRouterPush).not.toHaveBeenCalled()
    })
  })

  describe('connection status', () => {
    it('shows Online when the smartpack is online', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockSmartPack, is_online: true })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('Online')
    })

    it('shows Offline when the smartpack is not online', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockSmartPack, is_online: false })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('Offline')
    })
  })

  describe('assigned_to rendering', () => {
    it('shows an em dash when unassigned', async () => {
      mockGetById.mockResolvedValueOnce({
        ...mockSmartPack,
        assigned_to: null,
      })

      const wrapper = mountView()
      await flushPromises()

      const assignedUser = wrapper.find('[title="Assigned User"]')

      expect(assignedUser.exists()).toBe(true)
      expect(assignedUser.text().trim()).toBe('—')
    })

    it("shows the assigned user's full name as a link when assigned", async () => {
      mockGetById.mockResolvedValueOnce({
        ...mockSmartPack,
        assigned_to: {
          id: mockUser.id,
          uuid: mockUser.unique_id,
          full_name: mockUser.full_name,
          email: mockUser.email,
          phone: mockUser.phone,
        },
      })

      const wrapper = mountView()
      await flushPromises()

      const assignedUser = wrapper.find('[title="Assigned User"]')
      const link = assignedUser.findComponent({ name: 'RouterLink' })

      expect(assignedUser.exists()).toBe(true)
      expect(assignedUser.text()).toContain(mockUser.full_name)
      expect(link.exists()).toBe(true)
      expect(link.props('to')).toEqual({
        name: 'user-details',
        params: { id: mockUser.id },
      })
    })
  })

  describe('admin actions', () => {
    it('shows Assign User when unassigned and the user is an admin', async () => {
      mockAuthStore.isAdmin = true
      mockGetById.mockResolvedValueOnce({ ...mockSmartPack, assigned_to: null })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('.form-submit').exists()).toBe(true)
      expect(wrapper.find('.form-submit').text()).toBe('Assign User')
      expect(wrapper.find('.error-btn').exists()).toBe(false)
    })

    it('shows Unassign User when assigned and the user is an admin', async () => {
      mockAuthStore.isAdmin = true
      mockGetById.mockResolvedValueOnce({
        ...mockSmartPack,
        assigned_to: {
          id: mockUser.id,
          uuid: mockUser.unique_id,
          full_name: mockUser.full_name,
          email: mockUser.email,
          phone: mockUser.phone,
        },
      })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('.error-btn').exists()).toBe(true)
      expect(wrapper.find('.error-btn').text()).toBe('Unassign User')
      expect(wrapper.find('.form-submit').exists()).toBe(false)
    })

    it('hides both actions for a non-admin', async () => {
      mockAuthStore.isAdmin = false

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('.form-submit').exists()).toBe(false)
      expect(wrapper.find('.error-btn').exists()).toBe(false)
    })
  })

  describe('assignUser', () => {
    it('opens the AssignUser modal when Assign User is clicked', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockSmartPack, assigned_to: null })

      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.findComponent(AssignUser).exists()).toBe(false)

      await wrapper.find('.form-submit').trigger('click')

      expect(wrapper.findComponent(AssignUser).exists()).toBe(true)
    })

    it('closes the modal via the close event', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockSmartPack, assigned_to: null })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('.form-submit').trigger('click')
      expect(wrapper.findComponent(AssignUser).exists()).toBe(true)

      await wrapper.findComponent(AssignUser).vm.$emit('close', false)

      expect(wrapper.findComponent(AssignUser).exists()).toBe(false)
    })
  })

  describe('handleAssign', () => {
    it('assigns the selected user, closes the modal, refetches, and notifies success', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockSmartPack, assigned_to: null })
      mockAssign.mockResolvedValueOnce('SmartPack assigned successfully.')

      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('.form-submit').trigger('click')
      mockGetById.mockClear()

      await wrapper.findComponent(AssignUser).vm.$emit('assign', mockUser as User)
      await flushPromises()

      expect(mockAssign).toHaveBeenCalledWith(mockSmartPack.id, { assigned_to: mockUser.id })
      expect(wrapper.findComponent(AssignUser).exists()).toBe(false)
      expect(mockGetById).toHaveBeenCalledWith({ id: mockSmartPack.id.toString() })
      expect(mockNotifySuccess).toHaveBeenCalledWith('SmartPack assigned successfully.')
    })

    it('notifies and redirects when assign fails with a reload error', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockSmartPack, assigned_to: null })
      mockAssign.mockRejectedValueOnce({ message: 'Assign failed', reload: true })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('.form-submit').trigger('click')
      await wrapper.findComponent(AssignUser).vm.$emit('assign', mockUser as User)
      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Assign failed')
      expect(mockRouterPush).toHaveBeenCalledWith({ name: 'smartpacks' })
    })

    it('notifies without redirecting when assign fails without a reload flag', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockSmartPack, assigned_to: null })
      mockAssign.mockRejectedValueOnce({ message: 'Server error', reload: false })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('.form-submit').trigger('click')
      await wrapper.findComponent(AssignUser).vm.$emit('assign', mockUser as User)
      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Server error')
      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('passes submitting through to the AssignUser modal while assigning', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockSmartPack, assigned_to: null })
      let resolveAssign: (value: string) => void = () => {}
      mockAssign.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveAssign = resolve
        }),
      )

      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('.form-submit').trigger('click')
      void wrapper.findComponent(AssignUser).vm.$emit('assign', mockUser as User)
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(AssignUser).props('submitting')).toBe(true)

      resolveAssign('SmartPack assigned successfully.')
      await flushPromises()

      expect(wrapper.findComponent(AssignUser).exists()).toBe(false)
    })
  })

  describe('unassignUser', () => {
    const assignedSmartPack: SmartPack = {
      ...mockSmartPack,
      assigned_to: {
        id: mockUser.id,
        uuid: mockUser.unique_id,
        full_name: mockUser.full_name,
        email: mockUser.email,
        phone: mockUser.phone,
      },
    }

    it('does nothing if the confirmation modal is declined', async () => {
      mockGetById.mockResolvedValueOnce(assignedSmartPack)
      mockDeleteModal.mockResolvedValueOnce(false)

      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('.error-btn').trigger('click')
      await flushPromises()

      expect(mockUnassign).not.toHaveBeenCalled()
    })

    it('confirms with the hardware model and assigned user, then unassigns', async () => {
      mockGetById.mockResolvedValueOnce(assignedSmartPack)
      mockDeleteModal.mockResolvedValueOnce(true)
      mockUnassign.mockResolvedValueOnce('SmartPack unassigned successfully.')

      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('.error-btn').trigger('click')
      await flushPromises()

      expect(mockDeleteModal).toHaveBeenCalledWith(
        'Unassign',
        `${assignedSmartPack.hardware_model} SmartPack from ${mockUser.full_name}`,
      )
      expect(mockUnassign).toHaveBeenCalledWith(assignedSmartPack.id)
      expect(mockNotifySuccess).toHaveBeenCalledWith('SmartPack unassigned successfully.')
    })

    it('refetches the smartpack after unassigning', async () => {
      mockGetById.mockResolvedValueOnce(assignedSmartPack)
      mockDeleteModal.mockResolvedValueOnce(true)
      mockUnassign.mockResolvedValueOnce('SmartPack unassigned successfully.')

      const wrapper = mountView()
      await flushPromises()
      mockGetById.mockClear()

      await wrapper.find('.error-btn').trigger('click')
      await flushPromises()

      expect(mockGetById).toHaveBeenCalledWith({ id: assignedSmartPack.id.toString() })
    })

    it('notifies and redirects when unassign fails with a reload error', async () => {
      mockGetById.mockResolvedValueOnce(assignedSmartPack)
      mockDeleteModal.mockResolvedValueOnce(true)
      mockUnassign.mockRejectedValueOnce({ message: 'Unassign failed', reload: true })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('.error-btn').trigger('click')
      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Unassign failed')
      expect(mockRouterPush).toHaveBeenCalledWith({ name: 'smartpacks' })
    })

    it('notifies without redirecting when unassign fails without a reload flag', async () => {
      mockGetById.mockResolvedValueOnce(assignedSmartPack)
      mockDeleteModal.mockResolvedValueOnce(true)
      mockUnassign.mockRejectedValueOnce({ message: 'Server error', reload: false })

      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('.error-btn').trigger('click')
      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Server error')
      expect(mockRouterPush).not.toHaveBeenCalled()
    })
  })
  describe('Print QR', () => {
    it('shows the Print QR button regardless of admin status', async () => {
      mockAuthStore.isAdmin = false

      const wrapper = mountView()
      await flushPromises()

      const printQrBtn = wrapper.find('.form-submit-secondary')
      expect(printQrBtn.exists()).toBe(true)
      expect(printQrBtn.text()).toBe('Print QR')
    })

    it('does not render the QR helper component initially', async () => {
      const wrapper = mountView()
      await flushPromises()

      expect(wrapper.findComponent(SmartPackQrComponent).exists()).toBe(false)
    })

    it('renders the QR helper component when Print QR is clicked', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('.form-submit-secondary').trigger('click')

      const qrComponent = wrapper.findComponent(SmartPackQrComponent)
      expect(qrComponent.exists()).toBe(true)
      expect(qrComponent.props('item')).toEqual(mockSmartPack)
    })

    it('hides the QR helper component once it emits show-qr with false', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('.form-submit-secondary').trigger('click')
      expect(wrapper.findComponent(SmartPackQrComponent).exists()).toBe(true)

      await wrapper.findComponent(SmartPackQrComponent).vm.$emit('show-qr', false)

      expect(wrapper.findComponent(SmartPackQrComponent).exists()).toBe(false)
    })

    it('disables the Print QR button while printingQr is true', async () => {
      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('.form-submit-secondary').trigger('click')

      expect(wrapper.find('.form-submit-secondary').attributes('disabled')).toBeDefined()
    })
  })
})
