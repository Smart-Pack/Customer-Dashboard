// @/stores/modules/mqtt/index.ts
import { defineStore } from 'pinia'
import { mqtt } from '@/api/modules'
import type { MQTTConfig } from '@/api/modules/mqtt'

/**
 * MQTT store.
 *
 * Manages MQTT broker configuration, loading state, and errors
 * for frontend MQTT connections.
 */
export const useMqttStore = defineStore('mqtt', {
  state: () => ({
    /**
     * MQTT broker configuration retrieved from the backend.
     */
    config: null as MQTTConfig | null,

    /**
     * Indicates whether the MQTT configuration is being fetched.
     */
    isLoading: false,

    /**
     * Stores the configuration loading error, if any.
     */
    error: null as string | null,
  }),

  getters: {
    /**
     * Get the current MQTT broker configuration.
     */
    getConfig: (state): MQTTConfig | null => state.config,

    /**
     * Check whether MQTT configuration has been loaded.
     */
    hasConfig: (state): boolean => state.config !== null,

    /**
     * Get the MQTT configuration loading state.
     */
    getIsLoading: (state): boolean => state.isLoading,

    /**
     * Get the current MQTT configuration error.
     */
    getError: (state): string | null => state.error,
  },

  actions: {
    /**
     * Fetch MQTT configuration from the backend.
     *
     * Returns the cached configuration when available unless
     * a fresh configuration is explicitly requested.
     *
     * @param force - Whether to fetch the configuration again.
     * @returns A promise resolving with the MQTT configuration.
     */
    async fetchConfig(force = false): Promise<MQTTConfig> {
      if (this.config && !force) {
        return this.config
      }

      this.isLoading = true
      this.error = null

      try {
        this.config = await mqtt.getConfig()
        return this.config
      } catch (error: unknown) {
        this.error = 'Failed to load MQTT configuration.'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Clear the cached MQTT configuration and any associated error.
     *
     * Useful when the user logs out.
     */
    clearConfig(): void {
      this.config = null
      this.error = null
      this.isLoading = false
    },
  },
})

export type MqttStore = ReturnType<typeof useMqttStore>
