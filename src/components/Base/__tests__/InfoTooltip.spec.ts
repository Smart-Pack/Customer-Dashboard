import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import InfoTooltip from '../InfoTooltip.vue'

function expectTooltipVisible(wrapper: VueWrapper, visible: boolean): void {
  const tooltip = wrapper.get('[role="tooltip"]')

  expect((tooltip.element as HTMLElement).style.display).toBe(visible ? '' : 'none')
}

describe('InfoTooltip', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createWrapper = (props: { text?: string; label?: string } = {}) =>
    mount(InfoTooltip, {
      props,
      slots: {},
      global: {
        stubs: {
          InfoIcon: true,
        },
      },
    })

  describe('rendering', () => {
    it('renders the tooltip trigger button', () => {
      const wrapper = createWrapper()

      expect(wrapper.find('button').exists()).toBe(true)
      expect(wrapper.get('button').attributes('type')).toBe('button')
      expect(wrapper.get('button').attributes('aria-label')).toBe('More information')
    })

    it('uses the provided accessible label', () => {
      const wrapper = createWrapper({ label: 'Explain this setting' })

      expect(wrapper.get('button').attributes('aria-label')).toBe('Explain this setting')
    })

    it('renders the provided text', () => {
      const wrapper = createWrapper({ text: 'Additional information' })

      expect(wrapper.get('[role="tooltip"]').text()).toBe('Additional information')
    })

    it('renders slot content instead of the text prop', () => {
      const wrapper = mount(InfoTooltip, {
        props: {
          text: 'Fallback information',
        },
        slots: {
          default: '<span>Custom tooltip content</span>',
        },
        global: {
          stubs: {
            InfoIcon: true,
          },
        },
      })

      const tooltip = wrapper.get('[role="tooltip"]')

      expect(tooltip.text()).toBe('Custom tooltip content')
      expect(tooltip.text()).not.toContain('Fallback information')
    })

    it('hides the tooltip initially', () => {
      const wrapper = createWrapper()

      expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
      expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(false)
    })
  })

  describe('visibility', () => {
    it('shows the tooltip when the trigger is clicked', async () => {
      const wrapper = createWrapper()

      await wrapper.get('button').trigger('click')

      expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
      expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(true)
    })

    it('hides the tooltip when the trigger is clicked twice', async () => {
      const wrapper = createWrapper()
      const button = wrapper.get('button')

      await button.trigger('click')
      expectTooltipVisible(wrapper, true)

      await button.trigger('click')

      expect(button.attributes('aria-expanded')).toBe('false')
      expectTooltipVisible(wrapper, false)
    })

    it('shows the tooltip when the root is hovered', async () => {
      const wrapper = createWrapper()

      await wrapper.get('span.relative').trigger('mouseenter')

      expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(true)
    })

    it('hides the tooltip when the pointer leaves the root', async () => {
      const wrapper = createWrapper()
      const root = wrapper.get('span.relative')

      await root.trigger('mouseenter')
      expectTooltipVisible(wrapper, true)

      await root.trigger('mouseleave')

      expect((wrapper.get('[role="tooltip"]').element as HTMLElement).style.display).toBe('none')
    })

    it('keeps the tooltip visible when opened and the pointer leaves', async () => {
      const wrapper = createWrapper()
      const root = wrapper.get('span.relative')

      await wrapper.get('button').trigger('click')
      await root.trigger('mouseenter')
      await root.trigger('mouseleave')

      expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
      expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(true)
    })
  })

  describe('keyboard interactions', () => {
    it('closes the tooltip when Escape is pressed', async () => {
      const wrapper = createWrapper()
      const button = wrapper.get('button')

      await button.trigger('click')
      expectTooltipVisible(wrapper, true)

      await button.trigger('keydown.esc')

      expect(button.attributes('aria-expanded')).toBe('false')
      expectTooltipVisible(wrapper, false)
    })

    it('does not open the tooltip when Escape is pressed while closed', async () => {
      const wrapper = createWrapper()
      const button = wrapper.get('button')

      await button.trigger('keydown.esc')

      expect(button.attributes('aria-expanded')).toBe('false')
      expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(false)
    })
  })

  describe('document clicks', () => {
    it('closes the tooltip when clicking outside the component', async () => {
      const wrapper = createWrapper()

      await wrapper.get('button').trigger('click')
      expectTooltipVisible(wrapper, true)

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await nextTick()

      expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
      expectTooltipVisible(wrapper, false)
    })

    it('does not close the tooltip when clicking inside the component', async () => {
      const wrapper = createWrapper()

      await wrapper.get('button').trigger('click')
      expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(true)

      await wrapper.get('[role="tooltip"]').trigger('click')

      expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
      expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(true)
    })

    it('does not throw when clicking outside while the tooltip is closed', async () => {
      const wrapper = createWrapper()

      expect(() => {
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      }).not.toThrow()

      await nextTick()

      expect(wrapper.get('[role="tooltip"]').isVisible()).toBe(false)
    })
  })

  describe('lifecycle', () => {
    it('registers a document click listener when mounted', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

      const wrapper = createWrapper()

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))

      wrapper.unmount()
    })

    it('removes the document click listener when unmounted', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const wrapper = createWrapper()

      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    })

    it('removes the same document click handler that it registered', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const wrapper = createWrapper()

      const addCall = addEventListenerSpy.mock.calls.find(([eventName]) => eventName === 'click')

      expect(addCall).toBeDefined()

      const registeredHandler = addCall?.[1]

      wrapper.unmount()

      const removeCall = removeEventListenerSpy.mock.calls.find(
        ([eventName, handler]) => eventName === 'click' && handler === registeredHandler,
      )

      expect(removeCall).toBeDefined()
    })
  })
})
