# SmartPack Management

The SmartPack Management section allows administrators and authorized internal users to view and manage registered SmartPack devices. It provides a paginated list of SmartPacks and a dedicated details page for viewing device information and managing user assignments.

## SmartPack List Page

The SmartPack list page displays all registered SmartPack devices in a table.

### Features

* Paginated SmartPack listing
* Search and filtering support
* Sortable table columns
* SmartPack hardware model
* IMEI
* Firmware version
* Online/offline connection status
* Assigned child/user
* SmartPack creation date
* Navigation to the SmartPack details page

Each SmartPack can be opened from the table to view its complete device details.

## SmartPack Details Page

The SmartPack details page provides detailed information about an individual SmartPack.

### Device Information

The page displays:

* Hardware model
* IMEI
* Firmware version
* Assigned user
* Last seen timestamp
* Date the SmartPack was added
* Current connection status

The connection status indicates whether the SmartPack is currently online or offline.

### User Assignment

Administrators can manage the user assigned to a SmartPack from the details page.

For an unassigned SmartPack, an **Assign User** action opens a user selection interface. The available users are filtered to active customer accounts, and a single user can be selected before assigning the SmartPack.

For an already assigned SmartPack, an **Unassign User** action allows the administrator to remove the current user assignment after confirmation.

After an assignment or unassignment, the SmartPack details are refreshed to display the updated assignment state.

### QR Code

The details page displays a QR code for the SmartPack using its device UID.

The QR code provides a convenient way to identify the SmartPack device without manually entering its device identifier. QR code rendering is handled by the reusable `QrCode` component located at:

`src/components/Smartpacks/QrCode.vue`

## Access Control

SmartPack management actions are permission-aware. Administrative actions such as assigning and unassigning users are available to users with administrator privileges, while other authorized users can view SmartPack information according to their assigned permissions.

