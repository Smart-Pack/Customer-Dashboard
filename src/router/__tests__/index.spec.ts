import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { platform, backButtonHandler } = vi.hoisted(() => ({
  platform: { value: 'web' },
  backButtonHandler: {
    value: undefined as ((event: { canGoBack: boolean }) => void) | undefined,
  },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => platform.value,
  },
}))

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn<
      (
        event: string,
        callback: (event: { canGoBack: boolean }) => void,
      ) => Promise<{ remove: () => void }>
    >((_event, callback) => {
      backButtonHandler.value = callback
      return Promise.resolve({
        remove: vi.fn<() => void>(),
      })
    }),
    minimizeApp: vi.fn<() => Promise<void>>(),
  },
}))

vi.mock('./routes', () => ({
  default: [
    {
      path: '/',
      name: 'dashboard',
      component: { template: '<div>Dashboard</div>' },
    },
    {
      path: '/smartpacks',
      name: 'smartpacks',
      component: { template: '<div>SmartPacks</div>' },
    },
  ],
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,
    createWebHistory: vi.fn<typeof actual.createWebHistory>(actual.createWebHistory),
    createWebHashHistory: vi.fn<typeof actual.createWebHashHistory>(actual.createWebHashHistory),
  }
})

describe('application router', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    backButtonHandler.value = undefined
    platform.value = 'web'
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('uses hash-based history in mobile mode', async () => {
    vi.stubEnv('MODE', 'mobile')

    const { createWebHashHistory, createWebHistory } = await import('vue-router')

    await import('../index')

    expect(createWebHashHistory).toHaveBeenCalledWith(import.meta.env.BASE_URL)
    expect(createWebHistory).not.toHaveBeenCalled()
  })

  it('uses web history outside mobile mode', async () => {
    vi.stubEnv('MODE', 'development')

    const { createWebHashHistory, createWebHistory } = await import('vue-router')

    await import('../index')

    expect(createWebHistory).toHaveBeenCalledWith(import.meta.env.BASE_URL)
    expect(createWebHashHistory).not.toHaveBeenCalled()
  })

  it('registers the Android hardware back-button listener', async () => {
    platform.value = 'android'

    const { App } = await import('@capacitor/app')

    await import('../index')

    expect(App.addListener).toHaveBeenCalledWith('backButton', expect.any(Function))
    expect(backButtonHandler.value).toBeDefined()
  })

  it('navigates back when Android can go back', async () => {
    platform.value = 'android'

    const { default: router } = await import('../index')
    const backSpy = vi.spyOn(router, 'back')

    backButtonHandler.value?.({ canGoBack: true })

    expect(backSpy).toHaveBeenCalledOnce()
  })

  it('minimizes the app when Android cannot go back', async () => {
    platform.value = 'android'

    const { App } = await import('@capacitor/app')

    await import('../index')

    backButtonHandler.value?.({ canGoBack: false })

    expect(App.minimizeApp).toHaveBeenCalledOnce()
  })

  it('does not register the Android back-button listener on web', async () => {
    platform.value = 'web'

    const { App } = await import('@capacitor/app')

    await import('../index')

    expect(App.addListener).not.toHaveBeenCalled()
  })
})
