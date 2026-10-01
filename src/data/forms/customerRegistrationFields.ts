/**
 * @module forms/customerRegistrationFields
 * @description Provides the standardized field configuration for customer
 * registration forms.
 */

import type { RegisterCustomerPayload } from '@/api/modules/users'

/**
 * Field keys used by the customer registration form.
 *
 * Derived from `RegisterCustomerPayload` to keep the form fields
 * synchronized with the registration API payload.
 */
export type CustomerRegistrationFieldKey = Exclude<
  keyof RegisterCustomerPayload,
  'profile_pic' | 'credential'
>

/**
 * Configuration for a customer registration form field.
 */
export interface CustomerRegistrationField {
  /** Property name used by the registration form and API payload. */
  key: CustomerRegistrationFieldKey

  /** Display label for the field. */
  label: string

  /** Input-specific type used by `InputField`. */
  specificType?: string

  /** Custom label used when displaying validation errors. */
  errorLabel?: string

  /** HTML input type. */
  type?: string

  /** Validation rules passed to `InputField`. */
  rules?: string

  /** Additional attributes passed to the input component. */
  extraAttrs?: Record<string, unknown>
}

/**
 * Returns the fields used by the customer registration form.
 *
 * The field keys correspond to the properties accepted by
 * `RegisterCustomerPayload`.
 *
 * @returns A configuration array for use with `AuthCard`.
 */
export function getCustomerRegistrationFields(): CustomerRegistrationField[] {
  return [
    {
      key: 'first_name',
      label: 'First Name',
      specificType: 'fname',
      extraAttrs: {
        autofocus: true,
      },
    },
    {
      key: 'last_name',
      label: 'Last Name',
      specificType: 'lname',
    },
    {
      key: 'email',
      label: 'Email Address',
      specificType: 'email',
    },
    {
      key: 'phone',
      label: 'Phone Number',
      specificType: 'phone',
    },
    {
      key: 'gender',
      label: 'Gender',
      specificType: 'gender',
    },
    {
      key: 'date_of_birth',
      label: 'Date Of Birth',
      errorLabel: 'DOB',
      type: 'date',
      rules: 'required|min_age:13',
    },
  ]
}
