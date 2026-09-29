import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { useUiStore } from '@/stores'
import AuthLayout from '../AuthLayout.vue'

const RouterViewStub = {
  template: '<div data-testid="router-view"></div>',
  emits: ['change-size'],
}

const SmartPackAuthLogoIconStub = {
  template: '<svg data-testid="smartpack-logo"></svg>',
}

const mountLayout = () =>
  mount(AuthLayout, {
    global: {
      stubs: {
        'router-view': RouterViewStub,
        SmartPackAuthLogoIcon: SmartPackAuthLogoIconStub,
      },
    },
  })

describe('AuthLayout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      media: '(prefers-color-scheme: light)',
      onchange: null,
      addListener: vi.fn<() => void>(),
      removeListener: vi.fn<() => void>(),
      addEventListener: vi.fn<() => void>(),
      removeEventListener: vi.fn<() => void>(),
      dispatchEvent: vi.fn<() => boolean>(),
    }))

    document.documentElement.classList.remove('dark')
  })

  it('renders the branding panel', () => {
    const wrapper = mountLayout()

    expect(wrapper.find('[aria-label="Branding panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="smartpack-logo"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('SmartPack')
  })

  it('renders the authentication router view', () => {
    const wrapper = mountLayout()

    expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
  })

  it('renders the current year in the footer', () => {
    const wrapper = mountLayout()
    const currentYear = new Date().getFullYear()

    expect(wrapper.find('footer').text()).toContain(`© ${currentYear} SMARTPACK`)
  })

  it('initializes screenSize to false', () => {
    const wrapper = mountLayout()

    expect(wrapper.vm.screenSize).toBe(false)
  })

  it('uses full height when screenSize is false', () => {
    const wrapper = mountLayout()
    const layout = wrapper.get('[data-testid="auth-layout"]')

    expect(layout.classes()).toContain('h-full')
    expect(layout.classes()).not.toContain('h-[120%]')
  })

  it('uses extended height when screenSize is true', async () => {
    const wrapper = mountLayout()
    const layout = wrapper.get('[data-testid="auth-layout"]')

    wrapper.vm.handleChangeSize(true)
    await wrapper.vm.$nextTick()

    expect(layout.classes()).toContain('h-[120%]')
    expect(layout.classes()).toContain('overflow-y-auto')
  })

  it('updates screenSize when handleChangeSize is called', () => {
    const wrapper = mountLayout()

    wrapper.vm.handleChangeSize(true)

    expect(wrapper.vm.screenSize).toBe(true)

    wrapper.vm.handleChangeSize(false)

    expect(wrapper.vm.screenSize).toBe(false)
  })

  it('hides the SweetAlert backdrop by default', () => {
    const wrapper = mountLayout()

    expect(wrapper.find('.fixed.inset-0.bg-black\\/40').exists()).toBe(false)
  })

  it('renders the SweetAlert backdrop when enabled', async () => {
    const wrapper = mountLayout()
    const uiStore = useUiStore()

    uiStore.updateSwalBackdrop(true)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.fixed.inset-0.bg-black\\/40').exists()).toBe(true)
  })

  it('disables the SweetAlert backdrop when mounted', () => {
    const uiStore = useUiStore()
    uiStore.updateSwalBackdrop(true)

    mountLayout()

    expect(uiStore.getSwalBackdrop).toBe(false)
  })

  it('adds the dark class when light mode is disabled', () => {
    const uiStore = useUiStore()

    uiStore.updateIsLightMode(false)

    mountLayout()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes the dark class when light mode is enabled', () => {
    document.documentElement.classList.add('dark')

    const uiStore = useUiStore()
    uiStore.updateIsLightMode(true)

    mountLayout()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('reacts to theme changes', async () => {
    const uiStore = useUiStore()
    uiStore.updateIsLightMode(true)

    mountLayout()

    expect(document.documentElement.classList.contains('dark')).toBe(false)

    uiStore.updateIsLightMode(false)
    await Promise.resolve()

    expect(document.documentElement.classList.contains('dark')).toBe(true)

    uiStore.updateIsLightMode(true)
    await Promise.resolve()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('responds to the change-size event from the router view', async () => {
    const wrapper = mountLayout()

    const routerView = wrapper.findComponent(RouterViewStub)

    routerView.vm.$emit('change-size', true)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.screenSize).toBe(true)

    routerView.vm.$emit('change-size', false)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.screenSize).toBe(false)
  })
})
