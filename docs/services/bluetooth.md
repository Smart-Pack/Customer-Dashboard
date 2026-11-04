# Bluetooth Serial Service

## Overview

The Bluetooth Serial Service provides Bluetooth Classic communication between the SmartPack Android application and ESP32-based SmartPack devices.

It uses the `bluetooth-serial` Capacitor plugin to establish Serial Port Profile (SPP) connections, receive sensor data, and transmit commands between the Android application and the SmartPack device.

The service encapsulates Bluetooth connection management, connection monitoring, serial data transmission, and disconnection handling behind a reusable service instance.

**Platform support:** Native Android only.

## Key Responsibilities

The service is responsible for:

- Detecting whether Bluetooth Serial communication is supported on the current platform.
- Validating Bluetooth MAC addresses before connecting.
- Checking Bluetooth adapter availability and requesting activation when disabled.
- Establishing and maintaining connections with SmartPack devices.
- Monitoring connection health and detecting unexpected disconnections.
- Receiving incoming serial data from connected devices.
- Sending data to connected devices.
- Managing connection state and notifying application components of changes.
- Cleaning up active connections and background operations.

## Architecture

The Bluetooth Serial Service acts as an abstraction between the application and the native Bluetooth Serial plugin.

```text
Vue Components
      |
      v
Bluetooth Serial Service
      |
      v
Capacitor Bluetooth Serial Plugin
      |
      v
Android Bluetooth Stack
      |
      v
ESP32 SmartPack Device
```

Vue components interact with the shared service instance rather than communicating directly with the native plugin.

This keeps Bluetooth-specific functionality centralized and makes the service easier to maintain and test.

## Connection Management

Connections are established using the Bluetooth MAC address associated with a SmartPack device.

Before establishing a connection, the service:

1. Checks whether the current platform supports native Bluetooth Serial communication.
2. Validates the supplied MAC address.
3. Closes any existing connection.
4. Checks whether the phone's Bluetooth adapter is enabled.
5. Requests Bluetooth activation if necessary.
6. Establishes a connection with the target device.

The service maintains an internal connection state that application components can use to determine whether communication is available.

## Connection Monitoring

The service periodically checks the Bluetooth adapter and connection status to detect unexpected connection loss.

It distinguishes between two connection-loss scenarios:

| Reason | Description |
|---|---|
| `bluetooth-off` | The phone's Bluetooth adapter has been switched off. |
| `link-lost` | The connection to the SmartPack device has been interrupted. |

When an unexpected disconnection occurs, the service:

- Updates its internal connection state.
- Stops active reading operations.
- Stops connection health monitoring.
- Attempts to release the native Bluetooth connection.
- Notifies registered callbacks.

Periodic health checks also prevent the application from relying solely on connection state captured when the device was initially connected.

## Serial Data Communication

### Receiving Data

The service continuously polls the Bluetooth connection for available incoming serial data.

Received data is exposed through the `onData` callback.

The ESP32 firmware can transmit sensor information as plain-text key-value pairs.

Example:

```text
weight=4250 steps=1250 battery=87
```

The service forwards received data to the application. Parsing, validation, and updating application state are handled by the appropriate application layer.

Empty data is ignored.

### Sending Data

The service supports transmitting string-based data to the connected SmartPack device.

Outgoing messages are terminated with a newline character to support line-oriented serial communication.

Writing requires an active Bluetooth connection. Transmission errors are propagated to the caller and handled as potential connection failures.

## Callbacks

The service exposes callbacks for communicating connection and data events to application components.

| Callback | Purpose |
|---|---|
| `onData` | Receives incoming serial data. |
| `onError` | Reports errors encountered during serial reading. |
| `onDisconnect` | Notifies the application when an unexpected disconnection occurs. |
| `onConnectionChange` | Reports connection state changes and the associated loss reason. |

These callbacks allow Vue components to respond to Bluetooth events without depending directly on the native plugin.

## Disconnection and Cleanup

The service supports intentional disconnection when the user disconnects a SmartPack device or when the application needs to terminate an existing connection.

During cleanup, it:

- Stops the serial reading loop.
- Stops periodic connection health checks.
- Waits for pending reading operations to finish.
- Closes the native Bluetooth connection.
- Resets internal connection state.
- Clears registered callbacks.

Intentional disconnections are distinguished from unexpected connection loss to prevent unnecessary disconnection notifications.

## Platform Considerations

The service is designed for native Android applications running through Capacitor.

Bluetooth Serial communication is not supported in standard web browsers through this service.

Android Bluetooth permissions and adapter availability must be handled appropriately by the native application and operating system.

If a SmartPack device is not already paired, the Android Bluetooth pairing process may need to be completed before establishing an SPP connection, depending on the device and Android configuration.

The service does not manage ESP32 firmware configuration, Bluetooth pairing credentials, or device-side sensor processing.

## Testing

The service is covered by Vitest unit tests using mocked Capacitor and Bluetooth Serial plugin APIs.

Tests cover:

- Platform support detection.
- MAC address validation.
- Bluetooth adapter activation.
- Connection establishment and failures.
- Reconnection and connection cleanup.
- Connection health monitoring.
- Unexpected disconnection handling.
- Incoming and outgoing serial data.
- Callback execution.
- Intentional disconnection and state cleanup.

The tests do not require a physical Android device or ESP32 hardware.

## Related Components

- **Bluetooth Serial Service:** `src/services/bluetoothSerial.ts`
- **Unit Tests:** `src/services/__tests__/bluetoothSerial.spec.ts`
- **Native Plugin:** `bluetooth-serial`
- **Device Firmware:** ESP32 Bluetooth Classic SPP implementation
