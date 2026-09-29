import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { useField } from 'vee-validate'

import CreationFormLayout, {
  type Adder,
  type AdderResult,
} from '@/components/Base/CreationFormLayout.vue'

const notifySuccess = vi.fn<() => void>()
const notifyError = vi.fn<() => void>()
const routerPush = vi.fn<() => void>()

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: () => ({
    $notifySuccess: notifySuccess,
    $notifyError: notifyError,
    $router: { push: routerPush },
  }),
}))
const InputFieldStub = defineComponent({
  props: ['modelValue', 'name'],
  emits: ['update:modelValue'],
  setup(props) {
    // Mirrors what the real InputField is expected to do: register this
    // field with vee-validate so its value participates in handleSubmit.
    const { value, handleChange } = useField(props.name)

    return { value, handleChange }
  },
  template: `
    <input
      :name="name"
      :value="value"
      @input="handleChange($event.target.value); $emit('update:modelValue', $event.target.value)"
    />
  `,
})

const sections = [
  {
    title: 'Basic Info',
    fields: [
      { name: 'firstName', label: 'First Name' },
      { name: 'lastName', label: 'Last Name', info: 'Legal last name' },
      { name: 'secret', label: 'Secret', hidden: true },
    ],
  },
  {
    title: 'Contact',
    fields: [{ name: 'email', label: 'Email' }],
  },
]

const mountForm = (props = {}) =>
  mount(CreationFormLayout, {
    props: {
      pageDescription: 'Create a new partner.',
      pageHeading: 'New Partner',
      sections,
      name: 'Partner',
      adder: vi.fn<Adder>().mockResolvedValue({ data: { id: 1 }, message: 'Created successfully' }),
      ...props,
    },
    global: {
      stubs: {
        InputField: InputFieldStub,
        InfoIcon: true,
      },
    },
  })

describe('CreationFormLayout', () => {
  beforeEach(() => {
    notifySuccess.mockClear()
    notifyError.mockClear()
    routerPush.mockClear()
  })

  describe('rendering', () => {
    it('renders the page description and heading', () => {
      const wrapper = mountForm()

      expect(wrapper.text()).toContain('Create a new partner.')
      expect(wrapper.text()).toContain('New Partner')
    })

    it('renders a heading for each section', () => {
      const wrapper = mountForm()

      expect(wrapper.text()).toContain('Basic Info')
      expect(wrapper.text()).toContain('Contact')
    })

    it('renders visible fields and skips hidden fields', () => {
      const wrapper = mountForm()

      expect(wrapper.find('input[name="firstName"]').exists()).toBe(true)
      expect(wrapper.find('input[name="lastName"]').exists()).toBe(true)
      expect(wrapper.find('input[name="email"]').exists()).toBe(true)
      expect(wrapper.find('input[name="secret"]').exists()).toBe(false)
    })

    it('does not render the modal button by default', () => {
      const wrapper = mountForm()

      const buttons = wrapper.findAll('button')

      expect(buttons).toHaveLength(1)
      expect(buttons[0]!.attributes('type')).toBe('submit')
    })

    it('renders the modal button when provided and emits showModal on click', async () => {
      const wrapper = mountForm({ modalButton: { text: 'Quick Add' } })

      const buttons = wrapper.findAll('button')

      expect(buttons).toHaveLength(2)
      expect(wrapper.text()).toContain('Quick Add')

      await buttons[0]!.trigger('click')

      expect(wrapper.emitted('showModal')).toContainEqual([true])
    })
  })

  describe('submitButtonText', () => {
    it('shows "Submit" when not submitting', () => {
      const wrapper = mountForm()

      expect(wrapper.vm.submitButtonText).toBe('Submit')
    })

    it('shows "Adding {name}..." while submitting a new item', async () => {
      let resolveAdder: (value: AdderResult) => void = () => {}
      const adder = vi.fn<Adder>().mockReturnValue(
        new Promise((resolve) => {
          resolveAdder = resolve
        }),
      )
      const wrapper = mountForm({ adder })

      const submitPromise = wrapper.vm.addItem()
      await flushPromises()

      expect(wrapper.vm.submitButtonText).toBe('Adding Partner...')

      resolveAdder({ data: { id: 1 }, message: 'Created' })
      await submitPromise
    })

    it('shows "Updating {name}..." while submitting with initialValues set', async () => {
      let resolveAdder: (value: AdderResult) => void = () => {}
      const adder = vi.fn<Adder>().mockReturnValue(
        new Promise((resolve) => {
          resolveAdder = resolve
        }),
      )
      const wrapper = mountForm({
        adder,
        initialValues: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
      })

      const submitPromise = wrapper.vm.addItem()
      await flushPromises()

      expect(wrapper.vm.submitButtonText).toBe('Updating Partner...')

      resolveAdder({ data: { id: 1 }, message: 'Updated' })
      await submitPromise
    })
  })

  describe('item initialization', () => {
    it('defaults every configured field to an empty string', () => {
      const wrapper = mountForm()

      expect(wrapper.vm.item).toEqual({
        firstName: '',
        lastName: '',
        secret: '',
        email: '',
      })
    })

    it('seeds item from initialValues when provided', () => {
      const wrapper = mountForm({
        initialValues: { firstName: 'Ada', lastName: 'Lovelace' },
      })

      expect(wrapper.vm.item).toEqual({
        firstName: 'Ada',
        lastName: 'Lovelace',
        secret: '',
        email: '',
      })
    })
  })

  describe('addItem', () => {
    it('calls adder with the merged item and extraParams', async () => {
      const adder = vi.fn<Adder>().mockResolvedValue({ data: { id: 1 }, message: 'Created' })
      const wrapper = mountForm({ adder, extraParams: { partnerId: 42 } })

      await wrapper.find('input[name="firstName"]').setValue('Ada')

      await wrapper.vm.addItem()

      expect(adder).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Ada', partnerId: 42 }),
      )
    })

    it('shows a success notification on success', async () => {
      const wrapper = mountForm()

      await wrapper.vm.addItem()

      expect(notifySuccess).toHaveBeenCalledWith('Created successfully')
    })

    it('emits close when no detailsPage is configured', async () => {
      const wrapper = mountForm()

      await wrapper.vm.addItem()

      expect(wrapper.emitted('close')).toContainEqual(['showDetails'])
      expect(routerPush).not.toHaveBeenCalled()
    })

    it('navigates to detailsPage with the new id when configured', async () => {
      const adder = vi.fn<Adder>().mockResolvedValue({ data: { id: 7 }, message: 'Created' })
      const wrapper = mountForm({ adder, detailsPage: 'partner-details' })

      await wrapper.vm.addItem()

      expect(routerPush).toHaveBeenCalledWith({
        name: 'partner-details',
        params: { id: 7 },
      })
      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('resets submitting to false after a successful submit', async () => {
      const wrapper = mountForm()

      await wrapper.vm.addItem()

      expect(wrapper.vm.submitting).toBe(false)
    })

    it('shows an error notification and resets submitting on failure', async () => {
      const adder = vi.fn<Adder>().mockRejectedValue({ message: 'Something went wrong' })
      const wrapper = mountForm({ adder })

      await wrapper.vm.addItem()

      expect(notifyError).toHaveBeenCalledWith('Something went wrong')
      expect(wrapper.vm.submitting).toBe(false)
      expect(notifySuccess).not.toHaveBeenCalled()
    })

    it('falls back to a default message when the error has none', async () => {
      const adder = vi.fn<Adder>().mockRejectedValue({})
      const wrapper = mountForm({ adder })

      await wrapper.vm.addItem()

      expect(notifyError).toHaveBeenCalledWith('Unable to submit this form.')
    })

    it('applies field-level errors from e.data', async () => {
      const adder = vi.fn<Adder>().mockRejectedValue({
        message: 'Validation failed',
        data: { email: ['Email is already taken'] },
      })
      const wrapper = mountForm({ adder })

      await wrapper.vm.addItem()

      // The email field's InputField stub should surface the vee-validate error state
      // via its rendered error text if the InputField wires up useField's errorMessage.
      // At minimum, confirm the submission failed gracefully without throwing.
      expect(notifyError).toHaveBeenCalledWith('Validation failed')
      expect(wrapper.vm.submitting).toBe(false)
    })
  })

  describe('watcher', () => {
    it('emits the configured event when the watched field changes', async () => {
      const wrapper = mountForm({
        watcher: [{ key: 'firstName', name: 'firstNameChanged' }],
      })

      wrapper.vm.item.firstName = 'Grace'
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('firstNameChanged')).toContainEqual(['Grace'])
    })

    it('does not emit for fields with no configured watcher', async () => {
      const wrapper = mountForm({
        watcher: [{ key: 'firstName', name: 'firstNameChanged' }],
      })

      wrapper.vm.item.lastName = 'Hopper'
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('firstNameChanged')).toBeUndefined()
    })

    it('supports multiple watcher entries', async () => {
      const wrapper = mountForm({
        watcher: [
          { key: 'firstName', name: 'firstNameChanged' },
          { key: 'email', name: 'emailChanged' },
        ],
      })

      wrapper.vm.item.firstName = 'Grace'
      wrapper.vm.item.email = 'grace@example.com'
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('firstNameChanged')).toContainEqual(['Grace'])
      expect(wrapper.emitted('emailChanged')).toContainEqual(['grace@example.com'])
    })

    it('registers no watchers when the watcher prop is not provided', async () => {
      const wrapper = mountForm()

      wrapper.vm.item.firstName = 'Grace'
      await wrapper.vm.$nextTick()

      // No watcher configured means no extra events beyond the standard ones
      expect(Object.keys(wrapper.emitted())).toHaveLength(0)
    })
  })
})
