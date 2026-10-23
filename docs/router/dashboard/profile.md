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
- Require a corresponding phone number when SMS or WhatsApp is selected as the preferred notification channel.
- Display validation errors when a required phone number is missing.
- Direct users to the relevant phone verification settings to update their SMS or WhatsApp phone numbers.
- Save notification preference changes through the users API.
- Display API validation errors on the corresponding fields.
- Show loading states while retrieving and updating notification preferences.

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
- `src/components/Users/Notifications.vue` - Displays and manages notification preferences.
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

Profile updates are submitted using `FormData` to support image uploads.

Password updates are submitted using the authenticated user's current password and new password.

Notification preferences are retrieved and updated through the notification preferences API. Updates include the preferred channels for general notifications and SmartPack alerts.

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

### Phone Numbers

SMS and WhatsApp notifications require the corresponding phone number to be available.

- The SMS phone number is used for SMS notifications.
- The WhatsApp phone number is used for WhatsApp notifications.
- When SMS or WhatsApp is selected, the corresponding phone number is required by the notification preference form.
- Users are directed to the relevant phone verification settings to change their phone numbers.

### Validation and Updates

- Notification channel selections are validated before submission.
- Selecting SMS or WhatsApp without the corresponding phone number displays a validation error.
- API validation errors are displayed on the relevant fields.
- A loading state is displayed while notification preferences are being updated.
- Successful updates save the selected notification preferences.
