### BluetoothButton

**Source:** `src/components/Smartpacks/BluetoothButton.vue`

The `BluetoothButton` component manages Bluetooth Classic communication between the SmartPack Customer Dashboard Android application and ESP32-based SmartPack devices.

It provides an interface for connecting to and disconnecting from a SmartPack using its Bluetooth MAC address. It also monitors the phone's Bluetooth adapter status and receives serial data from the connected device.

#### Key Features

- **Connection Management:** Connects to and disconnects from a SmartPack using its Bluetooth MAC address.
- **Adapter Status Monitoring:** Periodically checks whether the phone's Bluetooth adapter is enabled and notifies the user when its state changes.
- **Connection Feedback:** Displays the appropriate connection state, loading indicator, and Bluetooth status icon.
- **Serial Data Reception:** Listens for incoming Bluetooth serial data and emits updates to the parent component.
- **Connection Monitoring:** Detects connection loss, updates the parent component, and provides appropriate feedback.
- **Data Buffer Management:** Maintains received serial data up to a maximum of 5,000 characters.
- **Accessibility:** Provides an accessible button label that communicates the connection and Bluetooth adapter states.
- **Resource Cleanup:** Stops adapter status polling and releases the Bluetooth connection when the component is unmounted.

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `macAddress` | `string \| null \| undefined` | `null` | Bluetooth MAC address of the SmartPack device. |
| `isBluetoothConnected` | `boolean` | `false` | Indicates whether the application is connected to the SmartPack. |
| `bluetoothData` | `string` | `''` | Holds the serial data received from the SmartPack. |

#### Events

| Event | Payload | Description |
|---|---|---|
| `update:isBluetoothConnected` | `boolean` | Emits changes to the SmartPack Bluetooth connection state. |
| `update:bluetoothData` | `string` | Emits updated Bluetooth serial data. |

Both connection state and received data support Vue's named `v-model` binding.

#### Internal Behaviour

- Checks the phone's Bluetooth adapter status immediately after mounting and every 2 seconds thereafter.
- Displays the Bluetooth off icon only when the adapter is confirmed to be disabled.
- Prevents overlapping adapter status checks.
- Avoids repeatedly logging adapter status errors.
- Prevents multiple simultaneous connection attempts.
- Starts listening for serial data after a successful connection.
- Retains only the latest 5,000 characters of received data.
- Clears connection state and received data when the connection is lost or the component is unmounted.
- Disconnects the shared Bluetooth Serial service during cleanup.

#### Usage

The component is designed for mobile mode and should be mounted once at a time because it manages a shared Bluetooth Serial connection.

```vue
<BluetoothButton
  :mac-address="smartPack.bluetooth_mac_address"
  v-model:isBluetoothConnected="isBluetoothConnected"
  v-model:bluetoothData="bluetoothData"
/>
```

The parent component owns the connection state and received data, allowing other parts of the dashboard to display or process incoming SmartPack sensor information.
