# My Profile

The My Profile page allows authenticated users to view and manage their personal and contact information, update their account password, and configure notification preferences.

## Purpose

The page provides users with access to their profile details, account security settings, and notification preferences without leaving the dashboard.

The page uses a tabbed interface to switch between profile management, password management, and notification settings.

## Features

### Profile

- View personal information:
  - First name
  - Last name
  - Gender
  - Date of birth
- View contact information:
  - Email address
  - Phone number
- Upload and update a profile picture.
- Enter edit mode to modify editable profile information.
- Validate profile fields before submission.
- Compress profile pictures before uploading to reduce file size.
- Display API validation errors on the corresponding fields.
- Show loading states while retrieving and updating profile information.
- Cancel editing and restore the last saved profile information.

### Password

- Update the authenticated user's password.
- Enter the current password.
- Enter a new password.
- Confirm the new password.
- Validate that the new password and confirmation password match.
- Display API validation errors on the corresponding fields.
- Show a loading state while updating the password.
- Update the authenticated user's password-change state after a successful password update.
- Clear the password form after a successful update.

### Notifications

- View and manage notification preferences for general notifications and SmartPack alerts.
- Choose a preferred delivery channel for general notifications:
  - Email
  - SMS
  - WhatsApp
  - None
- Choose a preferred delivery channel for SmartPack alerts:
  - Email
  - SMS
  - WhatsApp
  - None
- View the phone numbers associated with SMS and WhatsApp notifications.
- Open a dedicated **Manage Contact Numbers** modal to manage SMS and WhatsApp contact numbers.
- Switch between SMS and WhatsApp contact management within the modal, with SMS selected by default.
- Request and verify OTPs to configure phone numbers for SMS and WhatsApp notifications.
- Clear configured SMS or WhatsApp phone numbers where permitted.
- Display validation errors returned by the API.
- Show loading states while retrieving and updating notification preferences or managing contact numbers.
- Reload notification preferences after successful contact number operations.
- Save notification preference changes through the users API.

General notifications include updates about SmartPack assignments and group activities, such as group invitations, membership changes, and role updates.

SmartPack alerts include SOS alerts and other device-related notifications.

## Route

The page is available at:

`/my-profile`

The route requires an authenticated user.

## Components

The page is implemented using:

- `src/views/Users/profile.vue` - Account page view and tab navigation.
- `src/components/Users/ProfileCard.vue` - Displays and manages profile information.
- `src/components/Users/UpdatePasswordForm.vue` - Provides the password update form.
- `src/components/Users/Notifications.vue` - Displays and manages notification preferences and opens the contact number management modal.
- `src/components/Users/NotificationsModal.vue` - Provides tabbed SMS and WhatsApp contact number management.
- `src/components/Users/NotificationsSmsModalBody.vue` - Provides SMS contact number management and verification.
- `src/components/Users/NotificationsWhatsappModalBody.vue` - Provides WhatsApp contact number management and verification.
- `src/components/Base/InputField.vue` - Provides profile and password form inputs.
- `src/components/Base/InfoTooltip.vue` - Displays additional information about notification preferences and delivery options.
- `src/components/Icons/LockClosedIcon.vue` - Indicates that profile fields are in view mode.
- `src/components/Icons/LockOpenIcon.vue` - Indicates that profile fields are editable.
- `src/components/Icons/UserIcon.vue` - Displays the default profile icon when no profile picture is available.

## API Integration

The profile page uses the users API to:

- Retrieve the currently authenticated user's profile.
- Update profile information and the profile picture.
- Update the authenticated user's password.
- Retrieve the authenticated user's notification preferences.
- Update the authenticated user's notification preferences.
- Request SMS verification OTPs.
- Verify SMS OTPs.
- Clear configured SMS phone numbers where permitted.
- Request WhatsApp verification OTPs.
- Verify WhatsApp OTPs.
- Clear configured WhatsApp phone numbers where permitted.

Profile updates are submitted using `FormData` to support image uploads.

Password updates are submitted using the authenticated user's current password and new password.

Notification preferences are retrieved and updated through the notification preferences API. Updates include the preferred channels for general notifications and SmartPack alerts.

Contact number management uses dedicated SMS and WhatsApp API operations. Users can request verification codes, submit OTPs to verify phone numbers, and clear configured numbers where permitted.

## Profile Picture Handling

Selected profile pictures are validated to ensure that:

- The selected file is an image.
- The original file is no larger than 5 MB.

Before upload, the image is compressed and resized when necessary. A temporary object URL is used to preview the selected image.

## Editing

By default, profile information is displayed in a read-only state. Selecting **Edit Profile** enables the editable fields and profile picture upload.

Selecting **Cancel Editing** exits edit mode and restores the last saved profile information.

Selecting **Save Changes** submits the updated information and updates the authenticated user's profile in the application state.

### Email Address

- The email address is displayed as read-only on the My Profile page.
- Users cannot change their email address through profile editing.
- The email address is indicated as locked in the profile form.

## Password Management

The **Update Password** tab provides authenticated users with a dedicated password update form.

Users must provide their current password, a new password, and confirmation of the new password. The password confirmation is validated before the update request is submitted.

Selecting **Update Password** submits the password change request. After a successful update, the authenticated user's password-change state is updated and the form is cleared.

## Notification Management

The **Notifications** tab allows authenticated users to configure how they receive general notifications and SmartPack alerts.

### General Notifications

Users can choose a preferred delivery channel for account and group-related updates, including SmartPack assignments, group invitations, membership changes, and role updates.

Available channels are email, SMS, WhatsApp, and none.

### SmartPack Alerts

Users can independently select a preferred delivery channel for SmartPack-related alerts, including SOS alerts and other device-related notifications.

Available channels are email, SMS, WhatsApp, and none.

### Contact Number Management

The Notifications page displays the configured SMS and WhatsApp phone numbers as read-only fields. Users can select **Manage Contact Numbers** to open a modal for managing these numbers without leaving the notification preferences page.

The modal contains two tabs:

- **SMS** - Manages the phone number used for SMS notifications.
- **WhatsApp** - Manages the phone number used for WhatsApp notifications.

The SMS tab is selected by default. Users can switch between tabs to manage each contact number independently.

### SMS Verification

- Users can enter an SMS phone number and request an OTP.
- Users can submit the OTP to verify the phone number.
- Users can clear the configured SMS phone number where permitted.
- API validation errors are displayed when an operation fails.

### WhatsApp Verification

- Users can enter a WhatsApp phone number and request an OTP.
- Users can submit the OTP to verify the phone number.
- Users can clear the configured WhatsApp phone number where permitted.
- API validation errors are displayed when an operation fails.

### Phone Numbers and Delivery Preferences

- The SMS phone number is used for SMS notifications.
- The WhatsApp phone number is used for WhatsApp notifications.
- SMS and WhatsApp channels require the corresponding phone number to be configured.
- Users manage their phone numbers through the contact number management modal.
- Notification preference changes and contact number management are handled separately.
- After a successful contact number operation, the Notifications page reloads the preferences to reflect the latest saved values.

### Validation and Updates

- Notification channel selections are validated before submission.
- Selecting SMS or WhatsApp without the corresponding phone number displays a validation error.
- API validation errors are displayed on the relevant fields.
- A loading state is displayed while notification preferences are being retrieved or updated.
- Successful updates save the selected notification preferences.
- The contact number modal can be closed using its close button, by clicking the backdrop, or through a close event from the active contact management form.
- Successful contact number operations notify the parent page to reload preferences without automatically closing the modal.
