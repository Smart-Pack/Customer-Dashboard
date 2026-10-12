import { defineComponent, h, type PropType } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SendInviteModal from '@/components/Groups/SendInviteModal.vue'
import { sendInvite } from '@/api/modules/groupMembers'
import { notifySuccess, notifyError } from '@/helpers/swalNotifier'

type FormValues = {
  email: string
  role: 'admin' | 'member'
}

const mocks = vi.hoisted(() => ({
  sendInvite: vi.fn<typeof sendInvite>(),
  notifySuccess: vi.fn<typeof notifySuccess>(),
  notifyError: vi.fn<typeof notifyError>(),
  submitCallback: undefined as ((values: FormValues) => Promise<unknown>) | undefined,
  setFieldError: vi.fn<(field: keyof FormValues, message: string) => void>(),
}))

vi.mock('@/api/modules/groupMembers', () => ({
  sendInvite: mocks.sendInvite,
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: () => ({
    $notifySuccess: mocks.notifySuccess,
    $notifyError: mocks.notifyError,
  }),
}))

vi.mock('vee-validate', () => ({
  useForm: () => ({
    handleSubmit: (callback: (values: FormValues) => Promise<unknown>) => {
      mocks.submitCallback = callback

      return async () => {
        if (!mocks.submitCallback) {
          throw new Error('Submit handler was not registered by the component')
        }

        return mocks.submitCallback({
          email: '',
          role: 'member',
        })
      }
    },
    setFieldError: mocks.setFieldError,
  }),
}))

const InputFieldStub = defineComponent({
  name: 'InputField',
  props: {
    modelValue: {
      type: [String, Number, Boolean, Object],
      default: '',
    },
    name: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      default: '',
    },
    variant: {
      type: String,
      default: '',
    },
    errorLabel: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
    rules: {
      type: String,
      default: '',
    },
    options: {
      type: Array as PropType<Array<{ label: string; value: string }>>,
      default: () => [],
    },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () => {
      if (props.variant === 'select') {
        const selectedValue = props.modelValue || 'member'

        return h(
          'select',
          {
            ...attrs,
            class: 'input-field-stub',
            name: props.name,
            value: selectedValue,
            onChange: (event: Event) => {
              emit('update:modelValue', (event.target as HTMLSelectElement).value)
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
      }

      return h('input', {
        ...attrs,
        class: 'input-field-stub',
        name: props.name,
        type: props.type || 'text',
        placeholder: props.placeholder,
        value: props.modelValue,
        onInput: (event: Event) => {
          emit('update:modelValue', (event.target as HTMLInputElement).value)
        },
      })
    }
  },
})

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

const validValues: FormValues = {
  email: 'member@example.com',
  role: 'member',
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const wrapperFactory = (): VueWrapper =>
  mount(SendInviteModal, {
    props: {
      groupId: 42,
    },
    global: {
      stubs: {
        InputField: InputFieldStub,
      },
    },
  })

/**
 * Runs the callback passed to handleSubmit, simulating vee-validate
 * calling it with already-validated form values.
 */
const runSubmit = async (overrides: Partial<FormValues> = {}): Promise<void> => {
  if (!mocks.submitCallback) {
    throw new Error('Submit handler was not registered by the component')
  }

  await mocks.submitCallback({
    ...validValues,
    ...overrides,
  })

  await flushPromises()
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('SendInviteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.submitCallback = undefined
  })

  describe('rendering', () => {
    it('renders the invitation form', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('input[name="email"]').exists()).toBe(true)
      expect(wrapper.find('select[name="role"]').exists()).toBe(true)
    })

    it('renders the available invitation roles', () => {
      const wrapper = wrapperFactory()
      const options = wrapper.findAll('select[name="role"] option')

      expect(options.map((option) => option.text())).toContain('Administrator')
      expect(options.map((option) => option.text())).toContain('Member')
    })

    it('uses member as the default invitation role', () => {
      const wrapper = wrapperFactory()

      expect((wrapper.find('select[name="role"]').element as HTMLSelectElement).value).toBe(
        'member',
      )
    })
  })

  describe('submission', () => {
    it('sends the group ID and trimmed invitation details', async () => {
      mocks.sendInvite.mockResolvedValue('Invitation sent successfully.')

      wrapperFactory()

      await runSubmit({
        email: '  member@example.com  ',
        role: 'admin',
      })

      expect(mocks.sendInvite).toHaveBeenCalledTimes(1)
      expect(mocks.sendInvite).toHaveBeenCalledWith(42, {
        email: 'member@example.com',
        role: 'admin',
      })
    })

    it('shows a success notification after sending an invitation', async () => {
      mocks.sendInvite.mockResolvedValue('Invitation sent successfully.')

      wrapperFactory()

      await runSubmit()

      expect(mocks.notifySuccess).toHaveBeenCalledWith('Invitation sent successfully.')
    })

    it('emits success after sending an invitation', async () => {
      mocks.sendInvite.mockResolvedValue('Invitation sent successfully.')

      const wrapper = wrapperFactory()

      await runSubmit()

      expect(wrapper.emitted('success')).toHaveLength(1)
    })

    it('does not emit success when sending an invitation fails', async () => {
      mocks.sendInvite.mockRejectedValue(new Error('Network error'))

      const wrapper = wrapperFactory()

      await runSubmit()

      expect(wrapper.emitted('success')).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('shows an error notification when the request fails with a regular error', async () => {
      mocks.sendInvite.mockRejectedValue(new Error('Network error'))

      wrapperFactory()

      await runSubmit()

      expect(mocks.notifyError).toHaveBeenCalledWith('Network error')
    })

    it('shows a fallback notification when the request fails with an unknown error', async () => {
      mocks.sendInvite.mockRejectedValue('Unexpected failure')

      wrapperFactory()

      await runSubmit()

      expect(mocks.notifyError).toHaveBeenCalledWith('Failed to send the group invitation.')
    })

    it('sets field errors returned by the API', async () => {
      const axiosError = Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        response: {
          data: {
            email: ['This email address is already a member.'],
          },
        },
      })

      mocks.sendInvite.mockRejectedValue(axiosError)

      wrapperFactory()

      await runSubmit()

      expect(mocks.setFieldError).toHaveBeenCalledWith(
        'email',
        'This email address is already a member.',
      )
    })

    it('shows the API detail message when the request fails', async () => {
      const axiosError = Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        response: {
          data: {
            detail: 'An active invitation already exists for this email.',
          },
        },
      })

      mocks.sendInvite.mockRejectedValue(axiosError)

      wrapperFactory()

      await runSubmit()

      expect(mocks.notifyError).toHaveBeenCalledWith(
        'An active invitation already exists for this email.',
      )
    })
  })

  describe('modal events', () => {
    it('emits close when Cancel is clicked', async () => {
      const wrapper = wrapperFactory()

      const cancelButton = wrapper
        .findAll('button')
        .find((button) => button.text().trim() === 'Cancel')

      expect(cancelButton).toBeDefined()

      await cancelButton!.trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  describe('loading state', () => {
    it('shows a loading label while the invitation request is pending', async () => {
      let resolveRequest!: (value: string) => void

      mocks.sendInvite.mockReturnValue(
        new Promise<string>((resolve) => {
          resolveRequest = resolve
        }),
      )

      wrapperFactory()

      const submission = runSubmit()

      await vi.waitFor(() => {
        expect(mocks.sendInvite).toHaveBeenCalledTimes(1)
      })

      await flushPromises()

      // Resolve only after the API request has started.
      resolveRequest('Invitation sent successfully.')

      await submission

      expect(mocks.notifySuccess).toHaveBeenCalledWith('Invitation sent successfully.')
    })

    it('does not close the modal when Cancel is clicked while submitting', async () => {
      let resolveRequest!: (value: string) => void

      mocks.sendInvite.mockReturnValue(
        new Promise<string>((resolve) => {
          resolveRequest = resolve
        }),
      )

      const wrapper = wrapperFactory()

      const submission = runSubmit()

      await vi.waitFor(() => {
        expect(mocks.sendInvite).toHaveBeenCalledTimes(1)
      })

      const cancelButton = wrapper
        .findAll('button')
        .find((button) => button.text().trim() === 'Cancel')

      expect(cancelButton).toBeDefined()
      expect((cancelButton!.element as HTMLButtonElement).disabled).toBe(true)

      await cancelButton!.trigger('click')

      expect(wrapper.emitted('close')).toBeUndefined()

      resolveRequest('Invitation sent successfully.')
      await submission
    })
  })
})
