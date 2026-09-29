# AuthCard

`AuthCard` is a reusable authentication form component that provides a consistent layout and submission flow for authentication-related forms.

It supports configurable form fields, authentication functions, validation, additional parameters, notifications, and route navigation.

## Location

```text
src/components/Base/AuthCard.vue
```

## Features

* Reusable authentication form layout.
* Dynamic form fields.
* VeeValidate form handling.
* Custom validation support.
* Configurable authentication function.
* Success and error notifications.
* Configurable navigation after authentication.
* Support for additional request parameters.
* Loading state during form submission.
* Forgot-password navigation slot.

## Props

| Prop               | Type                      | Required | Description                                                                                |
| ------------------ | ------------------------- | -------: | ------------------------------------------------------------------------------------------ |
| `heading`          | `string`                  |      Yes | Main heading displayed on the card.                                                        |
| `subtitle`         | `string`                  |       No | Secondary heading. Defaults to `SMARTPACK ADMIN PLATFORM`.                                 |
| `description`      | `string`                  |       No | Optional description displayed below the subtitle.                                         |
| `btnText`          | `string \| ButtonText`    |       No | Submit button text or separate normal/loading text.                                        |
| `formFields`       | `AuthFormField[]`         |      Yes | Defines the fields rendered by the form.                                                   |
| `authFn`           | `Function`                |      Yes | Function called with the submitted form payload.                                           |
| `currentRoutes`    | `RouteConfig`             |      Yes | Defines the previous and next authentication routes.                                       |
| `extraParams`      | `Record<string, unknown>` |       No | Additional parameters merged into the authentication payload.                              |
| `customValidator`  | `Function`                |       No | Optional custom validation function executed before authentication.                        |
| `resolveNextRoute` | `Function`                |       No | Optional function that determines whether navigation should continue after authentication. |

## Form Fields

Each item in `formFields` defines a field rendered by `InputField`.

Example:

```ts
const formFields = [
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'Enter your email',
    rules: 'required|email',
  },
  {
    key: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    rules: 'required',
  },
]
```

The `key` property is used to bind the field value to the submitted form data.

## Button Text

`btnText` accepts either a string or an object containing separate normal and loading states.

String:

```ts
btnText: 'Login'
```

Object:

```ts
btnText: {
  normal: 'Login',
  loading: 'Logging in...',
}
```

When an object is provided, the loading text is displayed while the authentication request is being processed.

## Authentication Function

`authFn` receives the submitted form values together with any values supplied through `extraParams`.

Example:

```ts
const authFn = async (payload) => {
  await login(payload)

  return 'Logged in successfully!'
}
```

The returned message is displayed using the global success notification helper.

## Custom Validation

`customValidator` can be used when validation requires logic beyond the standard field rules.

It receives the submitted values and VeeValidate's `setFieldError` function.

```ts
const customValidator = async (values, setFieldError) => {
  if (values.password !== values.confirmPassword) {
    setFieldError('confirmPassword', 'Passwords do not match')
    return false
  }

  return true
}
```

If the validator returns `false`, authentication is stopped.

## Additional Parameters

`extraParams` allows additional values to be merged into the authentication payload.

```ts
const extraParams = {
  otp_verified: true,
}
```

The resulting payload is equivalent to:

```ts
{
  ...formValues,
  ...extraParams,
}
```

## Route Navigation

`currentRoutes` defines the authentication routes used by the component.

Example:

```ts
const currentRoutes = {
  prev: {
    name: 'forgot-password',
    label: 'Forgot Password?',
  },
  next: {
    name: 'dashboard',
  },
}
```

After successful authentication, the component navigates to `currentRoutes.next.name`.

The previous route is used for the default forgot-password link when no default slot is provided.

## Resolving the Next Route

`resolveNextRoute` can be used when navigation depends on additional application state.

```ts
const resolveNextRoute = async () => {
  return true
}
```

If it returns `false`, the component does not navigate to the next route.

## Slots

The default slot can replace the default forgot-password link.

Without a slot:

```vue
<AuthCard
  ...
/>
```

The component displays the configured previous-route link.

With a slot:

```vue
<AuthCard ...>
  <router-link to="/somewhere">
    Custom link
  </router-link>
</AuthCard>
```

The custom slot content is displayed instead.

## Submission Flow

The submission process follows these steps:

1. VeeValidate handles form submission.
2. `customValidator` runs when provided.
3. Submission stops if `customValidator` returns `false`.
4. Form values are merged with `extraParams`.
5. `submitting` is set to `true`.
6. `authFn` is called with the payload.
7. A success notification is displayed.
8. `resolveNextRoute` runs when provided.
9. The component navigates to the configured next route.
10. Errors are displayed using the error notification helper.
11. The loading state is cleared.

## Error Handling

Authentication errors are displayed using `$notifyError`.

If an authentication error contains a `reload` property set to `true`, the user is redirected to the `forgot-password` route.

## Example

```vue
<AuthCard
  heading="Welcome Back"
  subtitle="SMARTPACK ADMIN PLATFORM"
  btn-text="Login"
  :form-fields="formFields"
  :auth-fn="login"
  :current-routes="currentRoutes"
/>
```

## Testing

Unit tests are located at:

```text
src/components/Base/__tests__/AuthCard.spec.ts
```

Run the tests with:

```bash
pnpm exec vitest run src/components/Base/__tests__/AuthCard.spec.ts
```

