### BluetoothButton

**Source:** `src/components/Smartpacks/BluetoothButton.vue`

The `BluetoothButton` component manages Bluetooth Classic communication between the SmartPack Customer Dashboard Android application and ESP32-based SmartPack devices.

It provides an interface for connecting to and disconnecting from a SmartPack using its Bluetooth MAC address. It also monitors the phone's Bluetooth adapter status and receives JSON messages from the connected device through Bluetooth serial communication.

#### Key Features

- **Connection Management:** Connects to and disconnects from a SmartPack using its Bluetooth MAC address.
- **Adapter Status Monitoring:** Periodically checks whether the phone's Bluetooth adapter is enabled and notifies the user when its state changes.
- **Connection Feedback:** Displays the appropriate connection state, loading indicator, and Bluetooth status icon.
- **JSON Message Reception:** Receives Bluetooth serial data, buffers incoming chunks, parses complete JSON messages, and emits them to the parent component.
- **Connection Monitoring:** Detects connection loss, updates the parent component, and provides appropriate feedback.
- **Message Buffer Management:** Temporarily buffers incomplete messages up to a maximum of 10,000 characters while waiting for a message delimiter.
- **Accessibility:** Provides an accessible button label that communicates the connection and Bluetooth adapter states.
- **Resource Cleanup:** Stops adapter status polling and releases the Bluetooth connection when the component is unmounted.

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `macAddress` | `string \| null \| undefined` | `null` | Bluetooth MAC address of the SmartPack device. |
| `isBluetoothConnected` | `boolean` | `false` | Indicates whether the application is connected to the SmartPack. |

#### Events

| Event | Payload | Description |
|---|---|---|
| `update:isBluetoothConnected` | `boolean` | Emits changes to the SmartPack Bluetooth connection state. |
| `message` | `unknown` | Emits a complete parsed JSON object received from the SmartPack. |

The connection state supports Vue's named `v-model` binding through `v-model:isBluetoothConnected`. Received messages are delivered through the `message` event using an event listener.

#### Internal Behaviour

- Checks the phone's Bluetooth adapter status immediately after mounting and every 2 seconds thereafter.
- Displays the Bluetooth off icon only when the adapter is confirmed to be disabled.
- Notifies the user when Bluetooth changes state, without displaying a notification for the initial status check.
- Prevents overlapping adapter status checks.
- Avoids repeatedly logging adapter status errors.
- Prevents multiple simultaneous connection or disconnection attempts.
- Starts listening for serial data after a successful connection.
- Buffers incoming Bluetooth chunks until a complete JSON message is available.
- Supports newline-delimited JSON messages, including messages terminated with LF (`\n`) or CRLF (`\r\n`).
- Also supports complete JSON objects received without a newline when they arrive in a single accumulated buffer.
- Validates received JSON and emits only valid JSON objects. Invalid messages are ignored and logged.
- Supports receiving multiple newline-delimited messages in a single Bluetooth data chunk.
- Clears the receive buffer when it exceeds the maximum allowed length of 10,000 characters.
- Updates the parent component when the Bluetooth connection is lost.
- Avoids displaying a duplicate connection-loss notification when the phone's Bluetooth adapter is switched off.
- Clears the connection state and disconnects the shared Bluetooth Serial service when the component is unmounted.

#### Usage

The component is designed for mobile mode and should be mounted once at a time because it manages a shared Bluetooth Serial connection.

```vue
<BluetoothButton
  :mac-address="smartPack.bluetooth_mac_address"
  v-model:isBluetoothConnected="isBluetoothConnected"
  @message="onBluetoothMessage"
/>
```

The parent component owns the connection state and receives parsed JSON messages through the `message` event. This allows other parts of the dashboard to process SmartPack sensor readings, device status updates, and other supported message types.

#### Communication Format

The ESP32 should send one JSON object per line, using a newline delimiter to identify message boundaries.

Example message:

```json
{
  "type": "sensor_data",
  "data": {
    "weight": 4250,
    "steps": 1250,
    "battery": 87
  }
}
```

The recommended ESP32 transmission approach is:

```cpp
SerialBT.println(json);
```

Using newline-delimited JSON ensures that fragmented or multiple incoming Bluetooth chunks can be correctly buffered and parsed into individual messages.
