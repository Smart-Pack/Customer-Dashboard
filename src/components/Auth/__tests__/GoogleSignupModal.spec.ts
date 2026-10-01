import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GoogleUser } from '../GoogleSignupButton.vue'
import GoogleSignupModal from '../GoogleSignupModal.vue'

// --- Types -------------------------------------------------------------

type FormValues = Record<string, unknown>
type SubmitCallback = (values: FormValues) => Promise<void>
type SetFieldErrorFn = (field: string, message: string | undefined) => void
type RegisterFn = (payload: Record<string, unknown>) => Promise<string>

type UseFormReturn = {
  handleSubmit: (fn: SubmitCallback) => () => void
  values: FormValues
  setFieldError: SetFieldErrorFn
}

// --- Mocks -----------------------------------------------------------------

let submitCallback: SubmitCallback | undefined

const mockSetFieldError = vi.fn<SetFieldErrorFn>()
const mockUseForm = vi.fn<(config: { initialValues: FormValues }) => UseFormReturn>()

vi.mock('vee-validate', () => ({
  useForm: (config: { initialValues: FormValues }) => mockUseForm(config),
}))

vi.mock('axios', () => ({
  default: {
    isAxiosError: (error: unknown) =>
      typeof error === 'object' && error !== null && 'isAxiosError' in error,
  },
}))

const mockRegisterCustomer = vi.fn<RegisterFn>()

vi.mock('@/api/modules/users', () => ({
  registerCustomer: (payload: Record<string, unknown>) => mockRegisterCustomer(payload),
}))

const mockFields = [
  {
    key: 'first_name',
    label: 'First Name',
    type: 'text',
    specificType: 'fname',
    rules: 'required',
  },
  { key: 'last_name', label: 'Last Name', type: 'text', specificType: 'lname', rules: 'required' },
  { key: 'email', label: 'Email Address', type: 'email', specificType: 'email', rules: 'required' },
  { key: 'phone', label: 'Phone Number', type: 'tel', specificType: 'phone', rules: 'required' },
  { key: 'gender', label: 'Gender', type: 'text', specificType: 'gender', rules: 'required' },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'date', rules: 'required' },
]

vi.mock('@/data/forms/customerRegistrationFields', () => ({
  getCustomerRegistrationFields: () => mockFields,
}))

const mockNotifySuccess = vi.fn<(message: string) => void>()
const mockNotifyError = vi.fn<(message: string) => void>()

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: () => ({
    $notifySuccess: mockNotifySuccess,
    $notifyError: mockNotifyError,
  }),
}))

const InputFieldStub = defineComponent({
  name: 'InputField',
  props: {
    modelValue: { type: [String, Number, Boolean, Object], default: '' },
    name: { type: String, default: '' },
    type: { type: String, default: '' },
    specificType: { type: String, default: '' },
    errorLabel: { type: String, default: '' },
    rules: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs }) {
    return () =>
      h('input', {
        ...attrs,
        class: 'input-field-stub',
        name: props.name,
        value: props.modelValue,
      })
  },
})

// --- Fixtures ---------------------------------------------------------------

const googleUser = {
  given_name: 'Trevor',
  family_name: 'Muriuki',
  email: 'trevor@example.com',
} as GoogleUser

const validValues: FormValues = {
  first_name: 'Trevor',
  last_name: 'Muriuki',
  email: 'trevor@example.com',
  phone: '+254712345678',
  gender: 'male',
  date_of_birth: '1995-05-20',
}

const axiosError = (data?: Record<string, string[]>) => ({
  isAxiosError: true,
  response: data ? { data } : undefined,
})

const wrapperFactory = (): VueWrapper =>
  mount(GoogleSignupModal, {
    props: {
      credential: 'google-credential',
      googleUser,
    },
    global: {
      stubs: {
        InputField: InputFieldStub,
      },
    },
  })

/**
 * Runs the callback that the component passed to `handleSubmit`,
 * simulating vee-validate calling it with already-validated values.
 */
const runSubmit = async (overrides: FormValues = {}): Promise<void> => {
  if (!submitCallback) {
    throw new Error('Submit handler was not registered by the component')
  }
  await submitCallback({ ...validValues, ...overrides })
}

describe('GoogleSignupModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    submitCallback = undefined

    mockUseForm.mockImplementation((config) => ({
      handleSubmit: (fn) => {
        submitCallback = fn
        return () => undefined
      },
      values: reactive({ ...config.initialValues }),
      setFieldError: mockSetFieldError,
    }))

    mockRegisterCustomer.mockResolvedValue('Registration successful')
  })

  describe('rendering', () => {
    it('renders the heading and description', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('h2').text()).toBe('Complete Your Sign Up')
      expect(wrapper.text()).toContain('Complete your details to finish signing up with Google.')
    })

    it('renders a labeled InputField for each form field', () => {
      const wrapper = wrapperFactory()

      const labels = wrapper.findAll('label')
      const inputs = wrapper.findAll('.input-field-stub')

      expect(labels).toHaveLength(mockFields.length)
      expect(inputs).toHaveLength(mockFields.length)
      expect(labels[0]?.text()).toBe('First Name')
      expect(inputs[0]?.attributes('name')).toBe('first_name')
      expect(inputs[5]?.attributes('name')).toBe('date_of_birth')
    })

    it('prefills the form with the Google user details', () => {
      const wrapper = wrapperFactory()

      expect(mockUseForm).toHaveBeenCalledWith({
        initialValues: {
          first_name: 'Trevor',
          last_name: 'Muriuki',
          email: 'trevor@example.com',
          phone: '',
          gender: '',
          date_of_birth: '',
        },
      })

      const firstName = wrapper.find<HTMLInputElement>('input[name="first_name"]')
      const email = wrapper.find<HTMLInputElement>('input[name="email"]')

      expect(firstName.element.value).toBe('Trevor')
      expect(email.element.value).toBe('trevor@example.com')
    })

    it('disables only the email field', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('input[name="email"]').attributes('disabled')).toBeDefined()
      expect(wrapper.find('input[name="first_name"]').attributes('disabled')).toBeUndefined()
    })

    it('renders the default submit button text', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('button[type="submit"]').text()).toContain('Complete Sign Up')
      expect(wrapper.find('.submit-spinner').exists()).toBe(false)
    })
  })

  describe('cancel', () => {
    it('emits close when Cancel is clicked', async () => {
      const wrapper = wrapperFactory()

      await wrapper.find('button[type="button"]').trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  describe('form submission', () => {
    it('sets a field error and skips registration when gender is empty', async () => {
      const wrapper = wrapperFactory()

      await runSubmit({ gender: '' })

      expect(mockSetFieldError).toHaveBeenCalledWith('gender', 'Please select a gender.')
      expect(mockRegisterCustomer).not.toHaveBeenCalled()
      expect(wrapper.emitted('success')).toBeUndefined()
    })

    it('registers the customer with the Google credential and emits success', async () => {
      const wrapper = wrapperFactory()

      await runSubmit()

      expect(mockRegisterCustomer).toHaveBeenCalledWith({
        ...validValues,
        credential: 'google-credential',
      })
      expect(mockNotifySuccess).toHaveBeenCalledWith('Registration successful')
      expect(wrapper.emitted('success')).toHaveLength(1)
      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('trims whitespace from string fields before registering', async () => {
      wrapperFactory()

      await runSubmit({
        first_name: '  Trevor ',
        last_name: ' Muriuki  ',
        phone: ' +254712345678 ',
      })

      expect(mockRegisterCustomer).toHaveBeenCalledWith({
        ...validValues,
        credential: 'google-credential',
      })
    })
  })

  describe('error handling', () => {
    it('notifies the first email error from the backend', async () => {
      const wrapper = wrapperFactory()
      mockRegisterCustomer.mockRejectedValue(
        axiosError({ email: ['Email already registered.', 'Second message.'] }),
      )

      await runSubmit()

      expect(mockNotifyError).toHaveBeenCalledWith('Email already registered.')
      expect(mockSetFieldError).not.toHaveBeenCalled()
      expect(wrapper.emitted('success')).toBeUndefined()
    })

    it('asks the user to sign in again and closes on a credential error', async () => {
      const wrapper = wrapperFactory()
      mockRegisterCustomer.mockRejectedValue(axiosError({ credential: ['Token expired.'] }))

      await runSubmit()

      expect(mockNotifyError).toHaveBeenCalledWith('Please sign in with Google again.')
      expect(wrapper.emitted('close')).toHaveLength(1)
      expect(wrapper.emitted('success')).toBeUndefined()
    })

    it('maps other backend validation errors to field errors', async () => {
      const wrapper = wrapperFactory()
      mockRegisterCustomer.mockRejectedValue(
        axiosError({
          phone: ['Enter a valid phone number.'],
          date_of_birth: ['You must be at least 18.'],
          last_name: [],
        }),
      )

      await runSubmit()

      expect(mockSetFieldError).toHaveBeenCalledTimes(2)
      expect(mockSetFieldError).toHaveBeenCalledWith('phone', 'Enter a valid phone number.')
      expect(mockSetFieldError).toHaveBeenCalledWith('date_of_birth', 'You must be at least 18.')
      expect(mockNotifyError).not.toHaveBeenCalled()
      expect(wrapper.emitted('success')).toBeUndefined()
    })

    it('notifies the message of a generic Error', async () => {
      wrapperFactory()
      mockRegisterCustomer.mockRejectedValue(new Error('Network down'))

      await runSubmit()

      expect(mockNotifyError).toHaveBeenCalledWith('Network down')
    })

    it('falls back to a generic message for unknown rejections', async () => {
      wrapperFactory()
      mockRegisterCustomer.mockRejectedValue('unexpected string error')

      await runSubmit()

      expect(mockNotifyError).toHaveBeenCalledWith('Registration failed.')
    })

    it('falls back to a generic message for an axios error without a response', async () => {
      wrapperFactory()
      mockRegisterCustomer.mockRejectedValue(axiosError())

      await runSubmit()

      expect(mockNotifyError).toHaveBeenCalledWith('Registration failed.')
    })
  })

  describe('submitting state', () => {
    it('shows the loading text, spinner and disables buttons while submitting', async () => {
      const wrapper = wrapperFactory()

      let resolveRegister: (value: string) => void = () => undefined
      mockRegisterCustomer.mockImplementation(
        () =>
          new Promise<string>((resolve) => {
            resolveRegister = resolve
          }),
      )

      const pending = runSubmit()
      await nextTick()

      const submitButton = wrapper.find('button[type="submit"]')
      const cancelButton = wrapper.find('button[type="button"]')

      expect(submitButton.text()).toContain('Registering...')
      expect(wrapper.find('.submit-spinner').exists()).toBe(true)
      expect(submitButton.attributes('disabled')).toBeDefined()
      expect(cancelButton.attributes('disabled')).toBeDefined()

      resolveRegister('Done')
      await pending
      await nextTick()

      expect(wrapper.find('button[type="submit"]').text()).toContain('Complete Sign Up')
      expect(wrapper.find('.submit-spinner').exists()).toBe(false)
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    })

    it('resets the submitting state after a failure', async () => {
      const wrapper = wrapperFactory()
      mockRegisterCustomer.mockRejectedValue(new Error('Boom'))

      await runSubmit()
      await nextTick()

      expect(wrapper.find('.submit-spinner').exists()).toBe(false)
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    })
  })
})
