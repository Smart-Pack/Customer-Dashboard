# SmartPack Management

The SmartPack Management section allows administrators and authorized internal users to view and manage registered SmartPack devices. It provides a paginated list of SmartPacks, a dedicated details page, and functionality for claiming unassigned SmartPacks.

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
* Claiming an unassigned SmartPack

Each SmartPack can be opened from the table to view its complete device details.

### Claim SmartPack

The **Claim SmartPack** action allows an authorized user to claim an unassigned SmartPack.

The claim interface supports identifying a SmartPack using its QR code. The QR code can either be uploaded as an image or scanned directly using the device camera.

The QR code contains the SmartPack device UID and IMEI, which are used to identify the device and complete the claim.

#### QR Code Upload

Users can upload an image containing a SmartPack QR code. The QR code reader extracts the device UID and IMEI and displays the detected information before the SmartPack is claimed.

#### QR Code Scanning

Users can also select **Scan QR Code** to open the camera-based QR scanner.

The scanner:

* Uses the device camera to detect QR codes
* Uses the environment-facing camera where supported
* Supports fullscreen mode for easier scanning
* Displays camera errors when access or scanning fails
* Automatically exits scanning mode after detecting a valid SmartPack QR code

After a valid QR code is detected, the device UID and IMEI are displayed and the user can proceed with the claim.

#### Claim Process

Once a valid SmartPack QR code has been detected, the user can select **Claim SmartPack**.

The claim request uses the detected device UID and IMEI to associate the SmartPack with the user's account.

After a successful claim:

* A success notification is displayed
* The claim modal closes
* The SmartPack list is refreshed
* The newly claimed SmartPack appears with its updated assignment state

Invalid or unsuccessful claim requests display an appropriate error message without closing the claim interface.

## SmartPack Details Page

The SmartPack details page provides detailed information about an individual SmartPack.

### Device Information

The page displays:

* Hardware model
* IMEI
* Firmware version
* Assigned child
* Last seen timestamp
* Date the SmartPack was added
* Current connection status

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

### QR Code

The details page displays a QR code for the SmartPack using its device UID.

The QR code provides a convenient way to identify the SmartPack device without manually entering its device identifier. QR code rendering is handled by the reusable `QrCode` component located at:

`src/components/Smartpacks/QrCode.vue`

The generated QR code can be used by the **Claim SmartPack** workflow to identify the device.

## Access Control

SmartPack management actions are permission-aware. Administrative actions such as assigning and unassigning users are available to users with administrator privileges, while authorized users can view SmartPack information, claim eligible SmartPacks, and assign a SmartPack to a child according to their assigned permissions.
