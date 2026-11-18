# SmartPack Management

The SmartPack Management section allows administrators and authorized internal users to view and manage registered SmartPack devices. It provides a paginated list of SmartPacks, a dedicated details page, and functionality for claiming unassigned SmartPacks.

## SmartPack List Page

The SmartPack list page displays all registered SmartPack devices in a table.

### Features

- Paginated SmartPack listing
- Search and filtering support
- Sortable table columns
- SmartPack hardware model
- IMEI
- Firmware version
- Online/offline connection status
- Assigned child/user
- SmartPack creation date
- Navigation to the SmartPack details page
- Claiming an unassigned SmartPack

Each SmartPack can be opened from the table to view its complete device details.

### Claim SmartPack

The **Claim SmartPack** action allows an authorized user to claim an unassigned SmartPack.

The claim interface supports identifying a SmartPack using its QR code. The QR code can either be uploaded as an image or scanned directly using the device camera.

The QR code contains the SmartPack device UID and IMEI, which are used to identify the device and complete the claim.

#### QR Code Upload

Users can upload an image containing a SmartPack QR code. The QR code reader extracts the device UID and IMEI and displays the detected information before the SmartPack is claimed.

#### QR Code Scanning

Users can select **Scan QR Code** to open the camera-based QR scanner.

The scanner:

- Uses the device camera to detect QR codes.
- Uses the environment-facing camera where supported.
- Supports fullscreen mode for easier scanning.
- Displays camera errors when access or scanning fails.
- Automatically exits scanning mode after detecting a valid SmartPack QR code.

After a valid QR code is detected, the device UID and IMEI are displayed, and the user can proceed with the claim.

#### Claim Process

Once a valid SmartPack QR code has been detected, the user can select **Claim SmartPack**.

The claim request uses the detected device UID and IMEI to associate the SmartPack with the user's account.

After a successful claim:

- A success notification is displayed.
- The claim modal closes.
- The SmartPack list is refreshed.
- The newly claimed SmartPack appears with its updated assignment state.

Invalid or unsuccessful claim requests display an appropriate error message without closing the claim interface.

## SmartPack Details Page

The SmartPack details page provides detailed information about an individual SmartPack, its assignment status, and its sensor measurements.

### Device Information

The page displays:

- Hardware model
- IMEI
- Firmware version
- Assigned child
- Assigned group, where applicable
- Last seen timestamp
- Date the SmartPack was added
- Current connection status

The connection status indicates whether the SmartPack is currently online or offline.

### Child Assignment

Users can assign a SmartPack to a child from the details page.

The **Assign to Child** action opens the child assignment form, where the child name can be entered and saved. The existing child name is displayed when a SmartPack has already been assigned to a child.

After a child assignment is completed, the SmartPack details are refreshed to display the updated child information.

### User Assignment

Administrators can manage the user assigned to a SmartPack from the details page.

For an unassigned SmartPack, an **Assign User** action opens a user selection interface. The available users are filtered to active customer accounts, and a single user can be selected before assigning the SmartPack.

For an already assigned SmartPack, an **Unassign User** action allows the administrator to remove the current user assignment after confirmation.

After an assignment or unassignment, the SmartPack details are refreshed to display the updated assignment state.

### Group Assignment

Authorized users can manage a SmartPack's group assignment according to their permissions.

The details page supports assigning an ungrouped SmartPack to a group and unassigning a SmartPack from its current group where permitted. Group assignment actions respect group membership roles and permissions.

When a SmartPack belongs to a group, the assigned group name is displayed on the details page and links to the corresponding group details page.

After a group assignment or unassignment, the SmartPack details are refreshed to reflect the updated group information.

### QR Code

The details page provides a **Print QR** action for displaying the SmartPack's QR code.

The QR code identifies the device using its device UID and is rendered through the reusable `QrCode` component located at:

`src/components/Smartpacks/QrCode.vue`

The QR code can be used by the **Claim SmartPack** workflow to identify the device without manually entering its identifier.

### Sensor Measurements

The SmartPack details page includes a dedicated sensor measurements section that displays historical measurements and updates with incoming sensor data.

The section is rendered when the SmartPack details are available and the device has a valid ID and device UID.

Sensor readings can be obtained from three sources:

- **REST API:** Retrieves previously recorded sensor measurements.
- **MQTT:** Receives real-time sensor measurement events from the configured MQTT broker.
- **Bluetooth:** Receives live sensor readings directly from a connected SmartPack over Bluetooth Classic.

The component combines these sources into a unified measurement history.

#### Measurement History

The component retrieves sensor measurements from the backend API and displays the available records.

Features include:

- Paginated sensor measurement history.
- Loading indicators while measurements are being retrieved.
- An empty state when no measurements are available.
- Error messages and a retry option when a request fails.
- Formatted measurement values and timestamps.
- Summary cards and charts when measurement data is available.
- Integration of Bluetooth readings with server-provided measurements.

The measurement history supports pagination, allowing users to navigate between pages of recorded measurements.

#### Measurement Charts

Sensor measurements are visualized using ApexCharts through the Vue 3 ApexCharts integration.

The charts provide a graphical representation of the available measurement data, making it easier to examine recorded values and observe changes over time.

The charts are updated when new valid sensor measurements are received, including readings received through Bluetooth and MQTT.

#### Real-Time MQTT Updates

The component connects to the configured MQTT broker and subscribes to the topic associated with the selected SmartPack:

`smartpacks/{device_uid}`

Incoming MQTT messages are processed to identify sensor measurement events and update the displayed measurements and charts without requiring a full page reload.

The component handles MQTT connection status, reconnection events, subscription failures, and configuration errors.

To maintain data integrity, it ignores duplicate measurements based on timestamp keys, malformed payloads, unrelated event types, measurements belonging to another SmartPack, and messages received on unrelated topics.

Incoming measurements update the total measurement count even when the user is viewing a later pagination page. New readings are added to the currently displayed collection only when viewing the first page.

When the selected SmartPack changes, the component retrieves measurements for the new device and updates its MQTT subscription accordingly. MQTT listeners and connections are cleaned up when the component is no longer in use.

#### Bluetooth Sensor Integration

The SmartPack details page provides Bluetooth Classic connectivity for receiving sensor readings directly from a SmartPack using the Android application.

Bluetooth functionality is available in the Capacitor Android build and is implemented through the reusable `BluetoothButton` component:

`src/components/Smartpacks/BluetoothButton.vue`

The component communicates with the SmartPack ESP32 using Bluetooth Serial Port Profile (SPP).

##### Bluetooth Connection

Users can initiate a Bluetooth connection using the SmartPack's configured Bluetooth MAC address.

The Bluetooth interface supports:

- Checking whether Bluetooth is enabled on the Android device.
- Requesting Bluetooth activation when it is disabled.
- Connecting to the SmartPack using its Bluetooth MAC address.
- Displaying the current Bluetooth connection status.
- Detecting connection errors and disconnections.
- Monitoring incoming Bluetooth serial data.
- Stopping Bluetooth reading and cleaning up connection resources when appropriate.

The Bluetooth connection status is passed to the sensor measurements component so the interface can reflect the current connection state.

##### Bluetooth Data Format

The SmartPack sends newline-delimited JSON messages over Bluetooth Serial.

Sensor messages follow a common structure using a `type` field to identify the event and a `data` field to contain its associated information.

For example:

```json
{
  "type": "sensors",
  "data": {
    "weight": 4250,
    "steps": 1250
  }
}
```

The Bluetooth component processes incoming serial data, handles message boundaries, and parses complete JSON messages before emitting them to the parent component.

The details page validates incoming messages before accepting sensor readings. Invalid payloads and unsupported message types are ignored.

##### Bluetooth Sensor History

Valid Bluetooth sensor readings are converted into sensor records containing:

- Weight in grams.
- Cumulative step count.
- Timestamp representing when the reading was received.

The details page maintains a local Bluetooth sensor history with a maximum capacity of 1,000 records. When the limit is exceeded, the oldest records are removed.

This history is passed to the `SensorMeasurements` component through the `sensorHistory` prop.

##### Combining Bluetooth, REST and MQTT Measurements

The `SensorMeasurements` component combines Bluetooth readings with measurements retrieved from the backend and incoming MQTT events.

Measurements are normalized into a common structure containing:

- Measurement ID.
- Weight.
- Cumulative steps.
- Timestamp.
- Measurement source (`server` or `bluetooth`).

The component:

- Adds valid Bluetooth readings to the unified measurement collection.
- Retains the origin of each measurement.
- Uses timestamp-based keys to prevent duplicate readings.
- Sorts measurements by timestamp, with the newest readings appearing first.
- Limits the in-memory measurement collection to 1,000 records.
- Includes Bluetooth readings in the displayed total measurement count.
- Identifies Bluetooth-originated readings in the measurements table.
- Updates the summary cards and charts using the combined measurement history.

Bluetooth readings are merged into the displayed collection when the first pagination page is active. Existing REST pagination and MQTT functionality are preserved.

The Bluetooth integration allows sensor measurements to be displayed even when readings are received directly from the SmartPack rather than through the backend.

#### Sensor Measurements Implementation

The main sensor measurements component is located at:

`src/components/Smartpacks/SensorMeasurements.vue`

The Bluetooth connection component is located at:

`src/components/Smartpacks/BluetoothButton.vue`

The Bluetooth message and sensor record interfaces are defined in:

`src/types/bluetooth.ts`

### Testing Bluetooth Connectivity and Sensor Data

Bluetooth functionality can be tested using two Android phones without requiring a physical ESP32 SmartPack. One phone acts as a mock SmartPack (Bluetooth server), while the other runs the SmartPack Customer Dashboard (Bluetooth client).

The mock device uses the **[Bluetooth Classic – Google Play](https://play.google.com/store/apps/details?id=com.psp.bluetoothclassic&utm_source=chatgpt.com)** application, which supports Bluetooth Serial Port Profile (SPP), accepting incoming connections, and sending and receiving data.

#### Requirements

- Two Android phones with Bluetooth Classic support.
- SmartPack Customer Dashboard installed on the user phone.
- Bluetooth Classic application installed on the mock SmartPack phone.
- Both phones with Bluetooth enabled.

#### 1. Pair the Two Phones

Before establishing a Bluetooth serial connection, pair the two phones.

1. Enable Bluetooth on both phones.
2. Open Bluetooth settings on either phone.
3. Scan for available Bluetooth devices.
4. Select the other phone from the discovered devices.
5. Accept the pairing request on both phones if prompted.
6. Confirm that both devices appear in their respective paired devices lists.

Pairing establishes the Bluetooth relationship required before connecting through the SPP application.

#### 2. Configure the Mock SmartPack MAC Address

The SmartPack Customer Dashboard identifies the SmartPack Bluetooth device using its configured Bluetooth MAC address.

On the mock SmartPack phone:

1. Open the Bluetooth Classic application.
2. Locate the mock phone's Bluetooth MAC address from its Bluetooth device information or paired-device information.
3. Copy the MAC address.

In the backend, update the SmartPack's `bluetooth_mac_address` field with the mock phone's Bluetooth MAC address.

Ensure the MAC address corresponds to the mock phone rather than the user phone.

#### 3. Configure the Mock SmartPack Phone

On the phone acting as the mock SmartPack:

1. Open the Bluetooth Classic application.
2. Select **Accept Device** to configure the phone to accept incoming Bluetooth connections.
3. Select **Connect Socket** to open the Bluetooth server socket and listen for incoming connections.
4. Keep the application open while testing.

The mock phone is now acting as the Bluetooth SPP server, waiting for the SmartPack Customer Dashboard to connect.

#### 4. Connect from the SmartPack Customer Dashboard

On the user phone:

1. Open the SmartPack Customer Dashboard Android application.
2. Navigate to the details page of the SmartPack configured with the mock phone's Bluetooth MAC address.
3. Locate the Bluetooth connection button.
4. Select **Connect** to initiate the Bluetooth connection.
5. Wait for the connection to complete.
6. Verify that the Bluetooth interface indicates a successful connection.

Once connected, the mock SmartPack phone should indicate that an incoming Bluetooth connection has been established.

#### 5. Send Mock Sensor Measurements

With the Bluetooth connection established, use the Bluetooth Classic application on the mock SmartPack phone to send sensor messages to the user phone.

The application supports sending text data to the connected Bluetooth device.

Send the following JSON sensor payload:

```json
{
  "type": "sensors",
  "data": {
    "weight": 4250,
    "steps": 1250
  }
}
```

Send the JSON as a complete message, terminated with a newline (`\n`), because the SmartPack Bluetooth receiver uses newline-delimited JSON to identify complete messages.

The Bluetooth Classic application sends the payload through its established SPP connection to the SmartPack Customer Dashboard.

#### 6. Verify Sensor Measurements

On the user phone, navigate to the SmartPack details page and verify that:

- The Bluetooth connection status remains connected.
- The incoming JSON message is successfully received and parsed.
- The sensor payload passes validation.
- The weight reading is displayed as **4,250 g**.
- The cumulative step count is displayed as **1,250**.
- The new reading appears in the sensor measurement history.
- The measurement is identified as originating from Bluetooth.
- The summary cards and charts reflect the incoming measurement.

Send additional sensor payloads with different values to verify that new readings are appended to the history.

#### 7. Test Disconnection

To verify Bluetooth disconnection handling:

1. Disconnect the Bluetooth connection from either phone or disable Bluetooth on one of the phones.
2. Observe the SmartPack Customer Dashboard.
3. Verify that the Bluetooth connection status changes to disconnected.
4. Re-enable Bluetooth if necessary.
5. Reconnect using the Bluetooth connection button.
6. Send another sensor payload and verify that readings are received successfully.

#### Expected Communication Flow

```text
Mock SmartPack Phone
(Bluetooth Classic Application)
          |
          |  Bluetooth SPP
          |  JSON Sensor Payload
          |
          v
User Phone
(SmartPack Customer Dashboard)
          |
          v
BluetoothButton.vue
          |
          |  Parsed JSON Message
          v
SmartPack Details Page
          |
          |  Validate Sensor Payload
          v
SensorMeasurements.vue
          |
          v
Unified Sensor Measurement History
          |
          +------> Summary Cards
          |
          +------> Measurement Charts
          |
          +------> Recent Measurements Table
```

**Note:** This testing approach simulates the ESP32 SmartPack's Bluetooth communication using another Android phone. It tests the Android application's Bluetooth connection, incoming serial data processing, message parsing, and sensor measurement integration without requiring the actual SmartPack hardware.

## Access Control

SmartPack management actions are permission-aware.

Administrative actions, such as assigning and unassigning users, are available to users with administrator privileges. Authorized users can view SmartPack information, claim eligible SmartPacks, assign a SmartPack to a child, and manage group assignments according to their permissions.

Sensor measurements are displayed within the SmartPack details page and are associated with the selected device. Access to measurement data depends on the permissions enforced by the application and its backend APIs.

Bluetooth connectivity is available in the native Android application and depends on the device's Bluetooth capabilities and required permissions.
