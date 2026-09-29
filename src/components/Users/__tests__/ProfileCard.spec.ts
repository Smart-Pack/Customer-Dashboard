import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EditMePayload, User } from '@/api/modules/users'
import { mockUser } from '@/tests/constants'

import ProfileCard from '../ProfileCard.vue'

// --- Types -------------------------------------------------------------

type UseFormReturn = {
  errors: Record<string, string | undefined>
  handleSubmit: (
    fn: (values: Record<string, unknown>) => Promise<void>,
  ) => (values: Record<string, unknown>) => unknown
  resetForm: ReturnType<typeof vi.fn>
  setFieldError: (field: string, message: string | undefined) => void
}

// --- Mocks -------------------------------------------------------------

const mockGetMe = vi.hoisted(() => vi.fn<() => Promise<User>>())

const mockEditMe = vi.hoisted(() => vi.fn<(payload: EditMePayload) => Promise<User>>())

const mockResetForm = vi.hoisted(() => vi.fn<() => void>())

const mockSetFieldError = vi.hoisted(() =>
  vi.fn<(field: string, message: string | undefined) => void>(),
)

const mockSetLoggedInUser = vi.hoisted(() => vi.fn<(user: User) => void>())

const mockNotifySuccess = vi.hoisted(() => vi.fn<(message: string) => void>())

const mockNotifyError = vi.hoisted(() => vi.fn<(message: string) => void>())

const mockIsAxiosError = vi.hoisted(() => vi.fn<(payload: unknown) => boolean>())

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()

  return {
    ...actual,
    isAxiosError: mockIsAxiosError,
  }
})

vi.mock('@/api/modules/users', () => ({
  getMe: mockGetMe,
  editMe: mockEditMe,
}))

vi.mock('vee-validate', () => ({
  useForm: vi.fn<(config: { initialValues: Record<string, unknown> }) => UseFormReturn>(
    (_config) => ({
      errors: {},
      handleSubmit: (fn: (values: Record<string, unknown>) => Promise<void>) => {
        return fn
      },
      resetForm: mockResetForm,
      setFieldError: mockSetFieldError,
    }),
  ),
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => ({
    loggedInUser: null,
    setLoggedInUser: mockSetLoggedInUser,
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
    specificType: {
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
    disabled: {
      type: Boolean,
      default: false,
    },
    iconRight: {
      type: [Object, Function],
      default: null,
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
        class: 'input-field-stub',
        name: props.name,
        placeholder: props.placeholder,
        value: props.modelValue,
        disabled: props.disabled,
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).value),
      })
  },
})

const UserIconStub = defineComponent({
  name: 'UserIcon',
  setup() {
    return () => h('svg', { class: 'user-icon-stub' })
  },
})

const LockClosedIconStub = defineComponent({
  name: 'LockClosedIcon',
  setup() {
    return () => h('svg', { class: 'lock-closed-icon-stub' })
  },
})

const LockOpenIconStub = defineComponent({
  name: 'LockOpenIcon',
  setup() {
    return () => h('svg', { class: 'lock-open-icon-stub' })
  },
})

// --- Helpers ------------------------------------------------------------

const globalStubs = {
  InputField: InputFieldStub,
  UserIcon: UserIconStub,
  LockClosedIcon: LockClosedIconStub,
  LockOpenIcon: LockOpenIconStub,
}

const wrapperFactory = (): VueWrapper => {
  return mount(ProfileCard, {
    global: {
      stubs: globalStubs,
    },
  })
}

// --- Tests -------------------------------------------------------------

describe('ProfileCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetMe.mockResolvedValue(mockUser)
    mockIsAxiosError.mockReturnValue(false)
  })

  describe('profile loading', () => {
    it('fetches the authenticated user when mounted', async () => {
      mount(ProfileCard, {
        global: {
          stubs: globalStubs,
        },
      })

      await nextTick()

      expect(mockGetMe).toHaveBeenCalledTimes(1)
    })

    it('updates the auth store with the fetched user', async () => {
      mount(ProfileCard, {
        global: {
          stubs: globalStubs,
        },
      })

      await nextTick()

      expect(mockSetLoggedInUser).toHaveBeenCalledExactlyOnceWith(mockUser)
    })

    it('notifies an error when loading the profile fails', async () => {
      mockGetMe.mockRejectedValue(new Error('Unable to load profile'))

      mount(ProfileCard, {
        global: {
          stubs: globalStubs,
        },
      })

      await nextTick()

      expect(mockNotifyError).toHaveBeenCalledWith('Unable to load profile')
    })
  })

  describe('rendering', () => {
    it('renders the profile description', async () => {
      const wrapper = wrapperFactory()

      await nextTick()

      expect(wrapper.text()).toContain('Keep your personal and contact information up to date.')
    })

    it('renders the edit profile button', async () => {
      const wrapper = wrapperFactory()

      await nextTick()

      expect(wrapper.text()).toContain('Edit Profile')
    })

    it('renders the basic information fields', async () => {
      const wrapper = wrapperFactory()

      await nextTick()

      expect(wrapper.find('input[name="first_name"]').exists()).toBe(true)
      expect(wrapper.find('input[name="last_name"]').exists()).toBe(true)
      expect(wrapper.find('input[name="gender"]').exists()).toBe(true)
      expect(wrapper.find('input[name="date_of_birth"]').exists()).toBe(true)
    })

    it('renders the contact information fields', async () => {
      const wrapper = wrapperFactory()

      await nextTick()

      expect(wrapper.find('input[name="email"]').exists()).toBe(true)
      expect(wrapper.find('input[name="phone"]').exists()).toBe(true)
    })

    it('renders the user icon when no profile picture exists', async () => {
      const wrapper = wrapperFactory()

      await nextTick()

      expect(wrapper.find('.user-icon-stub').exists()).toBe(true)
      expect(wrapper.find('img').exists()).toBe(false)
    })
    it('renders the profile picture when available', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(1234567890)

      const user: User = {
        ...mockUser,
        profile_pic: 'https://example.com/profile.jpg',
      }

      mockGetMe.mockResolvedValue(user)

      const wrapper = wrapperFactory()
      await flushPromises()

      const image = wrapper.get('img')

      expect(image.attributes('src')).toBe('https://example.com/profile.jpg?v=1234567890')
      expect(image.attributes('alt')).toBe('Profile Picture')

      vi.restoreAllMocks()
    })
    it('updates the profile picture preview when a new file is selected', async () => {
      const wrapper = await wrapperFactory()

      await flushPromises()
      await wrapper.get('[data-testid="edit-profile-button"]').trigger('click')

      const input = wrapper.get('[data-testid="profile-picture-input"]')
      const file = new File(['x'], 'photo.png', { type: 'image/png' })

      Object.defineProperty(input.element, 'files', {
        value: [file],
        configurable: true,
      })

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')

      await input.trigger('change')

      const image = wrapper.get('img')

      expect(image.attributes('src')).toBe('blob:preview')

      vi.restoreAllMocks()
    })
  })

  describe('edit mode', () => {
    it('enters edit mode when the edit profile button is clicked', async () => {
      const wrapper = await wrapperFactory()

      await flushPromises()

      const editButton = wrapper.get('[data-testid="edit-profile-button"]')

      expect(editButton.text()).toBe('Edit Profile')

      await editButton.trigger('click')

      expect(editButton.text()).toBe('Cancel Editing')
    })

    it('shows the profile picture input in edit mode', async () => {
      const wrapper = await wrapperFactory()

      await flushPromises()

      const editButton = wrapper.get('[data-testid="edit-profile-button"]')

      await editButton.trigger('click')

      expect(wrapper.get('[data-testid="profile-picture-input"]')).toBeDefined()
    })

    it('cancels editing and restores the view state', async () => {
      const wrapper = await wrapperFactory()

      await flushPromises()

      const editButton = wrapper.get('[data-testid="edit-profile-button"]')

      expect(editButton.text()).toBe('Edit Profile')

      await editButton.trigger('click')

      expect(editButton.text()).toBe('Cancel Editing')
      expect(wrapper.find('[data-testid="profile-picture-input"]').exists()).toBe(true)

      await editButton.trigger('click')

      expect(editButton.text()).toBe('Edit Profile')
      expect(wrapper.find('[data-testid="profile-picture-input"]').exists()).toBe(false)
    })
    it('clears the profile picture error when a file is selected', async () => {
      const wrapper = await wrapperFactory()

      await flushPromises()
      await wrapper.get('[data-testid="edit-profile-button"]').trigger('click')

      const input = wrapper.get('[data-testid="profile-picture-input"]')
      const file = new File(['x'], 'photo.png', { type: 'image/png' })

      Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
      URL.createObjectURL = vi.fn<(obj: Blob | MediaSource) => string>(() => 'blob:preview')

      await input.trigger('change')

      expect(mockSetFieldError).toHaveBeenCalledWith('profile_pic', undefined)
      expect(wrapper.find('img').exists()).toBe(true)
    })

    it('rejects non-image files', async () => {
      const wrapper = await wrapperFactory()

      await flushPromises()
      await wrapper.get('[data-testid="edit-profile-button"]').trigger('click')

      const input = wrapper.get('[data-testid="profile-picture-input"]')
      const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })

      Object.defineProperty(input.element, 'files', { value: [file], configurable: true })

      await input.trigger('change')

      expect(mockNotifyError).toHaveBeenCalledWith('Please select an image file.')
      expect(wrapper.find('img').exists()).toBe(false)
    })
  })

  describe('submitting state', () => {
    it('shows the saving state while the profile is being updated', async () => {
      const wrapper = await wrapperFactory()

      await flushPromises()

      await wrapper.get('[data-testid="edit-profile-button"]').trigger('click')

      let resolveEditMe!: (user: User) => void

      mockEditMe.mockImplementation(
        () =>
          new Promise<User>((resolve) => {
            resolveEditMe = resolve
          }),
      )

      await wrapper.get('[data-testid="save-profile-button"]').trigger('submit')

      await nextTick()

      const saveButton = wrapper.get('[data-testid="save-profile-button"]')

      expect(saveButton.text()).toContain('Saving...')
      expect(saveButton.attributes('disabled')).toBeDefined()

      resolveEditMe(mockUser)

      await flushPromises()
    })
  })
})
