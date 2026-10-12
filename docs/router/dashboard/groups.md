# Groups Page

The Groups page allows users to view and manage groups within SmartPack. It provides an overview of group membership, ownership, and associated SmartPacks, with filtering and navigation to individual group details pages.

## Features

- **Group listing:** Displays groups with their names, total users, total SmartPacks, and creation dates.
- **Filtering:** Organizes groups into tabs for all groups, groups where the current user has owner or administrator access, and groups where the user has the member role.
- **Search and sorting:** Supports searching for groups and sorting the list by supported columns.
- **Group creation:** Provides a form for creating groups with a group name.
- **Group details:** Provides a dedicated page for viewing group information, membership, and associated SmartPacks.
- **Group member management:** Allows authorized users to view group members, distinguish administrators from regular members, update member roles, and remove members where permitted.
- **SmartPack management:** Displays SmartPacks associated with a group.
- **Group updates:** Allows authorized users to update group information.
- **Group invitations:** Allows authorized group administrators to invite users to join a group.
- **Group deletion:** Allows group owners to delete groups, subject to backend authorization.
- **Access control:** Group-related actions depend on the user's role and permissions.

## Group Creation

Users can create a group by providing a group name through the group creation form. The form uses the shared creation layout and validates that the group name is provided.

After successful creation, users can navigate to the group's details page to access its information and related functionality.

## Group Listing

The page organizes groups into three tabs:

- **All:** Displays all groups available to the current user.
- **Managed:** Displays groups where the current user has owner or administrator access.
- **Member:** Displays groups where the current user has the member role.

Each group entry displays its name, total number of users, total number of associated SmartPacks, and creation date. Users can open a group's details page to view additional information and access available actions.

The listing supports searching and sorting to help users find and organize groups.

## Group Details Page

The Group Details page provides an overview of an individual group and its associated resources. It displays the group name, owner, creation date, total number of users, and total number of associated SmartPacks.

### Group Information

The page displays key group information, including:

- **Group name:** The name assigned to the group.
- **Owner:** The user who owns the group.
- **Created date:** When the group was created.
- **Members:** The total number of users associated with the group.
- **SmartPacks:** The total number of SmartPacks associated with the group.

Fallback values are displayed when certain information is unavailable.

### Group Assets

The Group Details page includes an assets section with two views: **Users** and **SmartPacks**.

#### Users

The Users view displays the group's members and provides tabs for organizing them:

- **All:** Displays all members of the group.
- **Admins:** Displays members with owner or administrator access.
- **Members:** Displays regular group members.

The member table supports searching and displays relevant user information, including member details, group role, contact information, and creation date.

Authorized users can access member management actions directly from the table:

- **Change Role:** Opens a modal for changing a member's role between administrator and regular member, subject to the applicable permissions.
- **Delete:** Opens a confirmation dialog before removing a member from the group.

The current user's own membership and the group owner's membership are protected from these actions in the interface. Successful role updates and member removals trigger a refresh of the member data. Errors are reported through notifications, and cancelled removal confirmations do not modify membership.

#### SmartPacks

The SmartPacks view displays devices associated with the group. The table includes relevant device information, such as device details, status, firmware, and child name.

Both views support the appropriate group-specific filtering and table functionality.

### Group Updates

Authorized group administrators can open the group update form to modify the group's information. After a successful update, the page refreshes to display the latest group details.

Users can cancel the update operation without saving changes.

### Group Invitations

Group invitations allow authorized group administrators to invite users to join a group. The invitation workflow supports sending invitations, verifying invitation tokens, and accepting invitations through the Groups page.

#### Sending Invitations

Authorized group administrators can open the invitation modal to invite users to join their group.

The invitation workflow includes the following behaviour:

- **Invitation creation:** Administrators provide the email address and role for the invited user.
- **Validation:** The backend validates invitation requests, checks group permissions, rejects internal accounts where applicable, and prevents invitations to existing members or duplicate active invitations.
- **Invitation delivery:** The system sends an invitation email containing a link to join the group.
- **Expiration:** Invitations expire after the configured validity period.
- **Refresh:** Group information is refreshed after an invitation is successfully sent.
- **Error handling:** Failed requests are reported through notifications, and invitation delivery failures are handled appropriately.

The backend enforces the applicable group membership, invitation, and authorization rules.

#### Joining a Group

Users can join a group by opening the invitation link received through email. The link contains an invitation token that the frontend uses to verify and accept the invitation.

The joining workflow operates as follows:

1. **Open invitation link:** The user opens the invitation link, which directs them to the Groups page with the invitation token in the URL query parameters.
2. **Verify invitation:** When the Groups page mounts, the frontend checks for the token and sends it to the backend for verification.
3. **Validate invitation:** The backend validates the token and returns the invitation details, including the group information and expiration status.
4. **Check expiration:** If the invitation has expired, the frontend displays an error notification and stops the joining process.
5. **Confirm joining:** For a valid invitation, the frontend displays a confirmation dialog containing the group name and asks whether the user wants to join.
6. **Accept invitation:** If the user confirms, the frontend submits the token to the backend to accept the invitation.
7. **Display success:** After successful acceptance, the frontend displays a success notification.
8. **Navigate to group details:** The user is redirected to the joined group's details page.

#### Invitation Error Handling

The invitation workflow handles the following scenarios:

- **Missing or invalid URL token:** Invitation verification is skipped when the token is missing, empty, or not a single string value.
- **Invalid invitation:** If verification fails, an error notification is displayed.
- **Expired invitation:** The user is notified that the invitation has expired and cannot proceed through the joining workflow.
- **Cancelled confirmation:** If the user declines the confirmation dialog, the invitation is not accepted and no membership changes are made.
- **Acceptance failure:** If accepting the invitation fails, an error notification is displayed and navigation to the group details page does not occur.
- **Successful acceptance:** The user receives a success notification and is redirected to the group details page.

The backend remains responsible for validating invitation tokens, checking expiration, enforcing permissions, and applying membership changes. Frontend confirmation and notifications provide user feedback but do not replace backend authorization.

### Group Deletion

Group owners can initiate group deletion through the details page. The operation requires confirmation before proceeding.

Upon successful deletion, the user is redirected away from the deleted group's details page. Errors are handled with appropriate feedback, and the page remains available when deletion fails.

## Access and Permissions

Group visibility and management capabilities depend on the user's account type, group membership, and role.

- **Owners:** Have group ownership privileges, including access to group deletion.
- **Administrators:** Can access authorized group management actions, such as updating group information, inviting members, and managing eligible member roles.
- **Regular members:** Have more limited access to group management functionality while retaining access to the group information and assets permitted by their role.

The frontend controls the visibility of actions based on the user's permissions. The backend remains responsible for enforcing authorization and validating group operations.

## Error Handling and Refresh Behaviour

The Groups and Group Details pages handle API errors and provide feedback when operations fail.

The details page supports reloading group information after updates and successful invitations. The Users view refreshes its member data after successful role changes and member removals. Cancelled operations do not trigger unnecessary API mutations.

When a reload requires navigation away from the current page, the application redirects the user appropriately.

## Related Functionality

The Groups page integrates with the groups API to retrieve group information and create groups. The Group Details page builds on this functionality by integrating group information, asset tables, member management actions, the update form, and the invitation modal.

Group membership, SmartPack associations, invitations, and group management operations are governed by the backend's API and permission rules.
