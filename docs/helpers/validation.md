# Form Validation

The SmartPack Admin Dashboard uses [VeeValidate](https://vee-validate.logaretm.com/v4/) for form validation and field state management.

Validation is centralized in `src/helpers/validation.ts`, which configures VeeValidate and defines the validation rules used throughout the application.

## Overview

The validation system provides:

* Reusable validation rules for authentication and application forms.
* Centralized validation error messages.
* Support for built-in VeeValidate rules.
* Custom rules for SmartPack-specific validation requirements.
* Validation during user input.
* File, date, age, phone number, and password validation.

## Validation Setup

Validation is initialized when the application starts:

```ts
setupValidation()
```

The setup function registers the available rules and configures VeeValidate's global validation behavior.

## Validation Rules

The validation helper includes both built-in and custom rules.

### Built-in Rules

Rules provided by `@vee-validate/rules` include:

* `required`
* `email`
* `min`
* `max`
* `min_value`
* `max_value`
* `digits`
* `alpha`
* `alpha_dash`
* `confirmed`

### Custom Rules

SmartPack-specific rules include:

* `safe_password` — Validates password strength requirements.
* `phone_strict` — Validates phone number format.
* `date` — Validates date values.
* `min_age` — Ensures a user meets the required minimum age.
* `date_after` — Validates that a date occurs after another field's date.
* `date_before` — Validates that a date occurs before another field's date.
* `specificType` — Validates a value against an expected type.
* `image_type` — Validates supported image file types.
* `file_max_size` — Validates the maximum allowed file size.
* `positive_integer` — Validates positive integer values.

## Using Validation

Validation rules can be supplied to form fields through VeeValidate's field components or composables.

For example:

```vue
<Field
  name="email"
  rules="required|email"
/>
```

Reusable components such as `InputField` integrate with VeeValidate so that validation state and errors can be handled consistently across forms.

## Error Messages

Validation messages are configured centrally so that forms use consistent error messages throughout the application.

This allows validation behavior and user-facing messages to be updated in one location rather than being duplicated across individual forms.

## Adding New Rules

New validation rules should be added to:

```text
src/helpers/validation.ts
```

When adding a rule:

1. Define the rule using VeeValidate's `defineRule`.
2. Add an appropriate validation message.
3. Add tests covering valid and invalid values.
4. Update this documentation if the rule is intended for general use.

## Testing

Validation rules are covered by unit tests located at:

```text
src/helpers/__tests__/validation.spec.ts
```

Run the validation tests with:

```bash
pnpm test
```

Run TypeScript validation with:

```bash
pnpm type-check
```

