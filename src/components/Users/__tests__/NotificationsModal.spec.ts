import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import NotificationsModal from '@/components/Users/NotificationsModal.vue'

const mocks = vi.hoisted(() => ({
  smsModalBody: vi.fn<(props: { smsPhoneNumber: string }) => void>(),
  whatsappModalBody: vi.fn<(props: { whatsappPhoneNumber: string }) => void>(),
}))

vi.mock('@/components/Icons/CloseIcon.vue', () => ({
  default: {
    name: 'CloseIcon',
    template: '<span data-testid="close-icon" />',
  },
}))

vi.mock('@/components/Users/NotificationsSmsModalBody.vue', () => ({
  default: {
    name: 'NotificationsSmsModalBody',
    props: {
      smsPhoneNumber: {
        type: String,
        required: true,
      },
    },
    emits: ['close', 'success'],
    setup(
      props: { smsPhoneNumber: string },
      { emit }: { emit: (event: 'close' | 'success') => void },
    ) {
      mocks.smsModalBody(props)

      return { emit }
    },
    template: `
      <div data-testid="sms-modal-body">
        <span data-testid="sms-phone-number">{{ smsPhoneNumber }}</span>
        <button data-testid="sms-close" @click="emit('close')">Close SMS</button>
        <button data-testid="sms-success" @click="emit('success')">SMS Success</button>
      </div>
    `,
  },
}))

vi.mock('@/components/Users/NotificationsWhatsappModalBody.vue', () => ({
  default: {
    name: 'NotificationsWhatsappModalBody',
    props: {
      whatsappPhoneNumber: {
        type: String,
        required: true,
      },
    },
    emits: ['close', 'success'],
    setup(
      props: { whatsappPhoneNumber: string },
      { emit }: { emit: (event: 'close' | 'success') => void },
    ) {
      mocks.whatsappModalBody(props)

      return { emit }
    },
    template: `
      <div data-testid="whatsapp-modal-body">
        <span data-testid="whatsapp-phone-number">{{ whatsappPhoneNumber }}</span>
        <button data-testid="whatsapp-close" @click="emit('close')">Close WhatsApp</button>
        <button data-testid="whatsapp-success" @click="emit('success')">WhatsApp Success</button>
      </div>
    `,
  },
}))

/**
 * Mounts the notifications contact management modal.
 */
const wrapperFactory = (
  props: {
    smsPhoneNumber?: string
    whatsappPhoneNumber?: string
  } = {},
): VueWrapper =>
  mount(NotificationsModal, {
    props: {
      smsPhoneNumber: props.smsPhoneNumber ?? '+254700000000',
      whatsappPhoneNumber: props.whatsappPhoneNumber ?? '+254711111111',
    },
  })

describe('NotificationsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the modal title', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('#notifications-modal-title').text()).toBe('Manage Contact Numbers')
    })

    it('renders both contact management tabs', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('[data-testid="sms-tab"]').text()).toBe('SMS')
      expect(wrapper.find('[data-testid="whatsapp-tab"]').text()).toBe('WhatsApp')
    })

    it('selects the SMS tab by default', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('[data-testid="sms-modal-body"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="whatsapp-modal-body"]').exists()).toBe(false)
    })

    it('passes the SMS phone number to the SMS body', () => {
      const wrapper = wrapperFactory({
        smsPhoneNumber: '+254773750789',
      })

      expect(wrapper.find('[data-testid="sms-phone-number"]').text()).toBe('+254773750789')
      expect(mocks.smsModalBody).toHaveBeenCalledWith({
        smsPhoneNumber: '+254773750789',
      })
    })

    it('renders the close icon', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('[data-testid="close-icon"]').exists()).toBe(true)
    })

    it('sets the dialog accessibility attributes', () => {
      const wrapper = wrapperFactory()
      const dialog = wrapper.find('[role="dialog"]')

      expect(dialog.exists()).toBe(true)
      expect(dialog.attributes('aria-modal')).toBe('true')
      expect(dialog.attributes('aria-labelledby')).toBe('notifications-modal-title')
    })

    it('renders the header close button with an accessible label', () => {
      const wrapper = wrapperFactory()
      const closeButton = wrapper.find('button[aria-label="Close notifications modal"]')

      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('type')).toBe('button')
    })
  })

  describe('tab switching', () => {
    it('switches to WhatsApp and passes its phone number', async () => {
      const wrapper = wrapperFactory({
        whatsappPhoneNumber: '+254723456789',
      })

      await wrapper.find('[data-testid="whatsapp-tab"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="whatsapp-modal-body"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="sms-modal-body"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="whatsapp-phone-number"]').text()).toBe('+254723456789')
      expect(mocks.whatsappModalBody).toHaveBeenCalledWith({
        whatsappPhoneNumber: '+254723456789',
      })
    })

    it('switches back to SMS from WhatsApp', async () => {
      const wrapper = wrapperFactory()

      await wrapper.find('[data-testid="whatsapp-tab"]').trigger('click')
      await wrapper.find('[data-testid="sms-tab"]').trigger('click')

      expect(wrapper.find('[data-testid="sms-modal-body"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="whatsapp-modal-body"]').exists()).toBe(false)
    })

    it('applies active styling to SMS by default', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('[data-testid="sms-tab"]').classes()).toContain('form-submit')
      expect(wrapper.find('[data-testid="whatsapp-tab"]').classes()).not.toContain('form-submit')
    })

    it('applies active styling to WhatsApp after switching', async () => {
      const wrapper = wrapperFactory()

      await wrapper.find('[data-testid="whatsapp-tab"]').trigger('click')

      expect(wrapper.find('[data-testid="whatsapp-tab"]').classes()).toContain('form-submit')
      expect(wrapper.find('[data-testid="sms-tab"]').classes()).not.toContain('form-submit')
    })
  })

  describe('closing the modal', () => {
    it('emits close when the header close button is clicked', async () => {
      const wrapper = wrapperFactory()

      await wrapper.find('button[aria-label="Close notifications modal"]').trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('emits close when the backdrop is clicked', async () => {
      const wrapper = wrapperFactory()

      await wrapper.find('section.fixed').trigger('click.self')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('does not emit close when the dialog content is clicked', async () => {
      const wrapper = wrapperFactory()

      await wrapper.find('[role="dialog"]').trigger('click')

      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('forwards the close event from the SMS body', async () => {
      const wrapper = wrapperFactory()

      await wrapper.find('[data-testid="sms-close"]').trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('forwards the close event from the WhatsApp body', async () => {
      const wrapper = wrapperFactory()

      await wrapper.find('[data-testid="whatsapp-tab"]').trigger('click')
      await wrapper.find('[data-testid="whatsapp-close"]').trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  describe('success events', () => {
    it('forwards the success event from the SMS body', async () => {
      const wrapper = wrapperFactory()

      await wrapper.find('[data-testid="sms-success"]').trigger('click')

      expect(wrapper.emitted('success')).toHaveLength(1)
    })

    it('forwards the success event from the WhatsApp body', async () => {
      const wrapper = wrapperFactory()

      await wrapper.find('[data-testid="whatsapp-tab"]').trigger('click')
      await wrapper.find('[data-testid="whatsapp-success"]').trigger('click')

      expect(wrapper.emitted('success')).toHaveLength(1)
    })

    it('does not automatically close the modal when SMS reports success', async () => {
      const wrapper = wrapperFactory()

      await wrapper.find('[data-testid="sms-success"]').trigger('click')

      expect(wrapper.emitted('success')).toHaveLength(1)
      expect(wrapper.emitted('close')).toBeUndefined()
    })
  })
})
