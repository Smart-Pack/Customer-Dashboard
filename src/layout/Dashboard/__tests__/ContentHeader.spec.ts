import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import ContentHeader from '../ContentHeader.vue'
import { useUiStore } from '@/stores/modules/ui'

const RouterLinkStub = {
  template: '<a><slot /></a>',
  props: {
    to: {
      type: Object,
      required: true,
    },
  },
}

describe('ContentHeader', () => {
  let uiStore: ReturnType<typeof useUiStore>

  const mountContentHeader = () =>
    mount(ContentHeader, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    })

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)

    uiStore = useUiStore(pinia)

    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 17, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the current date', () => {
    const wrapper = mountContentHeader()

    expect(wrapper.text()).toContain('September 17th')
  })

  it('renders breadcrumbs from the UI store', () => {
    uiStore.breadcrumbs = [
      {
        name: 'dashboard',
        breadcrumb: 'Home',
      },
      {
        name: 'users',
        breadcrumb: 'Users',
      },
    ]

    const wrapper = mountContentHeader()

    expect(wrapper.text()).toContain('Home')
    expect(wrapper.text()).toContain('Users')
  })

  it('renders the last breadcrumb as plain text', () => {
    uiStore.breadcrumbs = [
      {
        name: 'dashboard',
        breadcrumb: 'Home',
      },
      {
        name: 'users',
        breadcrumb: 'Users',
      },
    ]

    const wrapper = mountContentHeader()

    const links = wrapper.findAllComponents(RouterLinkStub)

    expect(links).toHaveLength(1)
    expect(links[0]!.text()).toBe('Home')

    const currentBreadcrumb = wrapper.findAll('span').find((element) => element.text() === 'Users')

    expect(currentBreadcrumb).toBeDefined()
  })

  it('uses the breadcrumb route name for links', () => {
    uiStore.breadcrumbs = [
      {
        name: 'dashboard',
        breadcrumb: 'Home',
      },
      {
        name: 'users',
        breadcrumb: 'Users',
      },
    ]

    const wrapper = mountContentHeader()

    const links = wrapper.findAllComponents(RouterLinkStub)

    expect(links).toHaveLength(1)
    expect(links[0]!.props('to')).toEqual({
      name: 'dashboard',
    })
  })

  it.each([
    [1, 'st'],
    [2, 'nd'],
    [3, 'rd'],
    [4, 'th'],
    [11, 'th'],
    [12, 'th'],
    [13, 'th'],
    [21, 'st'],
    [22, 'nd'],
    [23, 'rd'],
    [31, 'st'],
  ])('renders the correct day suffix for %i', (day, suffix) => {
    vi.setSystemTime(new Date(2026, 9, day, 12, 0, 0))

    const wrapper = mountContentHeader()

    expect(wrapper.text()).toContain(`October ${day}${suffix}`)
  })

  it('refreshes the date at midnight', async () => {
    vi.setSystemTime(new Date(2026, 8, 17, 23, 59, 59))

    const wrapper = mountContentHeader()

    expect(wrapper.text()).toContain('September 17th')

    vi.setSystemTime(new Date(2026, 8, 18, 0, 0, 0))
    await vi.runOnlyPendingTimersAsync()

    expect(wrapper.text()).toContain('September 18th')
  })

  it('clears the midnight refresh timer when unmounted', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    const wrapper = mountContentHeader()

    wrapper.unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()

    clearTimeoutSpy.mockRestore()
  })
})
