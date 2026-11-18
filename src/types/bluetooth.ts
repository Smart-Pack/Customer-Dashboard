/**
 * Represents sensor readings received from a SmartPack device.
 */
export interface SmartPackSensorData {
  /** Current backpack weight in grams. */
  weight: number

  /** Total number of steps recorded. */
  steps: number
}

/**
 * Represents a sensor data message received over Bluetooth.
 */
export interface SmartPackSensorMessage {
  type: 'sensors'
  data: SmartPackSensorData
}

/**
 * Represents the configuration settings for a SmartPack device.
 *
 * These settings are transmitted to the ESP32 firmware over Bluetooth
 * as a JSON payload.
 */
export interface SmartPackConfiguration {
  /**
   * Maximum allowable backpack weight in grams.
   */
  weight_limit: number

  /**
   * Delay interval in seconds.
   */
  delay: number

  /**
   * Communication mode.
   * - `0`: GSM
   * - `1`: Wi-Fi
   */
  com_mode: 0 | 1

  /**
   * Wi-Fi network configuration.
   */
  wifi_settings: {
    /**
     * Wi-Fi network name (SSID).
     */
    ssid: string

    /**
     * Wi-Fi network password.
     */
    password: string
  }

  /**
   * Bluetooth device name.
   */
  bluetooth_name: string
}
/**
 * Represents a sensor reading received from a SmartPack device,
 * including the timestamp when the reading was recorded.
 */
export interface SmartPackSensorRecord extends SmartPackSensorData {
  /** Timestamp when the sensor reading was recorded. */
  timestamp: string
}
