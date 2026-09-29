import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthCard from '../AuthCard.vue'

// --- Types -------------------------------------------------------------

type SetFieldErrorFn = (field: string, message: string | undefined) => void
type HandleSubmitFn = (values: Record<string, unknown>) => unknown
type AuthFn = (payload: Record<string, unknown>) => Promise<string>
type CustomValidatorFn = (
  values: Record<string, unknown>,
  setFieldError: SetFieldErrorFn,
) => Promise<boolean>

type UseFormReturn = {
  handleSubmit: (fn: (values: Record<string, unknown>) => Promise<void>) => HandleSubmitFn
  setFieldError: SetFieldErrorFn
}

// --- Mocks -----------------------------------------------------------------

const mockHandleSubmit = vi.fn<HandleSubmitFn>()
const mockSetFieldError = vi.fn<SetFieldErrorFn>()

vi.mock('vee-validate', () => ({
  useForm: vi.fn<(config: { initialValues: Record<string, unknown> }) => UseFormReturn>(() => ({
    handleSubmit: (fn: (values: Record<string, unknown>) => Promise<void>) => {
      mockHandleSubmit.mockImplementation(fn)
      return (values: Record<string, unknown>) => mockHandleSubmit(values)
    },
    setFieldError: mockSetFieldError,
  })),
}))

const mockNotifySuccess = vi.fn<(message: string) => void>()
const mockNotifyError = vi.fn<(message: string) => void>()
const mockRouterPush = vi.fn<(to: { name: string }) => void>()

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: () => ({
    $notifySuccess: mockNotifySuccess,
    $notifyError: mockNotifyError,
    $router: { push: mockRouterPush },
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
    placeholder: { type: String, default: '' },
    rules: { type: String, default: '' },
    icon: { type: [Object, Function], default: null },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        class: 'input-field-stub',
        name: props.name,
        placeholder: props.placeholder,
        value: props.modelValue,
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).value),
      })
  },
})

const BaseButtonStub = defineComponent({
  name: 'BaseButton',
  props: {
    type: { type: String, default: 'button' },
    disabled: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    return () =>
      h(
        'button',
        {
          type: props.type,
          disabled: props.disabled,
          'aria-busy': props.disabled ? 'true' : 'false',
        },
        slots.default?.(),
      )
  },
})

const RouterLinkStub = defineComponent({
  name: 'RouterLink',
  props: {
    to: { type: Object, default: () => ({}) },
  },
  setup(props, { slots }) {
    return () => h('a', { 'data-to': props.to?.name }, slots.default?.())
  },
})

// --- Fixtures ---------------------------------------------------------------

const baseFormFields = [
  {
    key: 'email',
    label: 'Email Address',
    type: 'email',
    specificType: 'email',
    placeholder: 'Enter Email Address',
    rules: 'required|email',
  },
  {
    key: 'password',
    label: 'Password',
    type: 'password',
    specificType: 'password',
    placeholder: 'Enter Password',
    rules: 'required|min:6',
  },
]

const currentRoutes = {
  prev: { label: 'Forgot Password?', name: 'forgot-password' },
  next: { name: 'dashboard' },
}

const wrapperFactory = (
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): VueWrapper => {
  return mount(AuthCard, {
    props: {
      heading: 'Welcome Back',
      formFields: baseFormFields,
      authFn: vi.fn<AuthFn>().mockResolvedValue('Success message'),
      currentRoutes,
      ...props,
    },
    slots,
    global: {
      stubs: {
        InputField: InputFieldStub,
        BaseButton: BaseButtonStub,
        RouterLink: RouterLinkStub,
      },
    },
  })
}

describe('AuthCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the heading and default subtitle', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('h1').text()).toBe('Welcome Back')
      expect(wrapper.find('h2').text()).toBe('SMARTPACK ADMIN PLATFORM')
    })

    it('renders a custom subtitle when provided', () => {
      const wrapper = wrapperFactory({ subtitle: 'Custom Subtitle' })

      expect(wrapper.find('h2').text()).toBe('Custom Subtitle')
    })

    it('renders the description when provided', () => {
      const wrapper = wrapperFactory({ description: 'Please sign in to continue' })

      expect(wrapper.find('.card-description').exists()).toBe(true)
      expect(wrapper.find('.card-description').text()).toBe('Please sign in to continue')
    })

    it('does not render description when not provided', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('.card-description').exists()).toBe(false)
    })

    it('renders a labeled InputField for each form field', () => {
      const wrapper = wrapperFactory()

      const labels = wrapper.findAll('label')
      const inputs = wrapper.findAll('.input-field-stub')

      expect(labels).toHaveLength(2)
      expect(labels[0]?.text()).toBe('Email Address')
      expect(labels[1]?.text()).toBe('Password')

      expect(inputs).toHaveLength(2)
      expect(inputs[0]?.attributes('name')).toBe('email')
      expect(inputs[1]?.attributes('name')).toBe('password')
    })

    it('renders the default submit button text', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('button[type="submit"]').text()).toContain('Authenticate')
    })

    it('renders a string btnText as-is', () => {
      const wrapper = wrapperFactory({ btnText: 'Sign In' })

      expect(wrapper.find('button[type="submit"]').text()).toContain('Sign In')
    })

    it('renders the normal state of an object btnText', () => {
      const wrapper = wrapperFactory({
        btnText: { normal: 'Log In', loading: 'Logging in...' },
      })

      expect(wrapper.find('button[type="submit"]').text()).toContain('Log In')
    })
  })

  describe('navigation link / slot', () => {
    it('renders the forgot-password link when no default slot is provided', () => {
      const wrapper = wrapperFactory()

      const link = wrapper.findComponent(RouterLinkStub)

      expect(link.exists()).toBe(true)
      expect(link.text()).toBe('Forgot Password?')
      expect(link.props('to')).toEqual({ name: 'forgot-password' })
    })

    it('renders the default slot instead of the link when provided', () => {
      const wrapper = wrapperFactory(
        {},
        { default: '<span class="custom-slot">Custom footer</span>' },
      )

      expect(wrapper.find('.custom-slot').exists()).toBe(true)
      expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false)
    })
  })

  describe('form submission', () => {
    it('calls authFn with form values merged with extraParams and notifies success', async () => {
      const authFn = vi
        .fn<(payload: Record<string, unknown>) => Promise<string>>()
        .mockResolvedValue('Logged in!')
      const wrapper = wrapperFactory({
        authFn,
        extraParams: { deviceId: 'abc123' },
      })

      await wrapper.find('form').trigger('submit')
      await mockHandleSubmit({ email: 'a@b.com', password: 'secret' })
      await wrapper.vm.$nextTick()

      expect(authFn).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'secret',
        deviceId: 'abc123',
      })
      expect(mockNotifySuccess).toHaveBeenCalledWith('Logged in!')
      expect(mockRouterPush).toHaveBeenCalledWith({ name: 'dashboard' })
    })

    it('skips submission when customValidator returns false', async () => {
      const authFn = vi
        .fn<(payload: Record<string, unknown>) => Promise<string>>()
        .mockResolvedValue('Logged in!')
      const customValidator = vi.fn<CustomValidatorFn>().mockResolvedValue(false)
      const wrapper = wrapperFactory({ authFn, customValidator })

      await wrapper.find('form').trigger('submit')
      await mockHandleSubmit({ email: 'a@b.com', password: 'secret' })

      expect(customValidator).toHaveBeenCalledWith(
        { email: 'a@b.com', password: 'secret' },
        mockSetFieldError,
      )
      expect(authFn).not.toHaveBeenCalled()
      expect(mockNotifySuccess).not.toHaveBeenCalled()
    })

    it('proceeds with submission when customValidator returns true', async () => {
      const authFn = vi.fn<AuthFn>().mockResolvedValue('Logged in!')
      const customValidator = vi.fn<CustomValidatorFn>().mockResolvedValue(true)
      const wrapper = wrapperFactory({ authFn, customValidator })

      await wrapper.find('form').trigger('submit')
      await mockHandleSubmit({ email: 'a@b.com', password: 'secret' })

      expect(authFn).toHaveBeenCalled()
    })

    it('skips default navigation when resolveNextRoute resolves false', async () => {
      const resolveNextRoute = vi.fn<() => Promise<boolean>>().mockResolvedValue(false)
      const wrapper = wrapperFactory({ resolveNextRoute })

      await wrapper.find('form').trigger('submit')
      await mockHandleSubmit({ email: 'a@b.com', password: 'secret' })

      expect(resolveNextRoute).toHaveBeenCalled()
      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('navigates to next route when resolveNextRoute resolves true', async () => {
      const resolveNextRoute = vi.fn<() => Promise<boolean>>().mockResolvedValue(true)
      const wrapper = wrapperFactory({ resolveNextRoute })

      await wrapper.find('form').trigger('submit')
      await mockHandleSubmit({ email: 'a@b.com', password: 'secret' })

      expect(mockRouterPush).toHaveBeenCalledWith({ name: 'dashboard' })
    })

    it('notifies the error message when authFn rejects with an AuthError', async () => {
      const authFn = vi
        .fn<(payload: Record<string, unknown>) => Promise<string>>()
        .mockRejectedValue({ message: 'Invalid credentials' })
      const wrapper = wrapperFactory({ authFn })

      await wrapper.find('form').trigger('submit')
      await mockHandleSubmit({ email: 'a@b.com', password: 'wrong' })

      expect(mockNotifyError).toHaveBeenCalledWith('Invalid credentials')
      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('falls back to a generic message when the rejection has no message', async () => {
      const authFn = vi
        .fn<(payload: Record<string, unknown>) => Promise<string>>()
        .mockRejectedValue('unexpected string error')
      const wrapper = wrapperFactory({ authFn })

      await wrapper.find('form').trigger('submit')
      await mockHandleSubmit({ email: 'a@b.com', password: 'wrong' })

      expect(mockNotifyError).toHaveBeenCalledWith('Something went wrong')
    })

    it('redirects to forgot-password when the error has reload set', async () => {
      const authFn = vi
        .fn<(payload: Record<string, unknown>) => Promise<string>>()
        .mockRejectedValue({ message: 'Token expired', reload: true })
      const wrapper = wrapperFactory({ authFn })

      await wrapper.find('form').trigger('submit')
      await mockHandleSubmit({ email: 'a@b.com', password: 'wrong' })

      expect(mockNotifyError).toHaveBeenCalledWith('Token expired')
      expect(mockRouterPush).toHaveBeenCalledWith({ name: 'forgot-password' })
    })

    it('does not redirect when the error has no reload flag', async () => {
      const authFn = vi
        .fn<(payload: Record<string, unknown>) => Promise<string>>()
        .mockRejectedValue({ message: 'Invalid credentials' })
      const wrapper = wrapperFactory({ authFn })

      await wrapper.find('form').trigger('submit')
      await mockHandleSubmit({ email: 'a@b.com', password: 'wrong' })

      expect(mockRouterPush).not.toHaveBeenCalled()
    })
  })

  describe('submitting state', () => {
    it('shows the loading text and spinner while submitting', async () => {
      let resolveAuth: (value: string) => void = () => {}
      const authFn = vi.fn<(payload: Record<string, unknown>) => Promise<string>>(
        () =>
          new Promise<string>((resolve) => {
            resolveAuth = resolve
          }),
      )

      const wrapper = wrapperFactory({
        authFn,
        btnText: { normal: 'Log In', loading: 'Logging in...' },
      })

      await wrapper.find('form').trigger('submit')
      const submitPromise = mockHandleSubmit({ email: 'a@b.com', password: 'secret' })
      await wrapper.vm.$nextTick()

      expect(wrapper.find('button[type="submit"]').text()).toContain('Logging in...')
      expect(wrapper.find('.submit-spinner').exists()).toBe(true)
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

      resolveAuth('Done')
      await submitPromise
      await wrapper.vm.$nextTick()

      expect(wrapper.find('button[type="submit"]').text()).toContain('Log In')
      expect(wrapper.find('.submit-spinner').exists()).toBe(false)
    })
  })
})
