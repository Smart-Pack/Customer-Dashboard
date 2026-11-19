<template>
  <CreationFormLayout
    pageHeading=""
    page-description="Configure your SmartPack device settings."
    :sections="sections"
    name="SmartPack Configuration"
    :adder="configurationAdder"
    :initial-values="initialValuesAsFormItem"
    @close="handlePageChange"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType, markRaw } from 'vue'

import type { SmartPackConfiguration } from '@/types/bluetooth'
import CreationFormLayout from '@/components/Base/CreationFormLayout.vue'
import type { AdderResult, FormItem } from '@/components/Base/CreationFormLayout.vue'

import WifiIcon from '@/components/Icons/WifiIcon.vue'
import KeyIcon from '@/components/Icons/KeyIcon.vue'
import BluetoothOnIcon from '@/components/Icons/BluetoothOnIcon.vue'
import ClockIcon from '@/components/Icons/ClockIcon.vue'
import ScaleIcon from '@/components/Icons/ScaleIcon.vue'
import SignalIcon from '@/components/Icons/SignalIcon.vue'
import { bluetoothSerialService } from '@/services/bluetoothSerial'

/**
 * @module components/Smartpacks/ConfigurationForm
 * @description Form for configuring a SmartPack's communication,
 * connectivity, and sensor settings.
 */
export default defineComponent({
  name: 'SmartPackConfigurationForm',

  components: {
    CreationFormLayout,
  },

  props: {
    /**
     * Initial SmartPack configuration values.
     */
    initialValues: {
      type: Object as PropType<SmartPackConfiguration>,
      required: true,
    },
    isBluetoothConnected: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      sections: [
        {
          title: 'Wi-Fi Settings',
          fields: [
            {
              name: 'wifi_ssid',
              label: 'Wi-Fi Network Name (SSID)',
              errorName: 'Wi-Fi network name',
              placeholder: 'Enter Wi-Fi network name',
              specificType: 'text',
              rules: 'max:100',
              icon: markRaw(WifiIcon),
            },
            {
              name: 'wifi_password',
              label: 'Wi-Fi Password',
              errorName: 'Wi-Fi password',
              placeholder: 'Enter Wi-Fi password',
              type: 'password',
              rules: 'max:100',
              icon: markRaw(KeyIcon),
            },
          ],
        },
        {
          title: 'Bluetooth Settings',
          fields: [
            {
              name: 'bluetooth_name',
              label: 'Bluetooth Device Name',
              errorName: 'Bluetooth device name',
              placeholder: 'Enter Bluetooth device name',
              rules: 'required|max:100',
              icon: markRaw(BluetoothOnIcon),
            },
          ],
        },
        {
          title: 'Sensor Settings',
          fields: [
            {
              name: 'delay',
              label: 'Measurement Delay (seconds)',
              errorName: 'Measurement delay',
              placeholder: 'Enter measurement delay',
              type: 'number',
              rules: 'required|positive_integer|min_value:1',
              icon: markRaw(ClockIcon),
            },
            {
              name: 'weight_limit',
              label: 'Weight Limit (grams)',
              errorName: 'Weight limit',
              placeholder: 'Enter weight limit',
              type: 'number',
              rules: 'required|positive_integer|min_value:1',
              icon: markRaw(ScaleIcon),
            },
          ],
        },
        {
          title: 'Communication Settings',
          fields: [
            {
              name: 'com_mode',
              label: 'Communication Mode',
              errorName: 'Communication mode',
              placeholder: 'Select communication mode',
              variant: 'select',
              rules: 'required',
              options: [
                { label: 'GSM', value: 0 },
                { label: 'Wi-Fi', value: 1 },
              ],
              icon: markRaw(SignalIcon),
            },
          ],
        },
      ],
    }
  },

  computed: {
    /**
     * Maps the existing SmartPack configuration into form values.
     */
    initialValuesAsFormItem(): FormItem {
      return {
        weight_limit: this.initialValues.weight_limit,
        delay: this.initialValues.delay,
        com_mode: this.initialValues.com_mode,
        wifi_ssid: this.initialValues.wifi_settings?.ssid ?? '',
        wifi_password: this.initialValues.wifi_settings?.password ?? '',
        bluetooth_name: this.initialValues.bluetooth_name,
      } as unknown as FormItem
    },
  },

  methods: {
    /**
     * Emits the form close event.
     */
    handlePageChange(): void {
      this.$emit('close')
    },
    /**
     * Sends the updated configuration to the SmartPack.
     * Requires an active Bluetooth connection.
     */
    async configurationAdder(payload: Record<string, unknown>): Promise<AdderResult> {
      if (!this.isBluetoothConnected) {
        throw new Error(
          'Bluetooth is disconnected. Please reconnect to the SmartPack and try again.',
        )
      }

      await this.sendConfiguration(payload as FormItem)

      return {
        message: 'SmartPack configuration commands sent successfully.',
        data: {
          id: this.initialValues.bluetooth_name,
        },
      }
    },
    /**
     * Sends only the configuration settings that have changed.
     */
    async sendConfiguration(values: FormItem): Promise<void> {
      if (!this.isBluetoothConnected) {
        throw new Error(
          'Bluetooth is disconnected. Please reconnect to the SmartPack and try again.',
        )
      }

      const initial = this.initialValues
      const commands: string[] = []

      // Sensor settings
      if (Number(values.weight_limit) !== initial.weight_limit) {
        commands.push(`weight_limit,${values.weight_limit}`)
      }

      if (Number(values.delay) !== initial.delay) {
        commands.push(`delay,${values.delay}`)
      }

      // Communication mode
      const communicationMode = Number(values.com_mode)

      if (communicationMode !== initial.com_mode) {
        commands.push(`com_mode,${communicationMode}`)
      }

      // Bluetooth name
      if (values.bluetooth_name !== initial.bluetooth_name) {
        commands.push(`bluetooth_name,${values.bluetooth_name}`)
      }

      // Wi-Fi settings
      const wifiSettingsChanged =
        values.wifi_ssid !== (initial.wifi_settings?.ssid ?? '') ||
        values.wifi_password !== (initial.wifi_settings?.password ?? '')

      if (wifiSettingsChanged) {
        commands.push(`wifi_settings,${values.wifi_ssid},${values.wifi_password}`)
      }

      // Nothing to update
      if (commands.length === 0) return

      for (const command of commands) {
        await bluetoothSerialService.write(command)
      }
    },
  },
})
</script>
