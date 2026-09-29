# CreationFormLayout

A reusable form layout component for creating and updating resources. It renders form fields from grouped section configuration, integrates with VeeValidate for validation, submits data through a provided API helper, and supports optional routing, notifications, modal actions, contextual parameters, and field watchers.

## Features

* Group form fields into configurable sections.
* Render fields dynamically using `InputField`.
* Support hidden fields.
* Display field descriptions through optional info tooltips.
* Support VeeValidate form validation.
* Handle create and update forms through `initialValues`.
* Submit form data through a typed `adder` function.
* Merge additional contextual parameters into the submission payload.
* Display success and error notifications.
* Apply API field-level validation errors to the corresponding form fields.
* Navigate to a details page after successful submission.
* Emit a close event when no details page is configured.
* Support optional secondary modal/popup buttons.
* Watch individual form fields and emit custom events when their values change.
* Disable submission controls while the request is in progress.
* Automatically generate initial form values for configured fields.

---

## Basic Usage

```vue
<CreationFormLayout
  page-description="Create a new customer account."
  page-heading="Customer Details"
  name="Customer"
  :sections="sections"
  :adder="createCustomer"
  details-page="CustomerDetails"
/>
```

Example configuration:

```ts
const sections = [
  {
    title: 'Personal Information',
    fields: [
      {
        name: 'first_name',
        label: 'First Name',
        placeholder: 'Enter first name',
        rules: 'required',
      },
      {
        name: 'last_name',
        label: 'Last Name',
        placeholder: 'Enter last name',
        rules: 'required',
      },
    ],
  },
  {
    title: 'Account Information',
    fields: [
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        rules: 'required|email',
      },
    ],
  },
]
```

---

## Props

### `pageDescription`

| Property | Value    |
| -------- | -------- |
| Type     | `string` |
| Required | Yes      |

Description displayed above the form heading.

---

### `pageHeading`

| Property | Value    |
| -------- | -------- |
| Type     | `string` |
| Required | Yes      |

Main heading displayed above the form.

---

### `sections`

| Property | Value             |
| -------- | ----------------- |
| Type     | `SectionConfig[]` |
| Required | Yes               |

Defines the sections and fields rendered by the form.

Each section contains:

```ts
interface SectionConfig {
  title: string
  fields: FieldConfig[]
}
```

---

### `name`

| Property | Value    |
| -------- | -------- |
| Type     | `string` |
| Required | Yes      |

Human-readable resource name used when the form is submitting.

For example, if `name` is `"User"`, the submit button displays:

```text
Updating User...
```

while an update is in progress.

---

### `detailsPage`

| Property | Value            |
| -------- | ---------------- |
| Type     | `string \| null` |
| Required | No               |
| Default  | `null`           |

Named route to navigate to after a successful submission.

The created resource ID is passed as the route parameter:

```ts
{
  name: props.detailsPage,
  params: {
    id: result.data.id,
  },
}
```

If `detailsPage` is not provided, the component emits:

```ts
close
```

with:

```text
showDetails
```

as its payload.

---

### `adder`

| Property | Value   |
| -------- | ------- |
| Type     | `Adder` |
| Required | Yes     |

Function responsible for submitting the form data to the API.

```ts
export type Adder = (
  payload: Record<string, unknown>
) => Promise<AdderResult>
```

The function must resolve with:

```ts
export interface AdderResult {
  data: {
    id: string | number
    [key: string]: unknown
  }
  message: string
}
```

Example:

```ts
const createCustomer: Adder = async (payload) => {
  const response = await api.createCustomer(payload)

  return {
    data: response.data,
    message: 'Customer created successfully.',
  }
}
```

---

### `initialValues`

| Property | Value              |
| -------- | ------------------ |
| Type     | `FormItem \| null` |
| Required | No                 |
| Default  | `null`             |

Initial values for the form fields.

This is useful for update forms.

```ts
const initialValues = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
}
```

When `initialValues` is provided, the component treats the form as an update form and changes its submission state accordingly.

---

### `extraParams`

| Property | Value                     |
| -------- | ------------------------- |
| Type     | `Record<string, unknown>` |
| Required | No                        |
| Default  | `{}`                      |

Additional values merged into the form payload before calling `adder`.

```ts
extraParams = {
  partner_id: 123,
}
```

The submitted payload becomes conceptually:

```ts
{
  ...formValues,
  partner_id: 123,
}
```

This is useful for contextual values that should not be represented as visible form fields.

---

### `watcher`

| Property | Value                     |
| -------- | ------------------------- |
| Type     | `WatcherConfig[] \| null` |
| Required | No                        |
| Default  | `null`                    |

Defines fields whose changes should emit custom events.

```ts
interface WatcherConfig {
  key: string
  name: string
}
```

Example:

```ts
watcher: [
  {
    key: 'file_type',
    name: 'file-type-change',
  },
]
```

When `item.file_type` changes, the component emits:

```ts
'file-type-change'
```

with the new value.

---

### `modalButton`

| Property | Value                       |
| -------- | --------------------------- |
| Type     | `ModalButtonConfig \| null` |
| Required | No                          |
| Default  | `null`                      |

Configures an optional secondary button that can be used to open a modal or popup.

```ts
interface ModalButtonConfig {
  text: string
  [key: string]: unknown
}
```

Example:

```ts
modalButton: {
  text: 'Add New Partner',
}
```

Clicking the button emits:

```ts
showModal
```

with:

```ts
true
```

---

# Field Configuration

Each entry in `sections[].fields` uses the following configuration:

```ts
interface FieldConfig {
  name: string
  label: string
  hidden?: boolean
  info?: string
  inputClass?: string
  placeholder?: string
  rules?: string
  icon?: (() => unknown) | Record<string, unknown>
  type?: string
  specificType?: string
  variant?: string
  options?: SelectOption[]
  errorName?: string
  autofocus?: boolean
  extraAttrs?: Record<string, unknown>
}
```

### `name`

Unique field name used for:

* `v-model`
* VeeValidate validation
* API field errors
* watcher configuration

Required.

### `label`

Text displayed next to the input.

Required.

### `hidden`

When `true`, the field is not rendered.

### `info`

Optional explanatory text displayed through an information icon and hover tooltip.

### `inputClass`

CSS classes passed to `InputField`.

### `placeholder`

Placeholder passed to `InputField`.

### `rules`

VeeValidate validation rules passed to `InputField`.

Example:

```ts
rules: 'required|email'
```

### `icon`

Optional icon passed to `InputField`.

### `type`

Input type passed to `InputField`.

Examples:

```ts
type: 'text'
type: 'email'
type: 'password'
```

### `specificType`

Optional specialized input type supported by `InputField`.

### `variant`

Input variant passed to `InputField`.

### `options`

Options used by select-style fields.

```ts
import type { SelectOption } from '@/components/Base/InputField.vue'
```

Example:

```ts
options: [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]
```

### `errorName`

Optional alternate field name used when displaying API validation errors.

### `autofocus`

Controls whether the corresponding input receives autofocus.

### `extraAttrs`

Additional attributes passed directly to `InputField`.

```ts
extraAttrs: {
  autocomplete: 'off',
}
```

---

# Form Submission

Submission is handled through VeeValidate's `handleSubmit`.

The component:

1. Validates the form.
2. Sets `submitting` to `true`.
3. Merges form values with `extraParams`.
4. Calls `adder`.
5. Displays the returned success message.
6. Navigates to `detailsPage`, or emits `close`.
7. Applies API field-level errors when provided.
8. Displays an error notification when submission fails.
9. Resets `submitting` to `false`.

The API error format supports:

```ts
interface ApiError {
  message?: string
  data?: Record<string, string[]>
}
```

For example:

```ts
{
  message: 'Unable to create user.',
  data: {
    email: ['A user with this email already exists.'],
  },
}
```

The field error is assigned to the corresponding VeeValidate field.

---

# Submit Button

The submit button is disabled while the form is submitting.

For a create form:

```text
Submit
```

While submitting:

```text
Adding User...
```

For an update form:

```text
Submit
```

While submitting:

```text
Updating User...
```

The resource name comes from the `name` prop.

---

# Modal Button

When `modalButton` is provided, a secondary button is rendered next to the submit button.

Clicking it emits:

```ts
showModal
```

with:

```ts
true
```

This allows the parent component to control the modal state.

---

# Events

### `close`

Emitted after a successful submission when `detailsPage` is not configured.

Payload:

```text
showDetails
```

---

### `showModal`

Emitted when the optional modal button is clicked.

Payload:

```ts
true
```

---

### Dynamic watcher events

Events defined through the `watcher` prop are emitted whenever their corresponding field changes.

For example:

```ts
watcher: [
  {
    key: 'realm',
    name: 'realm-change',
  },
]
```

produces:

```text
realm-change
```

with the new field value.

---

# Reactive Form Model

The component creates a reactive `FormItem`:

```ts
type FormItem = Record<
  string,
  string | number | boolean | File | null | undefined
>
```

Fields are automatically initialized to an empty string when no initial value exists.

This ensures every configured field has a reactive value before the form renders.

---

# Type Definitions

The component exposes the `Adder` and `AdderResult` types for consumers:

```ts
export interface AdderResult {
  data: {
    id: string | number
    [key: string]: unknown
  }
  message: string
}

export type Adder = (
  payload: Record<string, unknown>
) => Promise<AdderResult>
```

The field option type is provided by `InputField`:

```ts
import type { SelectOption } from '@/components/Base/InputField.vue'
```

---

# Create Form Example

```vue
<CreationFormLayout
  page-description="Add a new user to the system."
  page-heading="Create User"
  name="User"
  :sections="userSections"
  :adder="createUser"
  details-page="UserDetails"
  :extra-params="{ account_type: 'customer' }"
/>
```

---

# Update Form Example

```vue
<CreationFormLayout
  page-description="Update the user's information."
  page-heading="Edit User"
  name="User"
  :sections="userSections"
  :initial-values="user"
  :adder="updateUser"
  details-page="UserDetails"
/>
```

---

# Form With Modal Action

```vue
<CreationFormLayout
  page-description="Create a new device."
  page-heading="Device Details"
  name="Device"
  :sections="sections"
  :adder="createDevice"
  :modal-button="{ text: 'Add Device Type' }"
  @show-modal="showDeviceTypeModal = $event"
/>
```

---

# Component Structure

```text
CreationFormLayout
│
├── Page description
├── Page heading
│
├── Form
│   ├── Section
│   │   ├── Section heading
│   │   └── Field grid
│   │       └── InputField
│   │
│   └── Actions
│       ├── Optional modal button
│       └── Submit button
│
└── VeeValidate
    ├── Validation
    ├── Submission
    └── Field errors
```

---

# Related Components

* `InputField` — Renders individual form controls and handles field-level validation.
* `CreationFormLayout` — Groups and submits configurable form fields.
* `useGlobals` — Provides notification and routing helpers.

## Testing

Run the component tests with:

```bash
pnpm vitest --run src/components/Base/__tests__/CreationFormLayout.spec.ts
```

