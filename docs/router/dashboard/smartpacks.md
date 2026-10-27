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

#### Measurement History

The component retrieves sensor measurements from the backend API and displays the available records.

Features include:

- Paginated sensor measurement history.
- Loading indicators while measurements are being retrieved.
- An empty state when no measurements are available.
- Error messages and a retry option when a request fails.
- Formatted measurement values and timestamps.
- Summary cards and charts when measurement data is available.

The measurement history supports pagination, allowing users to navigate between pages of recorded measurements.

#### Measurement Charts

Sensor measurements are visualized using ApexCharts through the Vue 3 ApexCharts integration.

The charts provide a graphical representation of the available measurement data, making it easier to examine recorded values and observe changes over time.

The charts are updated when new valid sensor measurements are received.

#### Real-Time MQTT Updates

The component connects to the configured MQTT broker and subscribes to the topic associated with the selected SmartPack:

`smartpacks/{device_uid}`

Incoming MQTT messages are processed to identify sensor measurement events and update the displayed measurements and charts without requiring a full page reload.

The component handles MQTT connection status, reconnection events, subscription failures, and configuration errors.

To maintain data integrity, it ignores duplicate measurement IDs, malformed payloads, unrelated event types, measurements belonging to another SmartPack, and messages received on unrelated topics.

When the selected SmartPack changes, the component retrieves measurements for the new device and updates its MQTT subscription accordingly. MQTT listeners and connections are cleaned up when the component is no longer in use.

The implementation is located at:

`src/components/Smartpacks/SensorMeasurements.vue`

## Access Control

SmartPack management actions are permission-aware.

Administrative actions, such as assigning and unassigning users, are available to users with administrator privileges. Authorized users can view SmartPack information, claim eligible SmartPacks, assign a SmartPack to a child, and manage group assignments according to their permissions.

Sensor measurements are displayed within the SmartPack details page and are associated with the selected device. Access to measurement data depends on the permissions enforced by the application and its backend APIs.
