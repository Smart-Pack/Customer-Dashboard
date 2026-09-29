# User Management

The User Management section provides a central place for administrators and authorized users to view and manage platform users.

## Overview

The section supports:

* Viewing users
* Filtering users by role and status
* Adding new users (administrators only)
* Viewing individual user details
* Updating user information (administrators only)
* Suspending or activating users (administrators only)

## Navigation

User Management is accessible from the dashboard sidebar through the **User Management** menu item.

The section includes:

* **Users** — the main user management page
* **User Details** — the details view for an individual user

## User Management Workflow

The main page displays the list of users and provides user management actions.

Administrators can switch between the user list and the user creation form using the **Add User** and **Cancel** actions.

Non-administrative users can view the user list but do not have access to the **Add User** action.

The users table provides filtering by:

* All users
* Administrators
* Staff
* Suspended users

Each user has a **View** action for accessing their details.

## User Details

The User Details page displays the selected user's profile and account information.

Administrators can:

* Update the user's information
* Suspend an active user
* Activate a suspended user

The **Suspend/Activate** action is disabled when viewing the currently logged-in user's account to prevent users from suspending or activating their own account.

Non-administrative users can view user details but do not have access to the administrative actions.

## Routes

| Route                          | Purpose                 |
| ------------------------------ | ----------------------- |
| `/dashboard/users`             | User management page    |
| `/dashboard/users/:id/details` | Individual user details |

## Related Areas

* Dashboard sidebar navigation
* User list and filtering
* User creation
* User details
* User account updates
* User suspension and activation

