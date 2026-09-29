import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InputField from '../InputField.vue'

const mockSetValue = vi.fn<(value: unknown) => void>()
const mockValidate = vi.fn<() => void>()

const mockFieldValue = ref<unknown>('')

vi.mock('vee-validate', () => ({
  useField: vi.fn<
    () => {
      value: typeof mockFieldValue
      setValue: typeof mockSetValue
      errorMessage: ReturnType<typeof ref<string>>
      handleBlur: () => void
      validate: typeof mockValidate
    }
  >(() => ({
    value: mockFieldValue,
    setValue: mockSetValue,
    errorMessage: ref(''),
    handleBlur: vi.fn<() => void>(),
    validate: mockValidate,
  })),
}))

const MailIcon = defineComponent({
  name: 'MailIcon',
  setup() {
    return () => h('svg', { class: 'mail-icon' })
  },
})

const EyeIcon = defineComponent({
  name: 'EyeIcon',
  setup() {
    return () => h('svg', { class: 'eye-icon' })
  },
})

const EyeSlashIcon = defineComponent({
  name: 'EyeSlashIcon',
  setup() {
    return () => h('svg', { class: 'eye-slash-icon' })
  },
})
const VueTelInputStub = defineComponent({
  name: 'VueTelInput',
  props: {
    modelValue: {
      type: [String, Number],
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
    defaultCountry: {
      type: String,
      default: '',
    },
    autocomplete: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'blur'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        class: 'vue-tel-input-mock',
        value: props.modelValue,
        placeholder: props.placeholder,
        autocomplete: props.autocomplete,
        'data-default-country': props.defaultCountry,
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).value),
        onBlur: () => emit('blur'),
      })
  },
})

const wrapperFactory = (
  props: Record<string, unknown> = {},
  attrs: Record<string, unknown> = {},
): VueWrapper => {
  return mount(InputField, {
    props: {
      name: 'test',
      ...props,
    },
    attrs,
    global: {
      stubs: {
        MailIcon,
        EyeIcon,
        EyeSlashIcon,
        VueTelInput: VueTelInputStub,
      },
    },
  })
}

describe('InputField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFieldValue.value = ''
  })

  describe('default input', () => {
    it('renders a standard input by default', () => {
      const wrapper = wrapperFactory()

      const input = wrapper.find('input:not([type="file"])')

      expect(input.exists()).toBe(true)
      expect(input.attributes('name')).toBe('test')
      expect(input.attributes('type')).toBe('text')
    })

    it('renders the placeholder prop', () => {
      const wrapper = wrapperFactory({
        placeholder: 'Enter value',
      })

      expect(wrapper.find('input').attributes('placeholder')).toBe('Enter value')
    })

    it('uses the aria label when provided', () => {
      const wrapper = wrapperFactory({
        ariaLabel: 'Test field',
        placeholder: 'Enter value',
      })

      expect(wrapper.find('input').attributes('aria-label')).toBe('Test field')
    })

    it('falls back to the placeholder for aria-label', () => {
      const wrapper = wrapperFactory({
        placeholder: 'Enter value',
      })

      expect(wrapper.find('input').attributes('aria-label')).toBe('Enter value')
    })

    it('passes additional attributes to the input', () => {
      const wrapper = wrapperFactory(
        {
          placeholder: 'Enter value',
        },
        {
          id: 'test-input',
          'data-testid': 'input-field',
        },
      )

      const input = wrapper.find('input')

      expect(input.attributes('id')).toBe('test-input')
      expect(input.attributes('data-testid')).toBe('input-field')
    })
  })

  describe('specific types', () => {
    it('applies email defaults', () => {
      const wrapper = wrapperFactory({
        name: 'email',
        specificType: 'email',
      })

      const input = wrapper.find('input')

      expect(input.attributes('type')).toBe('email')
      expect(input.attributes('placeholder')).toBe('Enter Email Address')
      expect(input.attributes('autocomplete')).toBe('email')
      expect(wrapper.find('.field-icon').exists()).toBe(true)
    })

    it('applies first name defaults', () => {
      const wrapper = wrapperFactory({
        name: 'firstName',
        specificType: 'fname',
      })

      const input = wrapper.find('input')

      expect(input.attributes('type')).toBe('text')
      expect(input.attributes('placeholder')).toBe('Enter First Name')
      expect(input.attributes('autocomplete')).toBe('given-name')
    })

    it('applies last name defaults', () => {
      const wrapper = wrapperFactory({
        name: 'lastName',
        specificType: 'lname',
      })

      const input = wrapper.find('input')

      expect(input.attributes('placeholder')).toBe('Enter Last Name')
      expect(input.attributes('autocomplete')).toBe('family-name')
    })

    it('applies password defaults', () => {
      const wrapper = wrapperFactory({
        name: 'password',
        specificType: 'password',
      })

      const input = wrapper.find('input')

      expect(input.attributes('type')).toBe('password')
      expect(input.attributes('placeholder')).toBe('Enter Password')
      expect(input.attributes('autocomplete')).toBe('current-password')
      expect(wrapper.find('button').exists()).toBe(true)
    })

    it('renders phone input for phone specificType', () => {
      const wrapper = wrapperFactory({
        name: 'phone',
        specificType: 'phone',
      })

      expect(wrapper.find('.vue-tel-input-mock').exists()).toBe(true)
      expect(wrapper.find('.vue-tel-input-mock').attributes('data-default-country')).toBe('ke')
    })
  })

  describe('select', () => {
    it('renders a select when variant is select', () => {
      const wrapper = wrapperFactory({
        name: 'gender',
        variant: 'select',
        options: [
          { value: '', label: 'Select Gender' },
          { value: 'Male', label: 'Male' },
          { value: 'Female', label: 'Female' },
        ],
      })

      const select = wrapper.find('select')

      expect(select.exists()).toBe(true)
      expect(select.findAll('option')).toHaveLength(3)
      expect(select.findAll('option')[1]?.text()).toBe('Male')
    })

    it('uses gender defaults for gender specificType', () => {
      const wrapper = wrapperFactory({
        name: 'gender',
        specificType: 'gender',
      })

      const select = wrapper.find('select')

      expect(select.exists()).toBe(true)
      expect(select.findAll('option')).toHaveLength(4)
      expect(select.findAll('option')[0]?.text()).toBe('Select Gender')
    })

    it('uses user defaults for user specificType', () => {
      const wrapper = wrapperFactory({
        name: 'user',
        specificType: 'user',
      })

      const select = wrapper.find('select')

      expect(select.exists()).toBe(true)
      expect(select.findAll('option')).toHaveLength(3)
      expect(select.findAll('option')[1]?.text()).toBe('Admin')
    })

    it('uses country defaults for country specificType', () => {
      const wrapper = wrapperFactory({
        name: 'country',
        specificType: 'country',
      })

      const select = wrapper.find('select')

      expect(select.exists()).toBe(true)
      expect(select.findAll('option').length).toBeGreaterThan(1)
      expect(select.find('option').text()).toBe('Select Country')
    })
  })

  describe('textarea', () => {
    it('renders a textarea when variant is textarea', () => {
      const wrapper = wrapperFactory({
        variant: 'textarea',
        placeholder: 'Enter description',
      })

      const textarea = wrapper.find('textarea')

      expect(textarea.exists()).toBe(true)
      expect(textarea.attributes('placeholder')).toBe('Enter description')
    })

    it('uses the resolved type on textarea', () => {
      const wrapper = wrapperFactory({
        variant: 'textarea',
        type: 'text',
      })

      expect(wrapper.find('textarea').attributes('type')).toBe('text')
    })
  })

  describe('file input', () => {
    it('renders a file input when resolved variant is input', () => {
      const wrapper = wrapperFactory({
        variant: 'input',
        name: 'document',
        fileType: 'image/*',
      })

      const input = wrapper.find('input[type="file"]')

      expect(input.exists()).toBe(true)
      expect(input.attributes('accept')).toBe('image/*')
    })

    it('handles file selection', async () => {
      const wrapper = wrapperFactory({
        variant: 'input',
        name: 'document',
      })

      const file = new File(['test'], 'test.png', {
        type: 'image/png',
      })

      const input = wrapper.find('input[type="file"]')

      Object.defineProperty(input.element, 'files', {
        value: [file],
      })

      await input.trigger('change')

      expect(mockSetValue).toHaveBeenCalledWith(file)
    })

    it('sets null when no file is selected', async () => {
      const wrapper = wrapperFactory({
        variant: 'input',
        name: 'document',
      })

      const input = wrapper.find('input[type="file"]')

      Object.defineProperty(input.element, 'files', {
        value: [],
      })

      await input.trigger('change')

      expect(mockSetValue).toHaveBeenCalledWith(null)
    })
  })

  describe('icons', () => {
    it('renders the provided left icon', () => {
      const wrapper = wrapperFactory({
        icon: MailIcon,
      })

      expect(wrapper.find('.field-icon').exists()).toBe(true)
      expect(wrapper.find('.mail-icon').exists()).toBe(true)
    })

    it('renders the provided right icon', () => {
      const wrapper = wrapperFactory({
        iconRight: EyeIcon,
      })

      expect(wrapper.find('button').exists()).toBe(true)
      expect(wrapper.find('.eye-icon').exists()).toBe(true)
    })

    it('uses the correct input padding when icons are present', () => {
      const wrapper = wrapperFactory({
        icon: MailIcon,
        iconRight: EyeIcon,
      })

      const input = wrapper.find('input')

      expect(input.classes()).toContain('pl-11')
      expect(input.classes()).toContain('pr-11')
    })

    it('uses default padding when icons are absent', () => {
      const wrapper = wrapperFactory()

      const input = wrapper.find('input')

      expect(input.classes()).toContain('pl-3')
      expect(input.classes()).toContain('pr-3')
    })
  })

  describe('password visibility', () => {
    it('starts with password type hidden', () => {
      const wrapper = wrapperFactory({
        specificType: 'password',
      })

      expect(wrapper.find('input').attributes('type')).toBe('password')
      expect(wrapper.find('.eye-icon').exists()).toBe(true)
    })

    it('changes to text when the right icon is clicked', async () => {
      const wrapper = wrapperFactory({
        specificType: 'password',
      })

      await wrapper.find('button').trigger('click')

      expect(wrapper.find('input').attributes('type')).toBe('text')
      expect(wrapper.find('.eye-slash-icon').exists()).toBe(true)
    })

    it('sets aria-pressed when password is visible', async () => {
      const wrapper = wrapperFactory({
        specificType: 'password',
      })

      await wrapper.find('button').trigger('click')

      expect(wrapper.find('button').attributes('aria-pressed')).toBe('true')
    })
  })

  describe('clear button', () => {
    it('clears the value when iconRightClear is enabled', async () => {
      const wrapper = wrapperFactory({
        iconRight: EyeIcon,
        iconRightClear: true,
        modelValue: 'test value',
      })

      await wrapper.find('button').trigger('click')

      expect(mockSetValue).toHaveBeenCalledWith('')
    })
  })

  describe('validation', () => {
    it('passes the configured rules to useField', async () => {
      const { useField } = await import('vee-validate')

      wrapperFactory({
        name: 'email',
        rules: 'required|email',
      })

      expect(useField).toHaveBeenCalledWith(
        'email',
        'required|email',
        expect.objectContaining({
          initialValue: '',
          bails: true,
          label: 'email',
        }),
      )
    })

    it('uses the default rules for specific types', async () => {
      const { useField } = await import('vee-validate')

      wrapperFactory({
        name: 'email',
        specificType: 'email',
      })

      expect(useField).toHaveBeenCalledWith('email', 'required|email', expect.any(Object))
    })

    it('renders the validation error', async () => {
      const { useField } = await import('vee-validate')

      vi.mocked(useField).mockReturnValueOnce({
        value: ref(''),
        setValue: mockSetValue,
        errorMessage: ref('Email is required'),
        handleBlur: vi.fn<() => void>(),
        validate: mockValidate,
      } as never)

      const wrapper = wrapperFactory({
        name: 'email',
      })

      expect(wrapper.find('.field-error').text()).toBe('Email is required')
    })
  })

  describe('external value synchronization', () => {
    it('syncs modelValue changes when syncExternalValue is enabled', async () => {
      const modelValue = ref('initial')

      const wrapper = wrapperFactory({
        modelValue: modelValue.value,
        syncExternalValue: true,
      })

      modelValue.value = 'updated'

      await wrapper.setProps({
        modelValue: 'updated',
      })

      expect(mockSetValue).toHaveBeenCalledWith('updated')
    })

    it('does not sync modelValue when syncExternalValue is disabled', async () => {
      const wrapper = wrapperFactory({
        name: 'test',
        modelValue: 'initial',
        syncExternalValue: false,
      })

      await wrapper.setProps({
        modelValue: 'updated',
      })

      expect(mockSetValue).not.toHaveBeenCalled()
    })
  })

  describe('validator', () => {
    it('revalidates when validator changes and field has a value', async () => {
      mockFieldValue.value = 'test'

      const wrapper = wrapperFactory({
        name: 'file',
        validator: 'Image',
      })

      await wrapper.setProps({
        validator: 'Video',
      })

      expect(mockValidate).toHaveBeenCalled()
    })

    it('does not validate when validator changes and field is empty', async () => {
      mockFieldValue.value = ''

      const wrapper = wrapperFactory({
        name: 'file',
        validator: 'Image',
      })

      await wrapper.setProps({
        validator: 'Video',
      })

      expect(mockValidate).not.toHaveBeenCalled()
    })
  })

  describe('model updates', () => {
    it('emits update:modelValue when the field value changes', async () => {
      const wrapper = wrapperFactory()

      mockFieldValue.value = 'new value'

      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]).toEqual(['new value'])
    })
  })

  describe('right icon behavior', () => {
    it('toggles showPassword when clear mode is disabled', async () => {
      const wrapper = wrapperFactory({
        iconRight: EyeIcon,
      })

      await wrapper.find('button').trigger('click')

      expect(wrapper.find('.eye-icon').exists()).toBe(true)
    })

    it('clears the field instead of toggling when iconRightClear is enabled', async () => {
      const wrapper = wrapperFactory({
        iconRight: EyeIcon,
        iconRightClear: true,
      })

      await wrapper.find('button').trigger('click')

      expect(mockSetValue).toHaveBeenCalledWith('')
    })
  })

  describe('custom classes', () => {
    it('applies inputClass to the input', () => {
      const wrapper = wrapperFactory({
        inputClass: 'custom-input-class',
      })

      expect(wrapper.find('input').classes()).toContain('custom-input-class')
    })

    it('applies iconClass to icons', () => {
      const wrapper = wrapperFactory({
        icon: MailIcon,
        iconClass: 'custom-icon-class',
      })

      expect(wrapper.find('.mail-icon').classes()).toContain('custom-icon-class')
    })
  })
})
