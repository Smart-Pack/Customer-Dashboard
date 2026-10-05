import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import SmartPackQrComponent, { type SmartPackQrItem } from '@/components/Smartpacks/QrCode.vue'

const QRCodeVue3Stub = defineComponent({
  name: 'QRCodeVue3',
  props: {
    value: String,
    width: Number,
    height: Number,
    dotsOptions: Object,
    qrOptions: Object,
    download: Boolean,
    downloadButton: String,
    downloadOptions: Object,
  },
  setup(_, { slots }) {
    return () => h('div', slots.default?.())
  },
})

const mountQr = (item?: SmartPackQrItem) =>
  mount(SmartPackQrComponent, {
    props: item ? { item } : {},
    global: {
      stubs: {
        QRCodeVue3: QRCodeVue3Stub,
      },
    },
  })

const findQr = (wrapper: VueWrapper) => wrapper.findComponent({ name: 'QRCodeVue3' })

describe('SmartPackQrComponent', () => {
  describe('productQrData', () => {
    it('serializes id, device_uid, imei, and type when an item is provided', () => {
      const wrapper = mountQr({
        id: 1,
        device_uid: 'SP-0001',
        imei: '490154203237518',
      })

      const qr = findQr(wrapper)

      expect(JSON.parse(qr.props('value') as string)).toEqual({
        id: 1,
        device_uid: 'SP-0001',
        imei: '490154203237518',
        type: 'smartpack',
      })

      wrapper.unmount()
    })

    it('falls back to empty device_uid/imei and undefined id when no item is provided', () => {
      const wrapper = mountQr()
      const qr = findQr(wrapper)

      expect(JSON.parse(qr.props('value') as string)).toEqual({
        device_uid: '',
        imei: '',
        type: 'smartpack',
      })

      wrapper.unmount()
    })
  })

  describe('rendering', () => {
    it('passes download configuration through to QRCodeVue3', () => {
      const wrapper = mountQr({ device_uid: 'SP-0001', imei: '228573283279319' })
      const qr = findQr(wrapper)

      expect(qr.props('download')).toBe(true)
      expect(qr.props('downloadButton')).toBe('smartpack-qr-button')
      expect(qr.props('downloadOptions')).toEqual({
        name: 'smartpack_qr_228573283279319',
        extension: 'png',
      })

      wrapper.unmount()
    })

    it('passes width, height, and QR styling options through', () => {
      const wrapper = mountQr()
      const qr = findQr(wrapper)

      expect(qr.props('width')).toBe(500)
      expect(qr.props('height')).toBe(500)
      expect(qr.props('dotsOptions')).toEqual({
        type: 'square',
        color: '#000000',
      })
      expect(qr.props('qrOptions')).toEqual({
        typeNumber: 0,
        mode: 'Byte',
        errorCorrectionLevel: 'H',
      })

      wrapper.unmount()
    })
  })

  describe('mounted', () => {
    let button: HTMLButtonElement
    let wrapper: VueWrapper | undefined

    beforeEach(() => {
      vi.useFakeTimers()

      button = document.createElement('button')
      button.className = 'smartpack-qr-button'
    })

    afterEach(() => {
      wrapper?.unmount()
      wrapper = undefined

      vi.clearAllTimers()
      vi.clearAllMocks()
      vi.useRealTimers()

      button.remove()
    })

    it('polls until the download button appears, then clicks it and emits showQr(false)', async () => {
      wrapper = mountQr({ device_uid: 'SP-0001' })

      const clickSpy = vi.fn<() => void>()
      button.addEventListener('click', clickSpy)

      await vi.advanceTimersByTimeAsync(300)

      expect(clickSpy).not.toHaveBeenCalled()
      expect(wrapper.emitted('showQr')).toBeUndefined()

      document.body.appendChild(button)

      await vi.advanceTimersByTimeAsync(100)

      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('showQr')).toEqual([[false]])
    })

    it('stops polling once the button has been clicked', async () => {
      document.body.appendChild(button)

      const clickSpy = vi.fn<() => void>()
      button.addEventListener('click', clickSpy)

      wrapper = mountQr()

      await vi.advanceTimersByTimeAsync(100)

      expect(clickSpy).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(500)

      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('showQr')).toHaveLength(1)
    })
  })
})
