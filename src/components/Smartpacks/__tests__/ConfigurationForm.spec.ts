import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ConfigurationForm from '@/components/Smartpacks/ConfigurationForm.vue'
import CreationFormLayout from '@/components/Base/CreationFormLayout.vue'
import type { SmartPackConfiguration } from '@/types/bluetooth'

const mockSmartPackConfiguration: SmartPackConfiguration = {
  weight_limit: 20000,
  delay: 55,
  com_mode: 0,
  wifi_settings: {
    ssid: 'SmartPack-WiFi',
    password: 'password123',
  },
  bluetooth_name: 'SmartPack',
}

const mountForm = (
  initialValues: SmartPackConfiguration = mockSmartPackConfiguration,
  isBluetoothConnected = false,
) =>
  mount(ConfigurationForm, {
    props: {
      initialValues,
      isBluetoothConnected,
    },
    global: {
      stubs: {
        CreationFormLayout: true,
      },
    },
  })

describe('ConfigurationForm', () => {
  describe('rendering', () => {
    it('renders a CreationFormLayout', () => {
      const wrapper = mountForm()

      expect(wrapper.findComponent(CreationFormLayout).exists()).toBe(true)
    })

    it('passes the page description and resource name through', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('pageHeading')).toBe('')
      expect(layout.props('pageDescription')).toBe('Configure your SmartPack device settings.')
      expect(layout.props('name')).toBe('SmartPack Configuration')
    })

    it('passes the configuration adder to the layout', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(typeof layout.props('adder')).toBe('function')
    })

    it('passes the initial configuration values to the layout', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('initialValues')).toEqual({
        weight_limit: 20000,
        delay: 55,
        com_mode: 0,
        wifi_ssid: 'SmartPack-WiFi',
        wifi_password: 'password123',
        bluetooth_name: 'SmartPack',
      })
    })

    it('defaults isBluetoothConnected to false', () => {
      const wrapper = mountForm()

      expect(wrapper.props('isBluetoothConnected')).toBe(false)
    })

    it('accepts a connected Bluetooth state', () => {
      const wrapper = mountForm(mockSmartPackConfiguration, true)

      expect(wrapper.props('isBluetoothConnected')).toBe(true)
    })
  })

  describe('sections', () => {
    it('configures the Wi-Fi settings section', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('sections')[0]).toEqual({
        title: 'Wi-Fi Settings',
        fields: [
          {
            name: 'wifi_ssid',
            label: 'Wi-Fi Network Name (SSID)',
            errorName: 'Wi-Fi network name',
            placeholder: 'Enter Wi-Fi network name',
            specificType: 'text',
            rules: 'max:100',
            icon: expect.anything(),
          },
          {
            name: 'wifi_password',
            label: 'Wi-Fi Password',
            errorName: 'Wi-Fi password',
            placeholder: 'Enter Wi-Fi password',
            type: 'password',
            rules: 'max:100',
            icon: expect.anything(),
          },
        ],
      })
    })

    it('configures the Bluetooth settings section', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('sections')[1]).toEqual({
        title: 'Bluetooth Settings',
        fields: [
          {
            name: 'bluetooth_name',
            label: 'Bluetooth Device Name',
            errorName: 'Bluetooth device name',
            placeholder: 'Enter Bluetooth device name',
            rules: 'required|max:100',
            icon: expect.anything(),
          },
        ],
      })
    })

    it('configures the sensor settings section', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('sections')[2]).toEqual({
        title: 'Sensor Settings',
        fields: [
          {
            name: 'delay',
            label: 'Measurement Delay (seconds)',
            errorName: 'Measurement delay',
            placeholder: 'Enter measurement delay',
            type: 'number',
            rules: 'required|integer|min_value:1',
            icon: expect.anything(),
          },
          {
            name: 'weight_limit',
            label: 'Weight Limit (grams)',
            errorName: 'Weight limit',
            placeholder: 'Enter weight limit',
            type: 'number',
            rules: 'required|integer|min_value:1',
            icon: expect.anything(),
          },
        ],
      })
    })

    it('configures the communication settings section', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('sections')[3]).toEqual({
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
            icon: expect.anything(),
          },
        ],
      })
    })

    it('configures all four settings sections', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('sections')).toHaveLength(4)
    })
  })

  describe('initial values mapping', () => {
    it('maps an empty Wi-Fi configuration to empty form values', () => {
      const configuration: SmartPackConfiguration = {
        ...mockSmartPackConfiguration,
        wifi_settings: {
          ssid: '',
          password: '',
        },
      }

      const wrapper = mountForm(configuration)
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('initialValues')).toEqual({
        weight_limit: 20000,
        delay: 55,
        com_mode: 0,
        wifi_ssid: '',
        wifi_password: '',
        bluetooth_name: 'SmartPack',
      })
    })

    it('maps updated configuration values correctly', () => {
      const configuration: SmartPackConfiguration = {
        weight_limit: 25000,
        delay: 60,
        com_mode: 1,
        wifi_settings: {
          ssid: 'Updated-WiFi',
          password: 'updated-password',
        },
        bluetooth_name: 'SmartPack-01',
      }

      const wrapper = mountForm(configuration)
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('initialValues')).toEqual({
        weight_limit: 25000,
        delay: 60,
        com_mode: 1,
        wifi_ssid: 'Updated-WiFi',
        wifi_password: 'updated-password',
        bluetooth_name: 'SmartPack-01',
      })
    })
  })

  describe('events', () => {
    it('emits close without arguments when the layout emits close', async () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      await layout.vm.$emit('close')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')).toEqual([[]])
    })
  })
})
