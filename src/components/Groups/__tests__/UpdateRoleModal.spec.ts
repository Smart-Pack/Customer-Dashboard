import { defineComponent, h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import UpdateRoleModal from '../UpdateRoleModal.vue'
import { edit } from '@/api/modules/groupMembers'
import { useGlobals } from '@/composables/useGlobals'
import { mockGroupMembers } from '@/tests/constants'

const { selectedRole, setFieldErrorMock } = vi.hoisted(() => ({
  selectedRole: { value: 'member' as 'admin' | 'member' },
  setFieldErrorMock: vi.fn<(field: string, message: string) => void>(),
}))

vi.mock('@/api/modules/groupMembers', () => ({
  edit: vi.fn<typeof import('@/api/modules/groupMembers').edit>(),
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: vi.fn<typeof import('@/composables/useGlobals').useGlobals>(),
}))

vi.mock('vee-validate', () => ({
  useForm: () => ({
    handleSubmit:
      (callback: (values: { role: 'admin' | 'member' }) => Promise<void>) =>
      async (event?: Event) => {
        event?.preventDefault()
        await callback({ role: selectedRole.value })
      },
    setFieldError: setFieldErrorMock,
  }),
}))

const mockNotifySuccess = vi.fn<(message: string) => void>()
const mockNotifyError = vi.fn<(message: string) => void>()

const mockGroupMember = mockGroupMembers[1]!

const mockUpdateResponse: Awaited<ReturnType<typeof edit>> = {
  data: {
    ...mockGroupMember,
    role: 'admin',
  },
  message: "Jane Doe's role updated to Administrator successfully.",
}

const InputFieldStub = defineComponent({
  name: 'InputField',

  props: {
    modelValue: {
      type: String,
      default: '',
    },
    options: {
      type: Array as () => { label: string; value: string }[],
      default: () => [],
    },
  },

  emits: ['update:modelValue'],

  setup(props, { emit }) {
    return () =>
      h(
        'select',
        {
          'data-testid': 'role-select',
          value: props.modelValue,
          onChange: (event: Event) => {
            const value = (event.target as HTMLSelectElement).value

            selectedRole.value = value as 'admin' | 'member'
            emit('update:modelValue', value)
          },
        },
        props.options.map((option) =>
          h(
            'option',
            {
              key: option.value,
              value: option.value,
            },
            option.label,
          ),
        ),
      )
  },
})

const mountComponent = () =>
  mount(UpdateRoleModal, {
    props: {
      groupMember: mockGroupMember,
    },
    global: {
      stubs: {
        InputField: InputFieldStub,
      },
    },
  })

describe('UpdateRoleModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    selectedRole.value = 'member'

    vi.mocked(useGlobals).mockReturnValue({
      $notifySuccess: mockNotifySuccess,
      $notifyError: mockNotifyError,
    } as unknown as ReturnType<typeof useGlobals>)
  })

  describe('rendering', () => {
    it('renders the modal title', () => {
      const wrapper = mountComponent()

      expect(wrapper.text()).toContain('Update Group Member Role')
    })

    it('displays the group member name', () => {
      const wrapper = mountComponent()

      expect(wrapper.text()).toContain('Jane Doe')
    })

    it('renders the role selection options', () => {
      const wrapper = mountComponent()
      const select = wrapper.get('[data-testid="role-select"]')

      expect(select.findAll('option')).toHaveLength(3)
      expect(select.text()).toContain('Administrator')
      expect(select.text()).toContain('Member')
    })

    it('renders the Cancel and Update Role buttons', () => {
      const wrapper = mountComponent()

      expect(wrapper.text()).toContain('Cancel')
      expect(wrapper.text()).toContain('Update Role')
    })
  })

  describe('closing the modal', () => {
    it('emits close when Cancel is clicked', async () => {
      const wrapper = mountComponent()

      await wrapper.get('button[type="button"]').trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  describe('role selection', () => {
    it('updates the selected role', async () => {
      const wrapper = mountComponent()
      const select = wrapper.get<HTMLSelectElement>('[data-testid="role-select"]')

      await select.setValue('admin')

      expect(select.element.value).toBe('admin')
      expect(selectedRole.value).toBe('admin')
    })
  })

  describe('form submission', () => {
    it('updates the group member role successfully', async () => {
      vi.mocked(edit).mockResolvedValueOnce(mockUpdateResponse)

      const wrapper = mountComponent()

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(edit).toHaveBeenCalledExactlyOnceWith(mockGroupMember.id, {
        role: 'member',
      })

      expect(mockNotifySuccess).toHaveBeenCalledExactlyOnceWith(
        "Jane Doe's role updated to Administrator successfully.",
      )

      expect(wrapper.emitted('success')).toHaveLength(1)
      expect(mockNotifyError).not.toHaveBeenCalled()
    })

    it('submits the newly selected role', async () => {
      vi.mocked(edit).mockResolvedValueOnce(mockUpdateResponse)

      const wrapper = mountComponent()

      await wrapper.get('[data-testid="role-select"]').setValue('admin')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(edit).toHaveBeenCalledExactlyOnceWith(mockGroupMember.id, {
        role: 'admin',
      })

      expect(wrapper.emitted('success')).toHaveLength(1)
    })

    it('does not emit success when the update fails', async () => {
      vi.mocked(edit).mockRejectedValueOnce(new Error('Request failed'))

      const wrapper = mountComponent()

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(wrapper.emitted('success')).toBeUndefined()
      expect(mockNotifyError).toHaveBeenCalledWith('Request failed')
    })
  })

  describe('error handling', () => {
    it('emits refresh and displays an error when the membership is not found', async () => {
      vi.mocked(edit).mockRejectedValueOnce({
        message: 'Group member not found. They may have been deleted.',
        reload: true,
      })

      const wrapper = mountComponent()

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(wrapper.emitted('refresh')).toHaveLength(1)
      expect(mockNotifyError).toHaveBeenCalledExactlyOnceWith(
        'Group member not found. They may have been deleted.',
      )
      expect(wrapper.emitted('success')).toBeUndefined()
    })

    it('displays the API error message', async () => {
      vi.mocked(edit).mockRejectedValueOnce(new Error('Failed to update group member'))

      const wrapper = mountComponent()

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Failed to update group member')
    })

    it('displays a fallback message for non-Error values', async () => {
      vi.mocked(edit).mockRejectedValueOnce('Unexpected failure')

      const wrapper = mountComponent()

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith("Failed to update the group member's role.")
    })
  })
})
