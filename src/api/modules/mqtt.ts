import apiClient from '@/api/client'
import { MQTT } from '../endpoints'

export interface MQTTConfig {
  host: string
  port: number
  use_tls: boolean
  username: string
  password: string
}

/**
 * Retrieves MQTT broker configuration for the authenticated user.
 *
 * @returns A promise resolving with the MQTT broker configuration.
 */
export const getConfig = async (): Promise<MQTTConfig> => {
  const response = await apiClient.get<MQTTConfig>(MQTT.CONFIG)

  return response.data
}
