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
 * Represents a sensor reading received from a SmartPack device,
 * including the timestamp when the reading was recorded.
 */
export interface SmartPackSensorRecord extends SmartPackSensorData {
  /** Timestamp when the sensor reading was recorded. */
  timestamp: string
}
