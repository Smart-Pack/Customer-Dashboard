import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import InfoTooltip from '../InfoTooltip.vue'

type TooltipProps = {
  text?: string
  label?: string
  placement?: 'left' | 'right' | 'auto'
}

let mobileViewport = false
const mountedWrappers = new Set<VueWrapper>()

const createMediaQueryList = (matches: boolean): MediaQueryList =>
  ({
    matches,
    media: '(max-width: 767px)',
    onchange: null,
    addListener: vi.fn<MediaQueryList['addListener']>(),
    removeListener: vi.fn<MediaQueryList['removeListener']>(),
    addEventListener: vi.fn<MediaQueryList['addEventListener']>(),
    removeEventListener: vi.fn<MediaQueryList['removeEventListener']>(),
    dispatchEvent: vi.fn<MediaQueryList['dispatchEvent']>(),
  }) as MediaQueryList

const mockMatchMedia = () => {
  const matchMediaMock = vi.fn<typeof window.matchMedia>((query: string) =>
    createMediaQueryList(query === '(max-width: 767px)' && mobileViewport),
  )

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMediaMock,
  })

  return matchMediaMock
}

const createWrapper = (props: TooltipProps = {}) => {
  const wrapper = mount(InfoTooltip, {
    props: {
      text: 'Additional information about this field.',
      ...props,
    },
    global: {
      stubs: {
        InfoIcon: {
          template: '<svg data-testid="info-icon" />',
        },
      },
    },
  })

  mountedWrappers.add(wrapper)
  return wrapper
}

const unmountWrapper = (wrapper: VueWrapper) => {
  mountedWrappers.delete(wrapper)
  wrapper.unmount()
}

const getTooltip = (wrapper: VueWrapper) => wrapper.find('[role="tooltip"]')

/**
 * The tooltip uses v-show, so visibility is the inline display style.
 * VTU's isVisible() can return stale results after a visible -> hidden
 * transition on a detached element, so we read the style directly.
 */
const isTooltipVisible = (wrapper: VueWrapper): boolean =>
  (getTooltip(wrapper).element as HTMLElement).style.display !== 'none'

const setViewport = async (mobile: boolean) => {
  mobileViewport = mobile
  mockMatchMedia()
  window.dispatchEvent(new Event('resize'))
  await nextTick()
}

const mockRootPosition = (wrapper: VueWrapper, left: number) => {
  vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue({
    x: left,
    y: 100,
    width: 20,
    height: 20,
    top: 100,
    right: left + 20,
    bottom: 120,
    left,
    toJSON: () => ({}),
  } as DOMRect)
}

describe('InfoTooltip', () => {
  beforeEach(() => {
    mobileViewport = false
    mockMatchMedia()
  })

  afterEach(() => {
    mountedWrappers.forEach((wrapper) => wrapper.unmount())
    mountedWrappers.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('rendering', () => {
    it('renders the tooltip trigger button', () => {
      const wrapper = createWrapper()

      expect(wrapper.find('button').exists()).toBe(true)
    })

    it('renders the info icon', () => {
      const wrapper = createWrapper()

      expect(wrapper.find('[data-testid="info-icon"]').exists()).toBe(true)
    })

    it('sets the accessible label on the trigger button', () => {
      const wrapper = createWrapper({ label: 'Communication mode information' })

      expect(wrapper.find('button').attributes('aria-label')).toBe('Communication mode information')
    })

    it('uses the default accessible label when none is provided', () => {
      const wrapper = createWrapper()

      expect(wrapper.find('button').attributes('aria-label')).toBe('More information')
    })

    it('sets the tooltip accessibility attributes on the trigger', () => {
      const wrapper = createWrapper()

      expect(wrapper.find('button').attributes('aria-haspopup')).toBe('true')
      expect(wrapper.find('button').attributes('aria-expanded')).toBe('false')
    })

    it('renders the supplied tooltip text', () => {
      const wrapper = createWrapper({ text: 'The SmartPack communication method.' })

      expect(getTooltip(wrapper).text()).toContain('The SmartPack communication method.')
    })

    it('keeps the tooltip hidden initially', () => {
      const wrapper = createWrapper()

      expect(isTooltipVisible(wrapper)).toBe(false)
    })
  })

  describe('visibility', () => {
    it('shows the tooltip when the trigger is clicked', async () => {
      const wrapper = createWrapper()

      await wrapper.find('button').trigger('click')

      expect(isTooltipVisible(wrapper)).toBe(true)
      expect(wrapper.find('button').attributes('aria-expanded')).toBe('true')
    })

    it('hides the tooltip when the trigger is clicked again', async () => {
      const wrapper = createWrapper()

      await wrapper.find('button').trigger('click')
      expect(isTooltipVisible(wrapper)).toBe(true)

      await wrapper.find('button').trigger('click')

      expect(isTooltipVisible(wrapper)).toBe(false)
      expect(wrapper.find('button').attributes('aria-expanded')).toBe('false')
    })

    it('shows the tooltip when the pointer enters the root', async () => {
      const wrapper = createWrapper()

      await wrapper.trigger('mouseenter')

      expect(isTooltipVisible(wrapper)).toBe(true)
    })

    it('hides the tooltip when the pointer leaves the root', async () => {
      const wrapper = createWrapper()

      await wrapper.trigger('mouseenter')
      expect(isTooltipVisible(wrapper)).toBe(true)

      await wrapper.trigger('mouseleave')

      expect(isTooltipVisible(wrapper)).toBe(false)
    })

    it('keeps the tooltip visible when the pointer leaves while it is manually open', async () => {
      const wrapper = createWrapper()

      await wrapper.find('button').trigger('click')
      await wrapper.trigger('mouseenter')
      await wrapper.trigger('mouseleave')

      expect(isTooltipVisible(wrapper)).toBe(true)
    })

    it('shows the tooltip when keyboard focus enters the root', async () => {
      const wrapper = createWrapper()

      await wrapper.trigger('focusin')

      expect(isTooltipVisible(wrapper)).toBe(true)
    })

    it('hides the tooltip when keyboard focus leaves the root', async () => {
      const wrapper = createWrapper()

      await wrapper.trigger('focusin')
      expect(isTooltipVisible(wrapper)).toBe(true)

      await wrapper.trigger('focusout')

      expect(isTooltipVisible(wrapper)).toBe(false)
    })
  })

  describe('keyboard interactions', () => {
    it('closes the tooltip when Escape is pressed on the trigger', async () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')

      await button.trigger('click')
      expect(isTooltipVisible(wrapper)).toBe(true)

      // The keydown handler lives on the button, not the root element.
      await button.trigger('keydown.esc')

      expect(isTooltipVisible(wrapper)).toBe(false)
      expect(button.attributes('aria-expanded')).toBe('false')
    })

    it('closes a hover/focus-opened tooltip when Escape is pressed', async () => {
      const wrapper = createWrapper()

      await wrapper.trigger('mouseenter')
      await wrapper.trigger('focusin')
      expect(isTooltipVisible(wrapper)).toBe(true)

      await wrapper.find('button').trigger('keydown.esc')

      expect(isTooltipVisible(wrapper)).toBe(false)
    })

    it('does not throw when Escape is pressed while the tooltip is closed', async () => {
      const wrapper = createWrapper()

      await expect(wrapper.find('button').trigger('keydown.esc')).resolves.toBeUndefined()

      expect(isTooltipVisible(wrapper)).toBe(false)
    })
  })

  describe('tooltip placement', () => {
    it('centers the automatically positioned tooltip on mobile', async () => {
      mobileViewport = true
      mockMatchMedia()

      const wrapper = createWrapper()
      await nextTick()

      expect(getTooltip(wrapper).classes()).toContain('left-1/2')
      expect(getTooltip(wrapper).classes()).toContain('-translate-x-1/2')
    })

    it('uses left alignment when explicitly configured on mobile', async () => {
      await setViewport(true)

      const wrapper = createWrapper({ placement: 'left' })

      expect(getTooltip(wrapper).classes()).toContain('left-0')
      expect(getTooltip(wrapper).classes()).not.toContain('left-1/2')
    })

    it('uses right alignment when explicitly configured on mobile', async () => {
      await setViewport(true)

      const wrapper = createWrapper({ placement: 'right' })

      expect(getTooltip(wrapper).classes()).toContain('right-0')
      expect(getTooltip(wrapper).classes()).not.toContain('left-1/2')
    })

    it('uses left alignment when explicitly configured on desktop', () => {
      const wrapper = createWrapper({ placement: 'left' })

      expect(getTooltip(wrapper).classes()).toContain('left-0')
    })

    it('uses right alignment when explicitly configured on desktop', () => {
      const wrapper = createWrapper({ placement: 'right' })

      expect(getTooltip(wrapper).classes()).toContain('right-0')
    })

    it('aligns automatically to the left when there is enough space on the right', async () => {
      const wrapper = createWrapper()

      mockRootPosition(wrapper, 100)
      await setViewport(false)

      expect(getTooltip(wrapper).classes()).toContain('left-0')
      expect(getTooltip(wrapper).classes()).not.toContain('right-0')
    })

    it('aligns automatically to the right when there is insufficient space on the right', async () => {
      const wrapper = createWrapper()

      mockRootPosition(wrapper, window.innerWidth - 100)
      await setViewport(false)

      expect(getTooltip(wrapper).classes()).toContain('right-0')
      expect(getTooltip(wrapper).classes()).not.toContain('left-0')
    })

    it('updates automatic placement when the viewport changes', async () => {
      const wrapper = createWrapper()

      mockRootPosition(wrapper, 100)
      await setViewport(false)

      expect(getTooltip(wrapper).classes()).toContain('left-0')

      await setViewport(true)

      expect(getTooltip(wrapper).classes()).toContain('left-1/2')
      expect(getTooltip(wrapper).classes()).toContain('-translate-x-1/2')
    })
  })

  describe('document clicks', () => {
    it('handles document clicks safely when the tooltip is closed', () => {
      const wrapper = createWrapper()

      expect(() => document.body.click()).not.toThrow()
      expect(isTooltipVisible(wrapper)).toBe(false)
    })

    it('closes the tooltip when the user clicks outside the component', async () => {
      const wrapper = createWrapper()

      await wrapper.find('button').trigger('click')
      expect(isTooltipVisible(wrapper)).toBe(true)

      document.body.click()
      await nextTick()

      expect(isTooltipVisible(wrapper)).toBe(false)
      expect(wrapper.find('button').attributes('aria-expanded')).toBe('false')
    })
  })

  describe('lifecycle', () => {
    it('registers the resize listener when mounted', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      createWrapper()

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('registers the document click listener when mounted', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

      createWrapper()

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    })

    it('removes the registered event listeners when unmounted', () => {
      const windowAddSpy = vi.spyOn(window, 'addEventListener')
      const windowRemoveSpy = vi.spyOn(window, 'removeEventListener')
      const documentAddSpy = vi.spyOn(document, 'addEventListener')
      const documentRemoveSpy = vi.spyOn(document, 'removeEventListener')

      const wrapper = createWrapper()

      const resizeHandler = windowAddSpy.mock.calls.find(([event]) => event === 'resize')?.[1]
      const clickHandler = documentAddSpy.mock.calls.find(([event]) => event === 'click')?.[1]

      unmountWrapper(wrapper)

      expect(resizeHandler).toBeDefined()
      expect(clickHandler).toBeDefined()
      expect(windowRemoveSpy).toHaveBeenCalledWith('resize', resizeHandler)
      expect(documentRemoveSpy).toHaveBeenCalledWith('click', clickHandler)
    })
  })
})
