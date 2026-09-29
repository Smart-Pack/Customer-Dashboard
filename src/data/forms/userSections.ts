/**
 * @module forms/userSections
 * @description This module exports a function that returns a standardized configuration object
 * for rendering User creation and update forms. This centralization ensures that
 * both forms share the same fields, validation rules, and layout.
 */

/**
 * Returns the sections and fields for the User forms.
 *
 * @returns A configuration array for use with `CreationFormLayout`.
 */
export function getUserSections() {
  return [
    {
      title: 'Personal Details',
      fields: [
        {
          name: 'first_name',
          label: 'First Name',
          specificType: 'fname',
        },
        {
          name: 'last_name',
          label: 'Last Name',
          specificType: 'lname',
        },
        {
          name: 'email',
          label: 'Email Address',
          specificType: 'email',
        },
        {
          name: 'gender',
          label: 'Gender',
          specificType: 'gender',
        },
        {
          name: 'date_of_birth',
          label: 'Date Of Birth',
          errorName: 'DOB',
          type: 'date',
          rules: 'min_age:13',
        },
      ],
    },
    {
      title: 'Account Settings',
      fields: [
        {
          name: 'role',
          label: 'User Role',
          specificType: 'user',
        },
        {
          name: 'phone',
          label: 'Phone Number',
          specificType: 'phone',
        },
      ],
    },
  ]
}
