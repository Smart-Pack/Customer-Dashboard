import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import SmartPackDetails from '@/views/Smartpacks/details.vue'
import AssignGroup from '@/components/Smartpacks/AssignGroup.vue'
import AssignChildForm from '@/components/Smartpacks/UpdateForm.vue'
import SmartPackQrComponent from '@/components/Smartpacks/QrCode.vue'

import type { SmartPack } from '@/api/modules/smartpacks'
import type { Group } from '@/api/modules/groups'
import type { ItemNotFoundError } from '@/api/types'

const mockGetById = vi.fn<(params: { id: string }) => Promise<SmartPack>>()

const mockAssignGroup =
  vi.fn<(id: string | number, payload: { group: number }) => Promise<string>>()

const mockUnassignGroup = vi.fn<(id: string | number) => Promise<string>>()

const mockNotifyError = vi.fn<(message: string) => void>()
const mockNotifySuccess = vi.fn<(message: string) => void>()

const mockDeleteModal =
  vi.fn<(title: string, name: string, options?: { text: string }) => Promise<boolean>>()

const mockRouterPush = vi.fn<(location: { name: string }) => void>()

const mockAuthStore = {
  fetchUser: vi.fn<() => Promise<void>>(),
  isGroupAdmin: vi.fn<(groupId: number) => boolean>(() => true),
}

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

const mockFilters = {
  dateTime: (value: string) => `dateTime(${value})`,
  activeClass: (isOnline: boolean) => (isOnline ? 'is-online' : 'is-offline'),
}

const mockGroup = {
  id: 10,
  name: 'Primary School',
} as Group

const mockSmartPack: SmartPack = {
  id: 1,
  device_uid: 'SP-0001',
  hardware_model: 'SP-X1',
  imei: '490154203237518',
  firmware_version: '1.4.2',
  last_seen: '2026-09-23T14:30:00Z',
  is_online: true,
  assigned_to: null,
  group: null,
  child_name: 'Amara',
  created: '2026-01-05T09:00:00.000Z',
  updated: '2026-09-23T14:30:00Z',
}

const mockAssignedSmartPack: SmartPack = {
  ...mockSmartPack,
  group: mockGroup,
}

const mockNotFoundError = (message = 'SmartPack not found', reload = false): ItemNotFoundError =>
  ({
    message,
    reload,
  }) as ItemNotFoundError

const mountView = () =>
  mount(SmartPackDetails, {
    global: {
      mocks: {
        $api: {
          smartpacks: {
            getById: mockGetById,
            assignGroup: mockAssignGroup,
            unassignGroup: mockUnassignGroup,
          },
        },
        $pinia: {},
        $filters: mockFilters,
        $notifyError: mockNotifyError,
        $notifySuccess: mockNotifySuccess,
        $deleteModal: mockDeleteModal,
        $route: {
          params: {
            id: mockSmartPack.id.toString(),
          },
        },
        $router: {
          push: mockRouterPush,
        },
      },
      stubs: {
        AssignGroup: {
          props: ['submitting'],
          emits: ['close', 'assign'],
          template: `
            <div data-testid="assign-group-modal">
              <button
                type="button"
                data-testid="close-group-modal"
                @click="$emit('close', false)"
              >
                Close
              </button>
            </div>
          `,
        },
        AssignChildForm: {
          props: ['initialValues'],
          emits: ['close'],
          template: `
            <div data-testid="assign-child-form">
              <button
                type="button"
                data-testid="close-child-form"
                @click="$emit('close', 'showDetails', true)"
              >
                Close
              </button>
            </div>
          `,
        },
        SmartPackQrComponent: {
          props: ['item'],
          emits: ['show-qr'],
          template: `
            <div data-testid="smartpack-qr">
              <button
                type="button"
                data-testid="close-qr"
                @click="$emit('show-qr', false)"
              >
                Close QR
              </button>
            </div>
          `,
        },
        RouterLink: {
          props: ['to'],
          template: '<a><slot /></a>',
        },
      },
    },
  })

describe('SmartPackDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetById.mockResolvedValue({ ...mockSmartPack })
    mockAssignGroup.mockResolvedValue('SmartPack assigned to group successfully')
    mockUnassignGroup.mockResolvedValue('SmartPack removed from group successfully')

    mockDeleteModal.mockResolvedValue(true)
    mockAuthStore.fetchUser.mockResolvedValue(undefined)
    mockAuthStore.isGroupAdmin.mockReturnValue(true)
  })

  describe('Fetching SmartPack details', () => {
    it('fetches SmartPack details using the route ID when mounted', async () => {
      mountView()

      await flushPromises()

      expect(mockGetById).toHaveBeenCalledTimes(1)
      expect(mockGetById).toHaveBeenCalledWith({ id: '1' })
    })

    it('displays the SmartPack hardware model', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('SP-X1')
    })

    it('displays the SmartPack IMEI', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('490154203237518')
    })

    it('displays the firmware version', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('1.4.2')
    })

    it('displays the formatted last-seen timestamp', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain(`dateTime(${mockSmartPack.last_seen})`)
    })

    it('displays the formatted creation timestamp', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain(`dateTime(${mockSmartPack.created})`)
    })

    it('shows an error notification when fetching details fails', async () => {
      mockGetById.mockRejectedValueOnce(mockNotFoundError('Unable to load SmartPack'))

      mountView()

      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Unable to load SmartPack')
    })

    it('redirects to the SmartPacks list when the error requires a reload', async () => {
      mockGetById.mockRejectedValueOnce(mockNotFoundError('SmartPack not found', true))

      mountView()

      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalledWith({
        name: 'smartpacks',
      })
    })

    it('does not redirect when the error does not require a reload', async () => {
      mockGetById.mockRejectedValueOnce(mockNotFoundError('Unable to load SmartPack', false))

      mountView()

      await flushPromises()

      expect(mockRouterPush).not.toHaveBeenCalled()
    })
    it('continues loading SmartPack details when fetching the user fails', async () => {
      mockAuthStore.fetchUser.mockRejectedValueOnce(new Error('Failed to fetch user'))

      const wrapper = mountView()

      await flushPromises()

      expect(mockAuthStore.fetchUser).toHaveBeenCalledExactlyOnceWith()
      expect(mockGetById).toHaveBeenCalledExactlyOnceWith({ id: '1' })
      expect(wrapper.text()).toContain(mockSmartPack.hardware_model)
      expect(mockNotifyError).not.toHaveBeenCalled()
    })
  })

  describe('SmartPack summary', () => {
    it('displays the online status when the SmartPack is online', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Online')
      expect(wrapper.find('.is-online').exists()).toBe(true)
    })

    it('displays the offline status when the SmartPack is offline', async () => {
      mockGetById.mockResolvedValueOnce({
        ...mockSmartPack,
        is_online: false,
      })

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Offline')
      expect(wrapper.find('.is-offline').exists()).toBe(true)
    })

    it('displays an em dash when there is no child name', async () => {
      mockGetById.mockResolvedValueOnce({
        ...mockSmartPack,
        child_name: '',
      })

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.find('header').text()).toContain('—')
    })

    it('displays the assigned child name', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Amara')
    })

    it('displays an em dash when the SmartPack has no group', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('—')
    })

    it('displays the assigned group name', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Primary School')
    })

    it('links to the assigned group details page', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const link = wrapper.find('a')

      expect(link.exists()).toBe(true)
      expect(link.attributes('href')).toBeUndefined()
    })
  })

  describe('Group assignment permissions', () => {
    it('displays Assign to Group when the SmartPack has no group', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Assign to Group')
    })

    it('displays Unassign from Group when the SmartPack belongs to a group and the user is a group admin', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Unassign from Group')
      expect(mockAuthStore.isGroupAdmin).toHaveBeenCalledWith(mockGroup.id)
    })

    it('hides Unassign from Group when the user is not a group admin', async () => {
      mockAuthStore.isGroupAdmin.mockReturnValue(false)
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).not.toContain('Unassign from Group')
    })

    it('hides Assign to Child when the SmartPack belongs to a group and the user is not a group admin', async () => {
      mockAuthStore.isGroupAdmin.mockReturnValue(false)
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).not.toContain('Assign to Child')
    })

    it('displays Assign to Child when the SmartPack has no group', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Assign to Child')
    })

    it('displays Assign to Child when the user is a group admin', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Assign to Child')
    })

    it('disables group actions while submitting', async () => {
      const wrapper = mountView()

      await flushPromises()

      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as unknown as {
        submitting: boolean
      }

      vm.submitting = true

      await wrapper.vm.$nextTick()

      const assignGroupButton = wrapper
        .findAll('button')
        .find((button) => button.text().trim() === 'Assign to Group')

      expect(assignGroupButton?.attributes('disabled')).toBeDefined()
    })
  })

  describe('Assigning a group', () => {
    it('opens the group assignment modal when Assign to Group is clicked', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Group')

      expect(button).toBeDefined()

      await button!.trigger('click')

      expect(wrapper.find('[data-testid="assign-group-modal"]').exists()).toBe(true)
    })

    it('passes the submitting state to the group assignment modal', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Group')

      await button!.trigger('click')

      const modal = wrapper.findComponent(AssignGroup)

      expect(modal.exists()).toBe(true)
      expect(modal.props('submitting')).toBe(false)
    })

    it('closes the group assignment modal when the close event is emitted', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Group')

      await button!.trigger('click')

      expect(wrapper.find('[data-testid="assign-group-modal"]').exists()).toBe(true)

      await wrapper.find('[data-testid="close-group-modal"]').trigger('click')

      expect(wrapper.find('[data-testid="assign-group-modal"]').exists()).toBe(false)
    })

    it('assigns the selected group, refreshes details, and displays a success notification', async () => {
      const wrapper = mountView()

      await flushPromises()

      mockGetById.mockResolvedValue({
        ...mockAssignedSmartPack,
      })

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Group')

      await button!.trigger('click')

      const modal = wrapper.findComponent(AssignGroup)

      modal.vm.$emit('assign', mockGroup)

      await flushPromises()

      expect(mockAssignGroup).toHaveBeenCalledWith(mockSmartPack.id, {
        group: mockGroup.id,
      })

      expect(mockGetById).toHaveBeenCalledTimes(2)

      expect(mockNotifySuccess).toHaveBeenCalledWith('SmartPack assigned to group successfully')

      expect(wrapper.find('[data-testid="assign-group-modal"]').exists()).toBe(false)
    })

    it('shows an error notification when group assignment fails', async () => {
      mockAssignGroup.mockRejectedValueOnce(mockNotFoundError('Unable to assign group'))

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Group')

      await button!.trigger('click')

      wrapper.findComponent(AssignGroup).vm.$emit('assign', mockGroup)

      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Unable to assign group')
    })

    it('redirects when group assignment fails with reload enabled', async () => {
      mockAssignGroup.mockRejectedValueOnce(mockNotFoundError('SmartPack not found', true))

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Group')

      await button!.trigger('click')

      wrapper.findComponent(AssignGroup).vm.$emit('assign', mockGroup)

      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalledWith({
        name: 'smartpacks',
      })
    })

    it('does not redirect when group assignment fails with reload disabled', async () => {
      mockAssignGroup.mockRejectedValueOnce(mockNotFoundError('Unable to assign group', false))

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Group')

      await button!.trigger('click')

      wrapper.findComponent(AssignGroup).vm.$emit('assign', mockGroup)

      await flushPromises()

      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('resets submitting after group assignment succeeds', async () => {
      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        handleAssignGroup: (group: Group) => Promise<void>
        submitting: boolean
      }

      await vm.handleAssignGroup(mockGroup)

      expect(vm.submitting).toBe(false)
    })

    it('resets submitting after group assignment fails', async () => {
      mockAssignGroup.mockRejectedValueOnce(mockNotFoundError('Unable to assign group'))

      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        handleAssignGroup: (group: Group) => Promise<void>
        submitting: boolean
      }

      await vm.handleAssignGroup(mockGroup)

      expect(vm.submitting).toBe(false)
    })
  })

  describe('Unassigning a group', () => {
    it('does not unassign the group when confirmation is rejected', async () => {
      mockDeleteModal.mockResolvedValueOnce(false)
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Unassign from Group')

      expect(button).toBeDefined()

      await button!.trigger('click')

      await flushPromises()

      expect(mockDeleteModal).toHaveBeenCalledTimes(1)
      expect(mockUnassignGroup).not.toHaveBeenCalled()
    })

    it('asks for confirmation before unassigning a group', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Unassign from Group')

      await button!.trigger('click')

      expect(mockDeleteModal).toHaveBeenCalledWith('Unassign Group', '', {
        text: 'Are you sure you want to remove the SmartPack from the group "Primary School"?',
      })
    })

    it('unassigns the group, refreshes details, and displays a success notification', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Unassign from Group')

      await button!.trigger('click')

      await flushPromises()

      expect(mockUnassignGroup).toHaveBeenCalledWith(mockSmartPack.id)

      expect(mockGetById).toHaveBeenCalledTimes(2)

      expect(mockNotifySuccess).toHaveBeenCalledWith('SmartPack removed from group successfully')
    })

    it('shows an error notification when group unassignment fails', async () => {
      mockUnassignGroup.mockRejectedValueOnce(mockNotFoundError('Unable to unassign group'))

      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Unassign from Group')

      await button!.trigger('click')

      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Unable to unassign group')
    })

    it('redirects when group unassignment fails with reload enabled', async () => {
      mockUnassignGroup.mockRejectedValueOnce(mockNotFoundError('SmartPack not found', true))

      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Unassign from Group')

      await button!.trigger('click')

      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalledWith({
        name: 'smartpacks',
      })
    })

    it('does not redirect when group unassignment fails with reload disabled', async () => {
      mockUnassignGroup.mockRejectedValueOnce(mockNotFoundError('Unable to unassign group', false))

      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Unassign from Group')

      await button!.trigger('click')

      await flushPromises()

      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('does nothing if unassignGroup is called when the SmartPack has no group', async () => {
      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        unassignGroup: () => Promise<void>
      }

      await vm.unassignGroup()

      expect(mockDeleteModal).not.toHaveBeenCalled()
      expect(mockUnassignGroup).not.toHaveBeenCalled()
    })

    it('resets submitting after group unassignment succeeds', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        unassignGroup: () => Promise<void>
        submitting: boolean
      }

      await vm.unassignGroup()

      expect(vm.submitting).toBe(false)
    })

    it('resets submitting after group unassignment fails', async () => {
      mockUnassignGroup.mockRejectedValueOnce(mockNotFoundError('Unable to unassign group'))

      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        unassignGroup: () => Promise<void>
        submitting: boolean
      }

      await vm.unassignGroup()

      expect(vm.submitting).toBe(false)
    })
  })

  describe('Assigning a child', () => {
    it('opens the child assignment form when Assign to Child is clicked', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Child')

      expect(button).toBeDefined()

      await button!.trigger('click')

      expect(wrapper.find('[data-testid="assign-child-form"]').exists()).toBe(true)
    })

    it('passes the current SmartPack details to the child assignment form', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Child')

      await button!.trigger('click')

      const form = wrapper.findComponent(AssignChildForm)

      expect(form.exists()).toBe(true)
      expect(form.props('initialValues')).toMatchObject(mockSmartPack)
    })

    it('returns to the details page when Cancel is clicked', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Child')

      await button!.trigger('click')

      expect(wrapper.text()).toContain('Cancel')

      await wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Cancel')!
        .trigger('click')

      expect(wrapper.text()).toContain('Details')
    })

    it('refreshes SmartPack details when the child form emits close with refresh enabled', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Child')

      await button!.trigger('click')

      wrapper.findComponent(AssignChildForm).vm.$emit('close', 'showDetails', true)

      await flushPromises()

      expect(mockGetById).toHaveBeenCalledTimes(2)
      expect(wrapper.text()).toContain('Details')
    })

    it('does not refresh SmartPack details when refresh is false', async () => {
      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        handlePageChange: (value: 'showDetails' | 'assignChild', refresh?: boolean) => void
      }

      vm.handlePageChange('showDetails', false)

      await flushPromises()

      expect(mockGetById).toHaveBeenCalledTimes(1)
    })
  })

  describe('QR printing', () => {
    it('displays the Print QR button regardless of group assignment', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Print QR')).toBe(
        true,
      )
    })

    it('does not render the QR component initially', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.find('[data-testid="smartpack-qr"]').exists()).toBe(false)
    })

    it('renders the QR component when Print QR is clicked', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper.findAll('button').find((item) => item.text().trim() === 'Print QR')

      await button!.trigger('click')

      expect(wrapper.find('[data-testid="smartpack-qr"]').exists()).toBe(true)
    })

    it('passes the current SmartPack to the QR component', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper.findAll('button').find((item) => item.text().trim() === 'Print QR')

      await button!.trigger('click')

      const qrComponent = wrapper.findComponent(SmartPackQrComponent)

      expect(qrComponent.exists()).toBe(true)
      expect(qrComponent.props('item')).toMatchObject(mockSmartPack)
    })

    it('hides the QR component when it emits show-qr with false', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper.findAll('button').find((item) => item.text().trim() === 'Print QR')

      await button!.trigger('click')

      await wrapper.find('[data-testid="close-qr"]').trigger('click')

      expect(wrapper.find('[data-testid="smartpack-qr"]').exists()).toBe(false)
    })

    it('disables the Print QR button while printingQr is true', async () => {
      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        printingQr: boolean
      }

      vm.printingQr = true

      await wrapper.vm.$nextTick()

      const button = wrapper.findAll('button').find((item) => item.text().trim() === 'Print QR')

      expect(button?.attributes('disabled')).toBeDefined()
    })

    it('shows the QR component when handlePrintQr is called with true', async () => {
      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        handlePrintQr: (value: boolean) => void
      }

      vm.handlePrintQr(true)

      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="smartpack-qr"]').exists()).toBe(true)
    })

    it('hides the QR component when handlePrintQr is called with false', async () => {
      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        handlePrintQr: (value: boolean) => void
      }

      vm.handlePrintQr(true)

      await wrapper.vm.$nextTick()

      vm.handlePrintQr(false)

      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="smartpack-qr"]').exists()).toBe(false)
    })
  })
})
