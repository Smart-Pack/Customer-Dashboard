# SweetAlert2 Notifications

The `src/helpers/swalNotifier.ts` module provides centralized notification and confirmation helpers using [SweetAlert2](https://sweetalert2.github.io/).

## Available Helpers

| Helper            | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `notifySuccess()` | Displays a success toast notification.                  |
| `notifyError()`   | Displays an error modal notification.                   |
| `deleteModal()`   | Displays a confirmation dialog for destructive actions. |

## `notifySuccess()`

Displays a success toast in the top-right corner.

```ts
this.$notifySuccess('User created successfully.')
```

The helper uses a 4-second timer and automatically hides the confirmation button.

## `notifyError()`

Displays an error modal with a close button.

```ts
this.$notifyError('Unable to create the user.')
```

The UI store is used to track the SweetAlert2 backdrop state while the modal is displayed.

## `deleteModal()`

Displays a confirmation dialog for actions such as deleting, suspending, or activating records.

```ts
const confirmed = await this.$deleteModal('Delete', 'John Doe')

if (confirmed) {
  // Perform the action
}
```

The helper returns:

* `true` when the user confirms the action.
* `false` when the dialog is cancelled or dismissed.

## Global Registration

The helpers are registered globally in `src/main.ts`:

```ts
app.config.globalProperties.$notifySuccess = notifySuccess
app.config.globalProperties.$notifyError = notifyError
app.config.globalProperties.$deleteModal = deleteModal
```

This allows them to be accessed from Vue components without importing the helpers directly.

## Styling

SweetAlert2's default stylesheet is loaded globally in `src/main.ts`:

```ts
import 'sweetalert2/dist/sweetalert2.min.css'
```

The notification helpers provide application-specific classes for consistent styling with the SmartPack Admin Dashboard.

## Testing

Unit tests are located at:

```text
src/helpers/__tests__/swalNotifier.spec.ts
```

Run the tests with:

```bash
pnpm exec vitest run src/helpers/__tests__/swalNotifier.spec.ts
```

