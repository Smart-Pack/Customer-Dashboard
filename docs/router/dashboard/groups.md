# Groups Page

The Groups page allows users to view and manage groups within SmartPack. It provides an overview of group membership, ownership, and associated SmartPacks, with filtering and navigation to individual group details pages.

## Features

- **Group listing:** Displays groups with their names, total users, total SmartPacks, and creation dates.
- **Filtering:** Organizes groups into tabs for all groups, groups where the current user has owner or administrator access, and groups where the user has the member role.
- **Search and sorting:** Supports searching for groups and sorting the list by supported columns.
- **Group creation:** Provides a form for creating groups with a group name.
- **Group details:** Provides a dedicated page for viewing group information, membership, and associated SmartPacks.
- **Group member management:** Allows authorized users to view group members, distinguish administrators from regular members, and access available management actions.
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

**Users**

The Users view displays the group's members and provides tabs for organizing them:

- **All:** Displays all members of the group.
- **Admins:** Displays members with owner or administrator access.
- **Members:** Displays regular group members.

The member table supports searching and displays relevant user information, including member details, group role, contact information, and creation date.

**SmartPacks**

The SmartPacks view displays devices associated with the group. The table includes relevant device information, such as device details, status, firmware, and child name.

Both views support the appropriate group-specific filtering and table functionality.

### Group Updates

Authorized group administrators can open the group update form to modify the group's information. After a successful update, the page refreshes to display the latest group details.

Users can cancel the update operation without saving changes.

### Group Invitations

Authorized group administrators can open the invitation modal to invite users to join the group. The invitation workflow handles the submission process and refreshes the relevant group information when an invitation is successfully sent.

The backend validates invitation requests and enforces the applicable group membership and permission rules.

### Group Deletion

Group owners can initiate group deletion through the details page. The operation requires confirmation before proceeding.

Upon successful deletion, the user is redirected away from the deleted group's details page. Errors are handled with appropriate feedback, and the page remains available when deletion fails.

## Access and Permissions

Group visibility and management capabilities depend on the user's account type, group membership, and role.

- **Owners:** Have group ownership privileges, including access to group deletion.
- **Administrators:** Can access authorized group management actions, such as updating group information and inviting members.
- **Regular members:** Have more limited access to group management functionality while retaining access to the group information and assets permitted by their role.

The frontend controls the visibility of actions based on the user's permissions. The backend remains responsible for enforcing authorization and validating group operations.

## Error Handling and Refresh Behaviour

The Groups and Group Details pages handle API errors and provide feedback when operations fail. The details page supports reloading group information after updates and successful invitations. When a reload requires navigation away from the current page, the application redirects the user appropriately.

## Related Functionality

The Groups page integrates with the groups API to retrieve group information and create groups. The Group Details page builds on this functionality by integrating group information, asset tables, the update form, and the invitation modal.

Group membership, SmartPack associations, invitations, and group management operations are governed by the backend's API and permission rules.
