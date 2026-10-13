```vue
<template>
  <div class="invisible absolute">
    <QRCodeVue3
      :value="productQrData"
      :width="500"
      :height="500"
      :dotsOptions="{ type: 'square', color: '#000000' }"
      :qrOptions="{ typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'M' }"
      :download="true"
      downloadButton="smartpack-qr-button"
      :downloadOptions="{
        name: `smartpack_qr_${item.imei}`,
        extension: 'png',
      }"
    />
  </div>
</template>

<script lang="ts">
/**
 * @module components/Smartpacks/QrCode
 * @description Renders and downloads a QR code for the given SmartPack immediately after mount.
 */

import { defineComponent, type PropType } from 'vue'
import QRCodeVue3 from 'qrcode-vue3'

export interface SmartPackQrItem {
  id?: number
  device_uid?: string
  imei?: string
}

export default defineComponent({
  name: 'SmartPackQrComponent',

  components: {
    QRCodeVue3,
  },

  props: {
    item: {
      type: Object as PropType<SmartPackQrItem>,
      default: (): SmartPackQrItem => ({
        device_uid: '',
        imei: '',
      }),
    },
  },

  emits: {
    showQr: (value: boolean) => typeof value === 'boolean',
  },

  data() {
    return {
      waitForButton: undefined as ReturnType<typeof setInterval> | undefined,
    }
  },

  computed: {
    /**
     * Serializes the SmartPack metadata into the payload used by the QR component.
     */
    productQrData(): string {
      const data = {
        id: this.item.id,
        device_uid: this.item.device_uid,
        imei: this.item.imei,
        type: 'smartpack',
      }

      return JSON.stringify(data)
    },
  },

  /**
   * Clicks the QR download button after the component renders so the image is downloaded,
   * then notifies the parent to hide this helper.
   */
  mounted(): void {
    this.waitForButton = setInterval(() => {
      const btn = document.querySelector<HTMLElement>('.smartpack-qr-button')

      if (btn) {
        btn.click()
        this.$emit('showQr', false)

        clearInterval(this.waitForButton)
        this.waitForButton = undefined
      }
    }, 100)
  },

  /**
   * Clears the polling interval if the component is unmounted before the
   * QR download button becomes available.
   */
  beforeUnmount(): void {
    if (this.waitForButton) {
      clearInterval(this.waitForButton)
      this.waitForButton = undefined
    }
  },
})
</script>
