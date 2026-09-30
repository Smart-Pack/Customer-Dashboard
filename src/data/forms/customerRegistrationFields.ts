/**
 * @module forms/customerRegistrationFields
 * @description Provides the standardized field configuration for customer
 * registration forms.
 */

/**
 * Returns the fields used by the customer registration form.
 *
 * The field keys correspond to the properties accepted by
 * `RegisterCustomerPayload`.
 *
 * @returns A configuration array for use with `AuthCard`.
 */
export function getCustomerRegistrationFields() {
  return [
    {
      key: 'first_name',
      label: 'First Name',
      specificType: 'fname',
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
      rules: 'min_age:13',
    },
  ]
}
