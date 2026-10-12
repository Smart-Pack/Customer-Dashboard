# Groups Page

The Groups page allows users to view and manage groups within SmartPack. It provides an overview of group membership, ownership, and associated SmartPacks, with filtering and navigation to individual group details.

## Features

- **Group listing:** Displays groups with their names, total users, total SmartPacks, and creation dates.
- **Filtering:** Organizes groups into tabs for all groups, groups created by the current user, and groups the user belongs to.
- **Search and sorting:** Supports searching for groups and sorting the list by supported columns.
- **Group creation:** Provides a form for creating groups with a group name.
- **Group details:** Allows users to navigate to a group's details page to view and manage its information.
- **Access control:** Group-related actions depend on the user's role and permissions.

## Group Creation

Users can create a group by providing a group name through the group creation form. The form uses the shared creation layout and validates that the group name is provided.

After creation, users can navigate to the group's details page to access its information and related functionality.

## Group Listing

The page organizes groups into three tabs:

- **All:** Displays all groups available to the current user.
- **Managed:** Displays groups where the current user has owner or administrator access.
- **Member:** Displays groups where the current user has the member role.

Each group entry displays its name, total number of users, total number of associated SmartPacks, and creation date. The available actions allow users to open the corresponding group details page.

## Access and Permissions

Group visibility and management capabilities depend on the user's account type, group membership, and role. Group owners and administrators may have additional management permissions, while regular members have more limited access.

The backend remains responsible for enforcing authorization and validating group operations.

## Related Functionality

The Groups page integrates with the groups API to retrieve group information and create groups. Individual group details and group membership management are handled through their respective views and components.
