import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentPublicInstance } from 'vue'

import ClaimModal from '@/components/Smartpacks/ClaimModal.vue'
import { claim } from '@/api/modules/smartpacks'

vi.mock('@/api/modules/smartpacks', () => ({
  claim: vi.fn<(deviceUid: string, payload: { imei: string }) => Promise<string>>(),
}))

const mockNotifySuccess = vi.hoisted(() => vi.fn<(message: string) => void>())
const mockNotifyError = vi.hoisted(() => vi.fn<(message: string) => void>())

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: () => ({
    $notifySuccess: mockNotifySuccess,
    $notifyError: mockNotifyError,
  }),
}))

vi.mock('@/components/Icons/CloseIcon.vue', () => ({
  default: {
    name: 'CloseIcon',
    template: '<span />',
  },
}))

vi.mock('vue-qrcode-reader', async () => {
  const { defineComponent, h } = await import('vue')

  return {
    QrcodeCapture: defineComponent({
      name: 'QrcodeCapture',
      props: {
        capture: String,
      },
      emits: ['detect'],
      setup() {
        return () => h('div', { class: 'qrcode-capture' })
      },
    }),
    QrcodeStream: defineComponent({
      name: 'QrcodeStream',
      props: {
        constraints: Object,
        formats: Array,
      },
      emits: ['detect', 'error', 'camera-on'],
      setup(_, { slots }) {
        return () => h('div', { class: 'qrcode-stream' }, slots.default?.())
      },
    }),
  }
})

const VALID_PAYLOAD = { device_uid: 'SP-0001', imei: '490154203237518', type: 'smartpack' }

describe('ClaimModal', () => {
  let wrapper: VueWrapper<ComponentPublicInstance> | undefined

  const mountModal = (): VueWrapper<ComponentPublicInstance> => {
    wrapper = mount(ClaimModal)

    return wrapper
  }

  const findButtonByText = (text: string) =>
    wrapper!.findAll('button').find((button) => button.text() === text)

  const emitCapture = async (detectedCodes: Array<{ rawValue: string }>) => {
    wrapper!.findComponent({ name: 'QrcodeCapture' }).vm.$emit('detect', detectedCodes)
    await wrapper!.vm.$nextTick()
  }

  const startScan = async () => {
    await findButtonByText('Scan QR Code')!.trigger('click')
  }

  const emitStream = async (event: 'detect' | 'error' | 'camera-on', payload?: unknown) => {
    wrapper!.findComponent({ name: 'QrcodeStream' }).vm.$emit(event, payload)
    await wrapper!.vm.$nextTick()
  }

  const setFullscreenElement = (element: Element | null) => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: element,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined

    Reflect.deleteProperty(document, 'fullscreenElement')
    Reflect.deleteProperty(document, 'exitFullscreen')
  })

  describe('rendering', () => {
    it('renders the title and the upload/scan controls', () => {
      mountModal()

      expect(wrapper!.text()).toContain('Claim SmartPack')
      expect(wrapper!.text()).toContain('Scan or Upload SmartPack QR Code')
      expect(wrapper!.findComponent({ name: 'QrcodeCapture' }).exists()).toBe(true)
      expect(findButtonByText('Scan QR Code')).toBeDefined()
      expect(wrapper!.findComponent({ name: 'QrcodeStream' }).exists()).toBe(false)
    })

    it('passes the environment capture mode to QrcodeCapture', () => {
      mountModal()

      expect(wrapper!.findComponent({ name: 'QrcodeCapture' }).props('capture')).toBe('environment')
    })

    it('disables the submit button until a QR code has been detected', () => {
      mountModal()

      expect(wrapper!.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    })
  })

  describe('uploaded QR code detection', () => {
    it('shows the IMEI and enables submit for a valid QR code', async () => {
      mountModal()

      await emitCapture([{ rawValue: JSON.stringify(VALID_PAYLOAD) }])

      expect(wrapper!.text()).toContain('QR Code Detected')
      expect(wrapper!.text()).toContain(VALID_PAYLOAD.device_uid)
      expect(wrapper!.text()).toContain(VALID_PAYLOAD.imei)
      expect(wrapper!.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    })

    it('shows an error when no QR code is detected', async () => {
      mountModal()

      await emitCapture([])

      expect(wrapper!.text()).toContain('No QR code was detected.')
    })

    it('shows an error when the QR code is not valid JSON', async () => {
      mountModal()

      await emitCapture([{ rawValue: 'not-json' }])

      expect(wrapper!.text()).toContain('Invalid SmartPack QR code.')
      expect(wrapper!.text()).not.toContain('QR Code Detected')
    })

    it.each([
      ['device_uid is missing', { imei: '490154203237518', type: 'smartpack' }],
      ['imei is missing', { device_uid: 'SP-0001', type: 'smartpack' }],
      ['type is missing', { device_uid: 'SP-0001', imei: '490154203237518' }],
      ['type is not smartpack', { device_uid: 'SP-0001', imei: '490154203237518', type: 'other' }],
    ])('shows an error when %s', async (_label, payload) => {
      mountModal()

      await emitCapture([{ rawValue: JSON.stringify(payload) }])

      expect(wrapper!.text()).toContain('Invalid SmartPack QR code.')
      expect(wrapper!.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    })

    it('clears previously detected values when a later upload is invalid', async () => {
      mountModal()

      await emitCapture([{ rawValue: JSON.stringify(VALID_PAYLOAD) }])
      expect(wrapper!.text()).toContain('QR Code Detected')

      await emitCapture([{ rawValue: 'not-json' }])

      expect(wrapper!.text()).not.toContain('QR Code Detected')
      expect(wrapper!.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    })
  })

  describe('camera scanning', () => {
    it('switches to scan mode and shows a loading spinner until the camera is on', async () => {
      mountModal()

      await startScan()

      const stream = wrapper!.findComponent({ name: 'QrcodeStream' })

      expect(stream.exists()).toBe(true)
      expect(stream.props('constraints')).toEqual({ facingMode: 'environment' })
      expect(stream.props('formats')).toEqual(['qr_code'])
      expect(wrapper!.find('.submit-spinner').exists()).toBe(true)
      expect(wrapper!.find('button[type="submit"]').attributes('disabled')).toBeDefined()

      await emitStream('camera-on')

      expect(wrapper!.find('.submit-spinner').exists()).toBe(false)
    })

    it('exits scan mode and stores the values for a valid scanned QR code', async () => {
      mountModal()

      await startScan()
      await emitStream('detect', [{ rawValue: JSON.stringify(VALID_PAYLOAD) }])

      expect(wrapper!.findComponent({ name: 'QrcodeStream' }).exists()).toBe(false)
      expect(wrapper!.text()).toContain(VALID_PAYLOAD.imei)
      expect(wrapper!.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    })

    it('ignores an empty detection result and stays in scan mode', async () => {
      mountModal()

      await startScan()
      await emitStream('detect', [])

      expect(wrapper!.findComponent({ name: 'QrcodeStream' }).exists()).toBe(true)
    })

    it('shows an error and stays in scan mode for an invalid scanned QR code', async () => {
      mountModal()

      await startScan()
      await emitStream('detect', [{ rawValue: 'not-json' }])

      expect(wrapper!.findComponent({ name: 'QrcodeStream' }).exists()).toBe(true)
      expect(wrapper!.text()).toContain('Invalid SmartPack QR code.')
    })

    it('shows an error when a scanned QR code is missing required fields', async () => {
      mountModal()

      await startScan()
      await emitStream('detect', [
        { rawValue: JSON.stringify({ device_uid: 'SP-0001', type: 'smartpack' }) },
      ])

      expect(wrapper!.findComponent({ name: 'QrcodeStream' }).exists()).toBe(true)
      expect(wrapper!.text()).toContain('Invalid SmartPack QR code.')
    })

    it('clears previously detected values when a later scan is invalid', async () => {
      mountModal()

      await startScan()
      await emitStream('detect', [{ rawValue: JSON.stringify(VALID_PAYLOAD) }])
      expect(wrapper!.text()).toContain('QR Code Detected')

      await startScan()
      await emitStream('detect', [{ rawValue: 'not-json' }])

      await wrapper!.find('button[aria-label="Close QR scanner"]').trigger('click')

      expect(wrapper!.text()).not.toContain('QR Code Detected')
      expect(wrapper!.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    })

    it('shows a friendly message for known camera errors and hides the spinner', async () => {
      mountModal()

      await startScan()

      const error = new Error('Permission denied')
      error.name = 'NotAllowedError'

      await emitStream('error', error)

      expect(wrapper!.text()).toContain('Camera access was denied.')
      expect(wrapper!.find('.submit-spinner').exists()).toBe(false)
    })

    it('falls back to the raw message for unknown camera errors', async () => {
      mountModal()

      await startScan()
      await emitStream('error', new Error('Something odd happened'))

      expect(wrapper!.text()).toContain('Unable to start the camera: Something odd happened')
    })

    it('closes the scanner with the close button', async () => {
      mountModal()

      await startScan()
      await wrapper!.find('button[aria-label="Close QR scanner"]').trigger('click')

      expect(wrapper!.findComponent({ name: 'QrcodeStream' }).exists()).toBe(false)
      expect(findButtonByText('Scan QR Code')).toBeDefined()
    })

    it('exits browser fullscreen when the scanner is closed while fullscreen is active', async () => {
      const exitFullscreen = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

      Object.defineProperty(document, 'exitFullscreen', {
        configurable: true,
        value: exitFullscreen,
      })
      setFullscreenElement(document.body)

      mountModal()

      await startScan()
      await wrapper!.find('button[aria-label="Close QR scanner"]').trigger('click')

      expect(exitFullscreen).toHaveBeenCalledTimes(1)
    })
  })

  describe('fullscreen', () => {
    it('requests fullscreen on the scanner wrapper when the button is clicked', async () => {
      mountModal()

      await startScan()

      const requestFullscreen = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
      wrapper!.find('.h-80').element.requestFullscreen = requestFullscreen

      setFullscreenElement(null)

      await findButtonByText('Fullscreen')!.trigger('click')

      expect(requestFullscreen).toHaveBeenCalledTimes(1)
    })

    it('shows a message when fullscreen is not supported', async () => {
      mountModal()

      await startScan()
      setFullscreenElement(null)

      await findButtonByText('Fullscreen')!.trigger('click')

      expect(wrapper!.text()).toContain('Fullscreen is not supported on this device.')
    })

    it('shows a message when requesting fullscreen fails', async () => {
      mountModal()

      await startScan()

      wrapper!.find('.h-80').element.requestFullscreen = vi
        .fn<() => Promise<void>>()
        .mockRejectedValue(new Error('denied'))

      setFullscreenElement(null)

      await findButtonByText('Fullscreen')!.trigger('click')
      await flushPromises()

      expect(wrapper!.text()).toContain('Fullscreen is not supported on this device.')
    })

    it('exits fullscreen when the component unmounts while fullscreen is active', () => {
      const exitFullscreen = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

      Object.defineProperty(document, 'exitFullscreen', {
        configurable: true,
        value: exitFullscreen,
      })
      setFullscreenElement(document.body)

      mountModal()

      wrapper!.unmount()
      wrapper = undefined

      expect(exitFullscreen).toHaveBeenCalledTimes(1)
    })

    it('exits fullscreen when the button is clicked while fullscreen is active', async () => {
      const exitFullscreen = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

      Object.defineProperty(document, 'exitFullscreen', {
        configurable: true,
        value: exitFullscreen,
      })

      mountModal()

      await startScan()

      setFullscreenElement(wrapper!.find('.h-80').element)

      await findButtonByText('Fullscreen')!.trigger('click')

      expect(exitFullscreen).toHaveBeenCalledTimes(1)
    })

    it('syncs the fullscreen class and button label with fullscreenchange events', async () => {
      mountModal()

      await startScan()

      const scanner = wrapper!.find('.h-80')

      setFullscreenElement(scanner.element)
      await scanner.trigger('fullscreenchange')

      expect(scanner.classes()).toContain('fullscreen')
      expect(findButtonByText('Exit Fullscreen')).toBeDefined()

      setFullscreenElement(null)
      await scanner.trigger('fullscreenchange')

      expect(scanner.classes()).not.toContain('fullscreen')
      expect(findButtonByText('Fullscreen')).toBeDefined()
    })
  })

  describe('claiming', () => {
    it('claims the SmartPack and emits claimed on success', async () => {
      vi.mocked(claim).mockResolvedValueOnce('SmartPack claimed successfully.')

      mountModal()

      await emitCapture([{ rawValue: JSON.stringify(VALID_PAYLOAD) }])
      await wrapper!.find('form').trigger('submit')
      await flushPromises()

      expect(claim).toHaveBeenCalledWith('SP-0001', { imei: '490154203237518' })
      expect(mockNotifySuccess).toHaveBeenCalledWith('SmartPack claimed successfully.')
      expect(wrapper!.emitted('claimed')).toHaveLength(1)
    })

    it('does not call the API when no QR code has been detected', async () => {
      mountModal()

      await wrapper!.find('form').trigger('submit')
      await flushPromises()

      expect(claim).not.toHaveBeenCalled()
      expect(wrapper!.emitted('claimed')).toBeUndefined()
    })

    it('shows a submitting state and disables the buttons while claiming', async () => {
      let resolveClaim: (message: string) => void = () => undefined

      vi.mocked(claim).mockReturnValueOnce(
        new Promise<string>((resolve) => {
          resolveClaim = resolve
        }),
      )

      mountModal()

      await emitCapture([{ rawValue: JSON.stringify(VALID_PAYLOAD) }])
      await wrapper!.find('form').trigger('submit')

      const submit = wrapper!.find('button[type="submit"]')

      expect(submit.text()).toContain('Claiming...')
      expect(submit.attributes('disabled')).toBeDefined()
      expect(findButtonByText('Cancel')!.attributes('disabled')).toBeDefined()
      expect(findButtonByText('Scan QR Code')!.attributes('disabled')).toBeDefined()

      resolveClaim('SmartPack claimed successfully.')
      await flushPromises()

      expect(wrapper!.find('button[type="submit"]').text()).toContain('Claim SmartPack')
      expect(wrapper!.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    })

    it('ignores repeated submits while a claim is in progress', async () => {
      let resolveClaim: (message: string) => void = () => undefined

      vi.mocked(claim).mockReturnValueOnce(
        new Promise<string>((resolve) => {
          resolveClaim = resolve
        }),
      )

      mountModal()

      await emitCapture([{ rawValue: JSON.stringify(VALID_PAYLOAD) }])
      await wrapper!.find('form').trigger('submit')
      await wrapper!.find('form').trigger('submit')

      expect(claim).toHaveBeenCalledTimes(1)

      resolveClaim('SmartPack claimed successfully.')
      await flushPromises()
    })

    it('shows the API error message when claiming fails', async () => {
      vi.mocked(claim).mockRejectedValueOnce(new Error('SmartPack already claimed.'))

      mountModal()

      await emitCapture([{ rawValue: JSON.stringify(VALID_PAYLOAD) }])
      await wrapper!.find('form').trigger('submit')
      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('SmartPack already claimed.')
      expect(mockNotifySuccess).not.toHaveBeenCalled()
      expect(wrapper!.emitted('claimed')).toBeUndefined()
    })

    it('stringifies non-Error rejections', async () => {
      vi.mocked(claim).mockRejectedValueOnce('unknown error')

      mountModal()

      await emitCapture([{ rawValue: JSON.stringify(VALID_PAYLOAD) }])
      await wrapper!.find('form').trigger('submit')
      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('unknown error')
    })
  })

  describe('closing', () => {
    it('emits close when Cancel is clicked', async () => {
      mountModal()

      await findButtonByText('Cancel')!.trigger('click')

      expect(wrapper!.emitted('close')).toHaveLength(1)
    })

    it('stops the scanner and emits close when Cancel is clicked during scanning', async () => {
      mountModal()

      await startScan()
      await findButtonByText('Cancel')!.trigger('click')

      expect(wrapper!.findComponent({ name: 'QrcodeStream' }).exists()).toBe(false)
      expect(wrapper!.emitted('close')).toHaveLength(1)
    })
  })
})
