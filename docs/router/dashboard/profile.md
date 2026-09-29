# My Profile

The My Profile page allows authenticated users to view and manage their personal and contact information, as well as update their account password.

## Purpose

The page provides users with access to their profile details and account security settings without leaving the dashboard.

The page uses a tabbed interface to switch between profile management and password management.

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

## Route

The page is available at:

`/my-profile`

The route requires an authenticated user.

## Components

The page is implemented using:

- `src/views/Users/profile.vue` - Account page view and tab navigation.
- `src/components/Users/ProfileCard.vue` - Displays and manages profile information.
- `src/components/Users/UpdatePasswordForm.vue` - Provides the password update form.
- `src/components/Base/InputField.vue` - Provides profile and password form inputs.
- `src/components/Icons/LockClosedIcon.vue` - Indicates that profile fields are in view mode.
- `src/components/Icons/LockOpenIcon.vue` - Indicates that profile fields are editable.
- `src/components/Icons/UserIcon.vue` - Displays the default profile icon when no profile picture is available.

## API Integration

The profile page uses the users API to:

- Retrieve the currently authenticated user's profile.
- Update profile information and the profile picture.
- Update the authenticated user's password.

Profile updates are submitted using `FormData` to support image uploads.

Password updates are submitted using the authenticated user's current password and new password.

## Profile Picture Handling

Selected profile pictures are validated to ensure that:

- The selected file is an image.
- The original file is no larger than 5 MB.

Before upload, the image is compressed and resized when necessary. A temporary object URL is used to preview the selected image.

## Editing

By default, profile information is displayed in a read-only state. Selecting **Edit Profile** enables the editable fields and profile picture upload.

Selecting **Cancel Editing** exits edit mode and restores the last saved profile information.

Selecting **Save Changes** submits the updated information and updates the authenticated user's profile in the application state.

## Password Management

The **Update Password** tab provides authenticated users with a dedicated password update form.

Users must provide their current password, a new password, and confirmation of the new password. The password confirmation is validated before the update request is submitted.

Selecting **Update Password** submits the password change request. After a successful update, the authenticated user's password-change state is updated and the form is cleared.
