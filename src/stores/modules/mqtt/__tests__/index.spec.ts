import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { mqtt } from '@/api/modules'
import type { MQTTConfig } from '@/api/modules/mqtt'
import { useMqttStore } from '../index'

vi.mock('@/api/modules', () => ({
  mqtt: {
    getConfig: vi.fn<() => Promise<MQTTConfig>>(),
  },
}))

const mockConfig: MQTTConfig = {
  host: 'mqtt.example.com',
  port: 8883,
  use_tls: true,
  username: 'frontend',
  password: 'test-password',
}

describe('useMqttStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  describe('initial state', () => {
    it('initializes configuration as null', () => {
      const store = useMqttStore()

      expect(store.config).toBeNull()
    })

    it('initializes loading state as false', () => {
      const store = useMqttStore()

      expect(store.isLoading).toBe(false)
    })

    it('initializes error as null', () => {
      const store = useMqttStore()

      expect(store.error).toBeNull()
    })
  })

  describe('getters', () => {
    it('returns the current configuration', () => {
      const store = useMqttStore()

      expect(store.getConfig).toBeNull()

      store.config = mockConfig

      expect(store.getConfig).toEqual(mockConfig)
    })

    it('indicates whether configuration has been loaded', () => {
      const store = useMqttStore()

      expect(store.hasConfig).toBe(false)

      store.config = mockConfig

      expect(store.hasConfig).toBe(true)
    })

    it('returns the loading state', () => {
      const store = useMqttStore()

      expect(store.getIsLoading).toBe(false)

      store.isLoading = true

      expect(store.getIsLoading).toBe(true)
    })

    it('returns the current error', () => {
      const store = useMqttStore()

      expect(store.getError).toBeNull()

      store.error = 'Request failed'

      expect(store.getError).toBe('Request failed')
    })
  })

  describe('fetchConfig', () => {
    it('fetches and stores MQTT configuration', async () => {
      const store = useMqttStore()

      vi.mocked(mqtt.getConfig).mockResolvedValue(mockConfig)

      const result = await store.fetchConfig()

      expect(mqtt.getConfig).toHaveBeenCalledOnce()
      expect(result).toEqual(mockConfig)
      expect(store.config).toEqual(mockConfig)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('returns cached configuration without fetching again', async () => {
      const store = useMqttStore()

      store.config = mockConfig

      const result = await store.fetchConfig()

      expect(mqtt.getConfig).not.toHaveBeenCalled()
      expect(result).toEqual(mockConfig)
    })

    it('fetches fresh configuration when forced', async () => {
      const store = useMqttStore()
      const updatedConfig = { ...mockConfig, host: 'mqtt.updated.com' }

      store.config = mockConfig
      vi.mocked(mqtt.getConfig).mockResolvedValue(updatedConfig)

      const result = await store.fetchConfig(true)

      expect(mqtt.getConfig).toHaveBeenCalledOnce()
      expect(result).toEqual(updatedConfig)
      expect(store.config).toEqual(updatedConfig)
    })

    it('sets an error and rethrows when fetching fails', async () => {
      const store = useMqttStore()

      vi.mocked(mqtt.getConfig).mockRejectedValue(new Error('Request failed'))

      await expect(store.fetchConfig()).rejects.toThrow('Request failed')

      expect(store.error).toBe('Failed to load MQTT configuration.')
      expect(store.config).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('clears a previous error before fetching', async () => {
      const store = useMqttStore()

      store.error = 'Previous error'
      vi.mocked(mqtt.getConfig).mockResolvedValue(mockConfig)

      await store.fetchConfig()

      expect(store.error).toBeNull()
    })
  })

  describe('clearConfig', () => {
    it('clears configuration, error, and loading state', () => {
      const store = useMqttStore()

      store.config = mockConfig
      store.error = 'Request failed'
      store.isLoading = true

      store.clearConfig()

      expect(store.config).toBeNull()
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.hasConfig).toBe(false)
    })
  })
})
