import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, type PropType } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  NotificationPreferences,
  UpdateNotificationPreferencesPayload,
} from '@/api/modules/notificationPreferences'

import Notifications from '../Notifications.vue'

// --- Types -------------------------------------------------------------

type ChannelOption = { label: string; value: string }

type FormValues = {
  preferred_general_channel: string
  preferred_smartpack_channel: string
}

// --- Fixtures ----------------------------------------------------------

const mockPreferences: NotificationPreferences = {
  id: 1,
  sms_phone_number: '+254700000000',
  whatsapp_phone_number: '+254711111111',
  preferred_general_channel: 'email',
  preferred_smartpack_channel: 'sms',
}

const GENERAL_SELECT = '[data-testid="general-channel-select"]'
const SMARTPACK_SELECT = '[data-testid="smartpack-channel-select"]'
const SAVE_BUTTON = '[data-testid="save-notification-preferences-button"]'
const MANAGE_CONTACT_NUMBERS_BUTTON = '[data-testid="manage-contact-numbers-button"]'
const NOTIFICATIONS_MODAL = '[data-testid="notifications-modal"]'
// --- Mocks -------------------------------------------------------------

const mockGet = vi.hoisted(() => vi.fn<() => Promise<NotificationPreferences>>())

const mockPatch = vi.hoisted(() =>
  vi.fn<(payload: UpdateNotificationPreferencesPayload) => Promise<NotificationPreferences>>(),
)

const mockResetForm = vi.hoisted(() => vi.fn<(state?: unknown) => void>())

const mockSetFieldError = vi.hoisted(() => vi.fn<(field: string, message: string) => void>())

const mockNotifySuccess = vi.hoisted(() => vi.fn<(message: string) => void>())

const mockNotifyError = vi.hoisted(() => vi.fn<(message: string) => void>())

/**
 * Values handed to the `handleSubmit` callback. The real vee-validate reads
 * them from the registered fields, so tests keep this in sync with the selects.
 */
const mockFormValues = vi.hoisted((): FormValues => ({
  preferred_general_channel: 'email',
  preferred_smartpack_channel: 'sms',
}))

vi.mock('@/api/modules/notificationPreferences', () => ({
  get: mockGet,
  patch: mockPatch,
}))

vi.mock('vee-validate', () => ({
  useForm: () => ({
    handleSubmit: (fn: (values: FormValues) => Promise<void>) => () => fn(mockFormValues),
    resetForm: mockResetForm,
    setFieldError: mockSetFieldError,
  }),
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: () => ({
    $notifySuccess: mockNotifySuccess,
    $notifyError: mockNotifyError,
  }),
}))

// --- Stubs -------------------------------------------------------------

const InputFieldStub = defineComponent({
  name: 'InputField',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      default: '',
    },
    variant: {
      type: String,
      default: '',
    },
    options: {
      type: Array as PropType<ChannelOption[]>,
      default: () => [],
    },
    placeholder: {
      type: String,
      default: '',
    },
    rules: {
      type: String,
      default: '',
    },
    errorLabel: {
      type: String,
      default: '',
    },
    specificType: {
      type: String,
      default: '',
    },
    inputClass: {
      type: String,
      default: '',
    },
    icon: {
      type: [Object, Function],
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => {
      if (props.variant === 'select') {
        return h(
          'select',
          {
            class: 'input-field-stub',
            name: props.name,
            value: props.modelValue,
            disabled: props.disabled,
            onChange: (event: Event) =>
              emit('update:modelValue', (event.target as HTMLSelectElement).value),
          },
          props.options.map((option) => h('option', { value: option.value }, option.label)),
        )
      }

      return h('input', {
        class: 'input-field-stub',
        name: props.name,
        placeholder: props.placeholder,
        value: props.modelValue,
        disabled: props.disabled,
      })
    }
  },
})

const InfoTooltipStub = defineComponent({
  name: 'InfoTooltip',
  props: {
    text: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    return () => h('span', { class: 'info-tooltip-stub', 'data-text': props.text })
  },
})

const createIconStub = (name: string, className: string) =>
  defineComponent({
    name,
    setup() {
      return () => h('svg', { class: className })
    },
  })
const mockNotificationsModal = vi.hoisted(() => ({
  close: vi.fn<() => void>(),
  success: vi.fn<() => void>(),
}))

vi.mock('@/components/Users/NotificationsModal.vue', () => ({
  default: {
    name: 'NotificationsModal',
    props: {
      smsPhoneNumber: {
        type: String,
        required: true,
      },
      whatsappPhoneNumber: {
        type: String,
        required: true,
      },
    },
    emits: ['close', 'success'],
    setup(
      _props: {
        smsPhoneNumber: string
        whatsappPhoneNumber: string
      },
      { emit }: { emit: (event: 'close' | 'success') => void },
    ) {
      return {
        emit,
        mockNotificationsModal,
      }
    },
    template: `
      <div data-testid="notifications-modal">
        <span data-testid="modal-sms-phone">{{ smsPhoneNumber }}</span>
        <span data-testid="modal-whatsapp-phone">{{ whatsappPhoneNumber }}</span>
        <button data-testid="modal-close" @click="emit('close')">Close</button>
        <button data-testid="modal-success" @click="emit('success')">Success</button>
      </div>
    `,
  },
}))
// --- Helpers -----------------------------------------------------------

const globalStubs = {
  InputField: InputFieldStub,
  InfoTooltip: InfoTooltipStub,
  BellIcon: createIconStub('BellIcon', 'bell-icon-stub'),
  BackPackIcon: createIconStub('BackPackIcon', 'backpack-icon-stub'),
  PhoneIcon: createIconStub('PhoneIcon', 'phone-icon-stub'),
  WhatsAppIcon: createIconStub('WhatsAppIcon', 'whatsapp-icon-stub'),
}

const wrapperFactory = (): VueWrapper => {
  return mount(Notifications, {
    global: {
      stubs: globalStubs,
    },
  })
}

const getSelect = (wrapper: VueWrapper, selector: string): HTMLSelectElement => {
  return wrapper.get<HTMLSelectElement>(selector).element
}

/**
 * Changes a channel select and keeps the mocked vee-validate values in sync.
 */
const selectChannel = async (
  wrapper: VueWrapper,
  selector: string,
  field: keyof FormValues,
  value: string,
): Promise<void> => {
  mockFormValues[field] = value

  await wrapper.get<HTMLSelectElement>(selector).setValue(value)
}

// --- Tests -------------------------------------------------------------

describe('Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGet.mockResolvedValue(mockPreferences)
    mockPatch.mockResolvedValue(mockPreferences)

    mockFormValues.preferred_general_channel = mockPreferences.preferred_general_channel
    mockFormValues.preferred_smartpack_channel = mockPreferences.preferred_smartpack_channel
  })

  describe('preferences loading', () => {
    it('fetches the notification preferences when mounted', async () => {
      wrapperFactory()

      await flushPromises()

      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('resets the form with the fetched values', async () => {
      wrapperFactory()

      await flushPromises()

      expect(mockResetForm).toHaveBeenCalledWith({
        values: {
          preferred_general_channel: 'email',
          preferred_smartpack_channel: 'sms',
          sms_phone_number: '+254700000000',
          whatsapp_phone_number: '+254711111111',
        },
      })
    })

    it('falls back to empty phone numbers when none are configured', async () => {
      mockGet.mockResolvedValue({
        ...mockPreferences,
        sms_phone_number: null,
        whatsapp_phone_number: null,
      } as unknown as NotificationPreferences)

      wrapperFactory()

      await flushPromises()

      expect(mockResetForm).toHaveBeenCalledWith({
        values: expect.objectContaining({
          sms_phone_number: '',
          whatsapp_phone_number: '',
        }) as unknown,
      })
    })

    it('shows the loading state until the preferences resolve', async () => {
      let resolveGet!: (preferences: NotificationPreferences) => void

      mockGet.mockImplementation(
        () =>
          new Promise<NotificationPreferences>((resolve) => {
            resolveGet = resolve
          }),
      )

      const wrapper = wrapperFactory()

      await nextTick()

      expect(wrapper.text()).toContain('Loading notification preferences...')
      expect(wrapper.find(SAVE_BUTTON).exists()).toBe(false)
      expect(getSelect(wrapper, GENERAL_SELECT).disabled).toBe(true)

      resolveGet(mockPreferences)

      await flushPromises()

      expect(wrapper.text()).not.toContain('Loading notification preferences...')
      expect(wrapper.find(SAVE_BUTTON).exists()).toBe(true)
      expect(getSelect(wrapper, GENERAL_SELECT).disabled).toBe(false)
    })

    it('notifies the error message when loading fails', async () => {
      mockGet.mockRejectedValue(new Error('Network down'))

      wrapperFactory()

      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Network down')
    })

    it('notifies a fallback message when loading fails with a non-error', async () => {
      mockGet.mockRejectedValue('boom')

      wrapperFactory()

      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Unable to load notification preferences.')
    })
  })

  describe('rendering', () => {
    it('renders the page description', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()

      expect(wrapper.text()).toContain(
        'Manage how you receive general and SmartPack notifications.',
      )
    })

    it('renders the section headings', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()

      expect(wrapper.text()).toContain('Notification Channels')
      expect(wrapper.text()).toContain('Contact Information')
    })

    it('renders the channel labels', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()

      expect(wrapper.text()).toContain('General Notifications')
      expect(wrapper.text()).toContain('SmartPack Notifications')
    })

    it('renders the available channel options in both selects', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()

      const expected = ['None', 'Email', 'SMS', 'WhatsApp']

      for (const selector of [GENERAL_SELECT, SMARTPACK_SELECT]) {
        const labels = wrapper.findAll(`${selector} option`).map((option) => option.text())

        expect(labels).toEqual(expected)
      }
    })

    it('selects the fetched channels', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()

      expect(getSelect(wrapper, GENERAL_SELECT).value).toBe('email')
      expect(getSelect(wrapper, SMARTPACK_SELECT).value).toBe('sms')
    })

    it('renders the contact phone numbers as disabled inputs', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()

      const sms = wrapper.get<HTMLInputElement>('input[name="sms_phone_number"]')
      const whatsapp = wrapper.get<HTMLInputElement>('input[name="whatsapp_phone_number"]')

      expect(sms.element.value).toBe('+254700000000')
      expect(sms.attributes('disabled')).toBeDefined()
      expect(whatsapp.element.value).toBe('+254711111111')
      expect(whatsapp.attributes('disabled')).toBeDefined()
    })

    it('renders an info tooltip for each field', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()

      expect(wrapper.findAll('.info-tooltip-stub')).toHaveLength(4)
    })
  })

  describe('change detection', () => {
    it('disables the save button when nothing has changed', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()

      expect(wrapper.get(SAVE_BUTTON).attributes('disabled')).toBeDefined()
    })

    it('enables the save button when the general channel changes', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()
      await selectChannel(wrapper, GENERAL_SELECT, 'preferred_general_channel', 'whatsapp')

      expect(wrapper.get(SAVE_BUTTON).attributes('disabled')).toBeUndefined()
    })

    it('enables the save button when the SmartPack channel changes', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()
      await selectChannel(wrapper, SMARTPACK_SELECT, 'preferred_smartpack_channel', 'none')

      expect(wrapper.get(SAVE_BUTTON).attributes('disabled')).toBeUndefined()
    })

    it('disables the save button again when the change is reverted', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()
      await selectChannel(wrapper, GENERAL_SELECT, 'preferred_general_channel', 'whatsapp')
      await selectChannel(wrapper, GENERAL_SELECT, 'preferred_general_channel', 'email')

      expect(wrapper.get(SAVE_BUTTON).attributes('disabled')).toBeDefined()
    })
  })

  describe('saving preferences', () => {
    it('does not submit when nothing has changed', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(mockPatch).not.toHaveBeenCalled()
    })

    it('submits only the channel preferences', async () => {
      mockPatch.mockResolvedValue({
        ...mockPreferences,
        preferred_general_channel: 'whatsapp',
      })

      const wrapper = wrapperFactory()

      await flushPromises()
      await selectChannel(wrapper, GENERAL_SELECT, 'preferred_general_channel', 'whatsapp')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(mockPatch).toHaveBeenCalledExactlyOnceWith({
        preferred_general_channel: 'whatsapp',
        preferred_smartpack_channel: 'sms',
      })
    })

    it('notifies success after saving', async () => {
      mockPatch.mockResolvedValue({
        ...mockPreferences,
        preferred_smartpack_channel: 'none',
      })

      const wrapper = wrapperFactory()

      await flushPromises()
      await selectChannel(wrapper, SMARTPACK_SELECT, 'preferred_smartpack_channel', 'none')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(mockNotifySuccess).toHaveBeenCalledWith(
        'Notification preferences successfully updated.',
      )
    })

    it('resets the form with the response and disables the save button', async () => {
      mockPatch.mockResolvedValue({
        ...mockPreferences,
        preferred_general_channel: 'whatsapp',
      })

      const wrapper = wrapperFactory()

      await flushPromises()
      mockResetForm.mockClear()

      await selectChannel(wrapper, GENERAL_SELECT, 'preferred_general_channel', 'whatsapp')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(mockResetForm).toHaveBeenCalledExactlyOnceWith({
        values: {
          preferred_general_channel: 'whatsapp',
          preferred_smartpack_channel: 'sms',
          sms_phone_number: '+254700000000',
          whatsapp_phone_number: '+254711111111',
        },
      })
      expect(wrapper.get(SAVE_BUTTON).attributes('disabled')).toBeDefined()
    })

    it('shows the saving state while the request is in flight', async () => {
      let resolvePatch!: (preferences: NotificationPreferences) => void

      mockPatch.mockImplementation(
        () =>
          new Promise<NotificationPreferences>((resolve) => {
            resolvePatch = resolve
          }),
      )

      const wrapper = wrapperFactory()

      await flushPromises()
      await selectChannel(wrapper, GENERAL_SELECT, 'preferred_general_channel', 'whatsapp')
      await wrapper.get('form').trigger('submit')
      await nextTick()

      const saveButton = wrapper.get(SAVE_BUTTON)

      expect(saveButton.text()).toContain('Saving...')
      expect(saveButton.attributes('disabled')).toBeDefined()
      expect(getSelect(wrapper, GENERAL_SELECT).disabled).toBe(true)
      expect(getSelect(wrapper, SMARTPACK_SELECT).disabled).toBe(true)

      resolvePatch({ ...mockPreferences, preferred_general_channel: 'whatsapp' })

      await flushPromises()

      expect(wrapper.get(SAVE_BUTTON).text()).toContain('Save Changes')
    })
  })

  describe('save errors', () => {
    it('sets field errors returned by the API', async () => {
      mockPatch.mockRejectedValue(
        Object.assign(new Error('Request failed with status code 400'), {
          response: {
            data: {
              preferred_general_channel: ['Add an SMS number first.', 'Second message'],
            },
          },
        }),
      )

      const wrapper = wrapperFactory()

      await flushPromises()
      await selectChannel(wrapper, GENERAL_SELECT, 'preferred_general_channel', 'sms')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(mockSetFieldError).toHaveBeenCalledExactlyOnceWith(
        'preferred_general_channel',
        'Add an SMS number first.',
      )
    })

    it('ignores API errors for unknown fields', async () => {
      mockPatch.mockRejectedValue(
        Object.assign(new Error('Request failed with status code 400'), {
          response: {
            data: {
              unknown_field: ['Should be ignored'],
            },
          },
        }),
      )

      const wrapper = wrapperFactory()

      await flushPromises()
      await selectChannel(wrapper, GENERAL_SELECT, 'preferred_general_channel', 'sms')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(mockSetFieldError).not.toHaveBeenCalled()
    })

    it('notifies the error message when saving fails', async () => {
      mockPatch.mockRejectedValue(new Error('Request failed with status code 500'))

      const wrapper = wrapperFactory()

      await flushPromises()
      await selectChannel(wrapper, GENERAL_SELECT, 'preferred_general_channel', 'sms')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Request failed with status code 500')
      expect(mockNotifySuccess).not.toHaveBeenCalled()
    })

    it('notifies a fallback message when the error has no message', async () => {
      mockPatch.mockRejectedValue({})

      const wrapper = wrapperFactory()

      await flushPromises()
      await selectChannel(wrapper, GENERAL_SELECT, 'preferred_general_channel', 'sms')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Unable to update notification preferences.')
    })

    it('keeps the save button enabled after a failed save so the user can retry', async () => {
      mockPatch.mockRejectedValue(new Error('Request failed with status code 500'))

      const wrapper = wrapperFactory()

      await flushPromises()
      await selectChannel(wrapper, GENERAL_SELECT, 'preferred_general_channel', 'sms')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(wrapper.get(SAVE_BUTTON).attributes('disabled')).toBeUndefined()
    })
  })
  describe('contact numbers modal', () => {
    it('renders the Manage Contact Numbers button', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()

      const button = wrapper.get(MANAGE_CONTACT_NUMBERS_BUTTON)

      expect(button.text()).toBe('Manage Contact Numbers')
      expect(button.attributes('type')).toBe('button')
    })

    it('does not render the modal initially', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()

      expect(wrapper.find(NOTIFICATIONS_MODAL).exists()).toBe(false)
    })

    it('opens the modal when Manage Contact Numbers is clicked', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()
      await wrapper.get(MANAGE_CONTACT_NUMBERS_BUTTON).trigger('click')

      expect(wrapper.find(NOTIFICATIONS_MODAL).exists()).toBe(true)
    })

    it('passes both configured phone numbers to the modal', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()
      await wrapper.get(MANAGE_CONTACT_NUMBERS_BUTTON).trigger('click')

      expect(wrapper.get('[data-testid="modal-sms-phone"]').text()).toBe('+254700000000')
      expect(wrapper.get('[data-testid="modal-whatsapp-phone"]').text()).toBe('+254711111111')
    })

    it('passes empty phone numbers to the modal when none are configured', async () => {
      mockGet.mockResolvedValue({
        ...mockPreferences,
        sms_phone_number: null,
        whatsapp_phone_number: null,
      } as unknown as NotificationPreferences)

      const wrapper = wrapperFactory()

      await flushPromises()
      await wrapper.get(MANAGE_CONTACT_NUMBERS_BUTTON).trigger('click')

      expect(wrapper.get('[data-testid="modal-sms-phone"]').text()).toBe('')
      expect(wrapper.get('[data-testid="modal-whatsapp-phone"]').text()).toBe('')
    })

    it('closes the modal when the modal emits close', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()
      await wrapper.get(MANAGE_CONTACT_NUMBERS_BUTTON).trigger('click')

      expect(wrapper.find(NOTIFICATIONS_MODAL).exists()).toBe(true)

      await wrapper.get('[data-testid="modal-close"]').trigger('click')

      expect(wrapper.find(NOTIFICATIONS_MODAL).exists()).toBe(false)
    })

    it('reloads preferences when the modal emits success', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()

      expect(mockGet).toHaveBeenCalledTimes(1)

      await wrapper.get(MANAGE_CONTACT_NUMBERS_BUTTON).trigger('click')
      await wrapper.get('[data-testid="modal-success"]').trigger('click')
      await flushPromises()

      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    it('keeps the modal open when the modal emits success', async () => {
      const wrapper = wrapperFactory()

      await flushPromises()
      await wrapper.get(MANAGE_CONTACT_NUMBERS_BUTTON).trigger('click')
      await wrapper.get('[data-testid="modal-success"]').trigger('click')

      await flushPromises()

      expect(wrapper.find(NOTIFICATIONS_MODAL).exists()).toBe(true)
    })
  })
})
