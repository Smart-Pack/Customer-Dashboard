import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/api/client'
import { MQTT } from '@/api/endpoints'
import { mqtt } from '@/api/modules'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn<typeof apiClient.get>(),
  },
}))

describe('mqtt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getConfig', () => {
    it('fetches MQTT configuration and returns the response data', async () => {
      const config = {
        host: 'mqtt.example.com',
        port: 8883,
        use_tls: true,
        username: 'frontend',
        password: 'test-password',
      }

      vi.mocked(apiClient.get).mockResolvedValue({
        data: config,
      })

      const result = await mqtt.getConfig()

      expect(apiClient.get).toHaveBeenCalledWith(MQTT.CONFIG)
      expect(result).toEqual(config)
    })

    it('throws when the API request fails', async () => {
      const error = new Error('Request failed')

      vi.mocked(apiClient.get).mockRejectedValue(error)

      await expect(mqtt.getConfig()).rejects.toThrow('Request failed')
    })
  })
})
