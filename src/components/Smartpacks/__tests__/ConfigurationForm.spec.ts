import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ConfigurationForm from '@/components/Smartpacks/ConfigurationForm.vue'
import CreationFormLayout from '@/components/Base/CreationFormLayout.vue'
import type { AdderResult } from '@/components/Base/CreationFormLayout.vue'
import type { SmartPackConfiguration } from '@/types/bluetooth'

const { mockWrite } = vi.hoisted(() => ({
  mockWrite: vi.fn<(command: string) => Promise<void>>(),
}))

vi.mock('@/services/bluetoothSerial', () => ({
  bluetoothSerialService: { write: mockWrite },
}))

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
type ConfigurationAdder = (payload: Record<string, unknown>) => Promise<AdderResult>

const getAdder = (wrapper: ReturnType<typeof mountForm>) =>
  wrapper.findComponent(CreationFormLayout).props('adder') as unknown as ConfigurationAdder

/** Form values identical to mockSmartPackConfiguration, so nothing counts as changed. */
const unchangedValues = {
  weight_limit: 20000,
  delay: 55,
  com_mode: 0,
  wifi_ssid: 'SmartPack-WiFi',
  wifi_password: 'password123',
  bluetooth_name: 'SmartPack',
}
describe('ConfigurationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWrite.mockResolvedValue(undefined)
  })
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
            rules: 'required|positive_integer|min_value:1',
            icon: expect.anything(),
          },
          {
            name: 'weight_limit',
            label: 'Weight Limit (grams)',
            errorName: 'Weight limit',
            placeholder: 'Enter weight limit',
            type: 'number',
            rules: 'required|positive_integer|min_value:1',
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

  describe('configurationAdder', () => {
    it('rejects when Bluetooth is disconnected', async () => {
      const wrapper = mountForm(mockSmartPackConfiguration, false)

      await expect(getAdder(wrapper)(unchangedValues)).rejects.toThrow(
        'Bluetooth is disconnected. Please reconnect to the SmartPack and try again.',
      )
      expect(mockWrite).not.toHaveBeenCalled()
    })

    it('resolves with a success message and the Bluetooth name as id', async () => {
      const wrapper = mountForm(mockSmartPackConfiguration, true)

      await expect(getAdder(wrapper)(unchangedValues)).resolves.toEqual({
        message: 'SmartPack configuration commands sent successfully.',
        data: { id: 'SmartPack' },
      })
    })

    it('sends nothing when no values changed', async () => {
      const wrapper = mountForm(mockSmartPackConfiguration, true)

      await getAdder(wrapper)(unchangedValues)

      expect(mockWrite).not.toHaveBeenCalled()
    })

    it('treats numeric strings equal to the current values as unchanged', async () => {
      const wrapper = mountForm(mockSmartPackConfiguration, true)

      await getAdder(wrapper)({
        ...unchangedValues,
        weight_limit: '20000',
        delay: '55',
        com_mode: '0',
      })

      expect(mockWrite).not.toHaveBeenCalled()
    })
  })

  describe('sending configuration commands', () => {
    const submit = (changes: Record<string, unknown>) => {
      const wrapper = mountForm(mockSmartPackConfiguration, true)
      return getAdder(wrapper)({ ...unchangedValues, ...changes })
    }

    it('sends a weight_limit command when it changes', async () => {
      await submit({ weight_limit: '25000' })

      expect(mockWrite).toHaveBeenCalledExactlyOnceWith('weight_limit,25000')
    })

    it('sends a delay command when it changes', async () => {
      await submit({ delay: 60 })

      expect(mockWrite).toHaveBeenCalledExactlyOnceWith('delay,60')
    })

    it('sends a com_mode command with a numeric value', async () => {
      await submit({ com_mode: '1' })

      expect(mockWrite).toHaveBeenCalledExactlyOnceWith('com_mode,1')
    })

    it('sends a bluetooth_name command when it changes', async () => {
      await submit({ bluetooth_name: 'SmartPack-02' })

      expect(mockWrite).toHaveBeenCalledExactlyOnceWith('bluetooth_name,SmartPack-02')
    })

    it('sends one wifi_settings command when only the SSID changes', async () => {
      await submit({ wifi_ssid: 'NewNetwork' })

      expect(mockWrite).toHaveBeenCalledExactlyOnceWith('wifi_settings,NewNetwork,password123')
    })

    it('sends one wifi_settings command when only the password changes', async () => {
      await submit({ wifi_password: 'newpass' })

      expect(mockWrite).toHaveBeenCalledExactlyOnceWith('wifi_settings,SmartPack-WiFi,newpass')
    })

    it('sends one wifi_settings command when both SSID and password change', async () => {
      await submit({ wifi_ssid: 'A', wifi_password: 'B' })

      expect(mockWrite).toHaveBeenCalledExactlyOnceWith('wifi_settings,A,B')
    })

    it('sends only the commands for changed settings, in a fixed order', async () => {
      await submit({
        wifi_ssid: 'A',
        wifi_password: 'B',
        bluetooth_name: 'SmartPack-02',
        com_mode: 1,
        delay: 60,
        weight_limit: 25000,
      })

      expect(mockWrite.mock.calls.map(([command]) => command)).toEqual([
        'weight_limit,25000',
        'delay,60',
        'com_mode,1',
        'bluetooth_name,SmartPack-02',
        'wifi_settings,A,B',
      ])
    })

    it('writes commands one at a time', async () => {
      let releaseFirst: () => void = () => {}
      mockWrite.mockImplementationOnce(
        () => new Promise<void>((resolve) => (releaseFirst = resolve)),
      )

      const pending = submit({ weight_limit: 25000, delay: 60 })
      await Promise.resolve()

      expect(mockWrite).toHaveBeenCalledTimes(1)

      releaseFirst()
      await pending

      expect(mockWrite).toHaveBeenCalledTimes(2)
    })

    it('stops sending and rejects when a write fails', async () => {
      mockWrite.mockRejectedValueOnce(new Error('Write failed'))

      await expect(submit({ weight_limit: 25000, delay: 60 })).rejects.toThrow('Write failed')

      expect(mockWrite).toHaveBeenCalledTimes(1)
    })
  })
})
