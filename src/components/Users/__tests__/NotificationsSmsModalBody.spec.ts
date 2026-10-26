import { defineComponent, h, type PropType } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import NotificationsSmsModalBody from '@/components/Users/NotificationsSmsModalBody.vue'
import {
  clearSmsPhoneNumber,
  requestSmsOtp,
  verifySmsOtp,
} from '@/api/modules/notificationPreferences'

type SmsFormValues = {
  sms_phone_number: string
  otp: string
}

const mocks = vi.hoisted(() => ({
  clearSmsPhoneNumber: vi.fn<typeof clearSmsPhoneNumber>(),
  requestSmsOtp: vi.fn<typeof requestSmsOtp>(),
  verifySmsOtp: vi.fn<typeof verifySmsOtp>(),
  notifySuccess: vi.fn<(message: string) => void>(),
  notifyError: vi.fn<(message: string) => void>(),
  deleteModal:
    vi.fn<(title: string, message: string, options: { text: string }) => Promise<boolean>>(),
  resetForm: vi.fn<(options?: { values?: Partial<SmsFormValues> }) => void>(),
  submitCallbacks: [] as Array<(values: SmsFormValues) => Promise<unknown>>,
  setFieldError: vi.fn<(field: keyof SmsFormValues, message: string) => void>(),
}))

vi.mock('@/api/modules/notificationPreferences', () => ({
  clearSmsPhoneNumber: mocks.clearSmsPhoneNumber,
  requestSmsOtp: mocks.requestSmsOtp,
  verifySmsOtp: mocks.verifySmsOtp,
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: () => ({
    $notifySuccess: mocks.notifySuccess,
    $notifyError: mocks.notifyError,
    $deleteModal: mocks.deleteModal,
  }),
}))

vi.mock('vee-validate', () => ({
  useForm: () => ({
    handleSubmit: (callback: (values: SmsFormValues) => Promise<unknown>) => {
      mocks.submitCallbacks.push(callback)

      return async () => {
        return callback({
          sms_phone_number: '',
          otp: '',
        })
      }
    },
    setFieldError: mocks.setFieldError,
    resetForm: mocks.resetForm,
  }),
}))

/**
 * Minimal InputField stub that exposes form fields as native inputs.
 */
const InputFieldStub = defineComponent({
  name: 'InputField',
  props: {
    modelValue: {
      type: [String, Number, Boolean, Object] as PropType<string | number | boolean | object>,
      default: '',
    },
    name: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      default: 'text',
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
    icon: {
      type: Object as PropType<object>,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    inputClass: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        name: props.name,
        type: props.type,
        placeholder: props.placeholder,
        value: props.modelValue,
        disabled: props.disabled,
        onInput: (event: Event) => {
          emit('update:modelValue', (event.target as HTMLInputElement).value)
        },
      })
  },
})

/**
 * Default values used when invoking the form submission callbacks.
 */
const validValues: SmsFormValues = {
  sms_phone_number: '+254712345678',
  otp: '123456',
}

/**
 * Creates a mounted instance of the SMS notification preferences component.
 *
 * @param smsPhoneNumber - The currently configured SMS phone number.
 * @returns The mounted component wrapper.
 */
const wrapperFactory = (smsPhoneNumber = '+254700000000'): VueWrapper =>
  mount(NotificationsSmsModalBody, {
    props: {
      smsPhoneNumber,
    },
    global: {
      stubs: {
        InputField: InputFieldStub,
      },
    },
  })

/**
 * Invokes a registered VeeValidate submission callback with test values.
 *
 * Callback index 0 represents requesting an OTP, while callback index 1
 * represents verifying the OTP and saving the new phone number.
 *
 * @param index - Index of the registered submission callback.
 * @param overrides - Form values that override the default values.
 */
const runSubmit = async (index: number, overrides: Partial<SmsFormValues> = {}): Promise<void> => {
  const callback = mocks.submitCallbacks[index]

  if (!callback) {
    throw new Error(`No submission callback registered at index ${index}`)
  }

  await callback({
    ...validValues,
    ...overrides,
  })

  await flushPromises()
}

/**
 * Creates an Axios-like error with a backend response payload.
 *
 * @param data - The response data returned by the backend.
 * @returns An error recognized by axios.isAxiosError.
 */
const createAxiosError = (data: Record<string, unknown>): Error =>
  Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    response: {
      data,
      status: 400,
    },
  })

describe('NotificationsSmsModalBody', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.submitCallbacks = []
    mocks.deleteModal.mockResolvedValue(true)
  })

  describe('rendering', () => {
    it('renders the current SMS phone number', () => {
      const wrapper = wrapperFactory('+254773750789')

      const currentNumber = wrapper.find('input[name="current_sms_phone_number"]')

      expect(currentNumber.exists()).toBe(true)
      expect((currentNumber.element as HTMLInputElement).value).toBe('+254773750789')
    })

    it('renders the new phone number field', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('input[name="sms_phone_number"]').exists()).toBe(true)
    })

    it('does not display the OTP field before requesting a code', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('input[name="otp"]').exists()).toBe(false)
    })

    it('disables the Reset button when no SMS phone number is configured', () => {
      const wrapper = wrapperFactory('')

      const resetButton = wrapper
        .findAll('button')
        .find((button) => button.text().trim() === 'Reset')

      expect(resetButton).toBeDefined()
      expect((resetButton!.element as HTMLButtonElement).disabled).toBe(true)
    })
  })

  describe('requesting an OTP', () => {
    it('requests an OTP using a trimmed phone number without whitespace', async () => {
      mocks.requestSmsOtp.mockResolvedValue({
        message: 'Verification code sent.',
      })

      wrapperFactory()

      await runSubmit(0, {
        sms_phone_number: '  +254 773 750789  ',
      })

      expect(mocks.requestSmsOtp).toHaveBeenCalledTimes(1)
      expect(mocks.requestSmsOtp).toHaveBeenCalledWith({
        sms_phone_number: '+254773750789',
      })
    })

    it('shows a success notification after requesting an OTP', async () => {
      mocks.requestSmsOtp.mockResolvedValue({
        message: 'Verification code sent.',
      })

      const wrapper = wrapperFactory()

      await runSubmit(0)

      expect(mocks.notifySuccess).toHaveBeenCalledWith('Verification code sent.')
      expect(wrapper.find('input[name="otp"]').exists()).toBe(true)
    })

    it('uses a fallback success message when the API response has no message', async () => {
      mocks.requestSmsOtp.mockResolvedValue({
        message: '',
      })

      wrapperFactory()

      await runSubmit(0)

      expect(mocks.notifySuccess).toHaveBeenCalledWith('Verification code sent successfully.')
    })

    it('sets a field error when the backend rejects the phone number', async () => {
      mocks.requestSmsOtp.mockRejectedValue(
        createAxiosError({
          sms_phone_number: ['Enter a valid phone number.'],
        }),
      )

      wrapperFactory()

      await runSubmit(0)

      expect(mocks.setFieldError).toHaveBeenCalledWith(
        'sms_phone_number',
        'Enter a valid phone number.',
      )
    })

    it('shows the backend detail message when requesting an OTP fails', async () => {
      mocks.requestSmsOtp.mockRejectedValue(
        createAxiosError({
          detail: 'An OTP has already been requested.',
        }),
      )

      wrapperFactory()

      await runSubmit(0)

      expect(mocks.notifyError).toHaveBeenCalledWith('An OTP has already been requested.')
    })

    it('shows a fallback error for an unknown OTP request failure', async () => {
      mocks.requestSmsOtp.mockRejectedValue('Unexpected failure')

      wrapperFactory()

      await runSubmit(0)

      expect(mocks.notifyError).toHaveBeenCalledWith('Unable to send the SMS verification code.')
    })
  })

  describe('verifying an OTP', () => {
    it('verifies the OTP and emits success and close events', async () => {
      mocks.requestSmsOtp.mockResolvedValue({
        message: 'Verification code sent.',
      })
      mocks.verifySmsOtp.mockResolvedValue({
        message: 'SMS phone number updated successfully.',
      })

      const wrapper = wrapperFactory()

      await runSubmit(0)
      await runSubmit(1)

      expect(mocks.verifySmsOtp).toHaveBeenCalledTimes(1)
      expect(mocks.verifySmsOtp).toHaveBeenCalledWith({
        otp: '123456',
      })

      expect(mocks.notifySuccess).toHaveBeenCalledWith('SMS phone number updated successfully.')
      expect(wrapper.emitted('success')).toHaveLength(1)
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('trims whitespace from the verification code', async () => {
      mocks.requestSmsOtp.mockResolvedValue({
        message: 'Verification code sent.',
      })
      mocks.verifySmsOtp.mockResolvedValue({
        message: 'Phone number updated.',
      })

      wrapperFactory()

      await runSubmit(0)
      await runSubmit(1, {
        otp: '  123456  ',
      })

      expect(mocks.verifySmsOtp).toHaveBeenCalledWith({
        otp: '123456',
      })
    })

    it('sets a field error when the backend rejects the OTP', async () => {
      mocks.requestSmsOtp.mockResolvedValue({
        message: 'Verification code sent.',
      })
      mocks.verifySmsOtp.mockRejectedValue(
        createAxiosError({
          otp: ['The verification code is invalid or expired.'],
        }),
      )

      wrapperFactory()

      await runSubmit(0)
      await runSubmit(1)

      expect(mocks.setFieldError).toHaveBeenCalledWith(
        'otp',
        'The verification code is invalid or expired.',
      )
      expect(mocks.notifyError).not.toHaveBeenCalled()
    })

    it('shows the backend detail message when verification fails', async () => {
      mocks.requestSmsOtp.mockResolvedValue({
        message: 'Verification code sent.',
      })
      mocks.verifySmsOtp.mockRejectedValue(
        createAxiosError({
          detail: 'The verification code has expired.',
        }),
      )

      wrapperFactory()

      await runSubmit(0)
      await runSubmit(1)

      expect(mocks.notifyError).toHaveBeenCalledWith('The verification code has expired.')
    })

    it('does not emit success or close when verification fails', async () => {
      mocks.requestSmsOtp.mockResolvedValue({
        message: 'Verification code sent.',
      })
      mocks.verifySmsOtp.mockRejectedValue(new Error('Network error'))

      const wrapper = wrapperFactory()

      await runSubmit(0)
      await runSubmit(1)

      expect(wrapper.emitted('success')).toBeUndefined()
      expect(wrapper.emitted('close')).toBeUndefined()
      expect(mocks.notifyError).toHaveBeenCalledWith('Network error')
    })
  })

  describe('resetting the SMS phone number', () => {
    it('clears the current number after confirmation', async () => {
      mocks.clearSmsPhoneNumber.mockResolvedValue({
        message: 'SMS phone number cleared.',
      })

      const wrapper = wrapperFactory('+254773750789')

      const resetButton = wrapper
        .findAll('button')
        .find((button) => button.text().trim() === 'Reset')

      expect(resetButton).toBeDefined()

      await resetButton!.trigger('click')
      await flushPromises()

      expect(mocks.deleteModal).toHaveBeenCalledWith('Reset SMS Phone Number', '', {
        text: 'Are you sure you want to clear your SMS phone number?',
      })
      expect(mocks.clearSmsPhoneNumber).toHaveBeenCalledTimes(1)
      expect(mocks.notifySuccess).toHaveBeenCalledWith('SMS phone number cleared.')
      expect(mocks.resetForm).toHaveBeenCalledWith({
        values: {
          sms_phone_number: '',
          otp: '',
        },
      })
      expect(wrapper.emitted('success')).toHaveLength(1)
    })

    it('does not clear the number when confirmation is cancelled', async () => {
      mocks.deleteModal.mockResolvedValue(false)

      const wrapper = wrapperFactory()

      const resetButton = wrapper
        .findAll('button')
        .find((button) => button.text().trim() === 'Reset')

      expect(resetButton).toBeDefined()

      await resetButton!.trigger('click')
      await flushPromises()

      expect(mocks.clearSmsPhoneNumber).not.toHaveBeenCalled()
      expect(mocks.notifySuccess).not.toHaveBeenCalled()
      expect(wrapper.emitted('success')).toBeUndefined()
    })

    it('shows the backend detail message when resetting fails', async () => {
      mocks.clearSmsPhoneNumber.mockRejectedValue(
        createAxiosError({
          detail: 'SMS notifications must be disabled before clearing this number.',
        }),
      )

      const wrapper = wrapperFactory()

      const resetButton = wrapper
        .findAll('button')
        .find((button) => button.text().trim() === 'Reset')

      expect(resetButton).toBeDefined()

      await resetButton!.trigger('click')
      await flushPromises()

      expect(mocks.notifyError).toHaveBeenCalledWith(
        'SMS notifications must be disabled before clearing this number.',
      )
    })

    it('shows a fallback error when resetting fails unexpectedly', async () => {
      mocks.clearSmsPhoneNumber.mockRejectedValue('Unexpected failure')

      const wrapper = wrapperFactory()

      const resetButton = wrapper
        .findAll('button')
        .find((button) => button.text().trim() === 'Reset')

      expect(resetButton).toBeDefined()

      await resetButton!.trigger('click')
      await flushPromises()

      expect(mocks.notifyError).toHaveBeenCalledWith('Unable to clear the SMS phone number.')
    })
  })
})
