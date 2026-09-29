/**
 * @module helpers/validation
 * @description Central vee-validate configuration with default messages,
 * reusable rules, and setup helpers used across the dashboard.
 *
 * This module includes shared numeric bounds support via `min_value` and
 * `max_value`, plus file-specific rules such as `specificType` and `image_type`.
 */

import { configure, defineRule } from 'vee-validate'
import {
  alpha,
  alpha_dash,
  confirmed,
  digits,
  email,
  max,
  max_value,
  min_value,
  min,
  required,
} from '@vee-validate/rules'

type ValidationValue = Date | string | number | null | undefined

type ValidationContext = {
  form: Record<string, unknown>
}

type ValidationRule = {
  params?: unknown[]
}

type ValidationMessage = (field: string, rule?: ValidationRule) => string

const defaultMessages: Record<string, ValidationMessage> = {
  required: (field) => `${field} is required`,

  email: (field) => `${field} must be a valid email`,

  alpha: (field) => `${field} must only contain letters.`,

  min: (field, rule) => `${field} must be at least ${Number(rule?.params?.[0]) || 0} characters`,

  max: (field, rule) => `${field} must be at most ${Number(rule?.params?.[0]) || 0} characters`,

  max_value: (field, rule) => `${field} must be at most ${Number(rule?.params?.[0]) || 0}`,

  min_value: (field, rule) => `${field} must be at least ${Number(rule?.params?.[0]) || 0}`,

  digits: (field, rule) => `${field} must be exactly ${Number(rule?.params?.[0]) || 0} digits`,

  confirmed: (field) => `${field} does not match with new password`,

  date: (field) => `${field} must be a valid date`,

  date_after: (field, rule) => {
    const targetLabel = rule?.params?.[1] || 'start date'
    return `${field} must be on or after ${String(targetLabel)}`
  },

  date_before: (field, rule) => {
    const targetLabel = rule?.params?.[1] || 'end date'
    return `${field} must be on or before ${String(targetLabel)}`
  },

  file_max_size: (field, rule) => {
    const limitMB = Number(rule?.params?.[0]) || 10
    return `${field} must be ${limitMB} MB or smaller`
  },

  min_age: (field, rule) => {
    const requiredAge = Number(rule?.params?.[0]) || 18
    return `${field} requires you to be at least ${requiredAge} years old`
  },

  positive_integer: (field) => `${field} must be a positive whole number`,
}

/**
 * Converts a raw value to a Date instance.
 *
 * @param value - Input value coming from a form field.
 * @returns A Date instance or null when the value is invalid.
 */
const parseDate = (value: ValidationValue): Date | null => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

/**
 * Determines the whole-year age for a given date relative to today.
 *
 * @param value - Date of birth to evaluate.
 * @returns Computed age in years, or null when the date is invalid.
 */
const calculateAge = (value: ValidationValue): number | null => {
  const dob = parseDate(value)

  if (!dob) {
    return null
  }

  const today = new Date()

  let age = today.getFullYear() - dob.getFullYear()

  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate())

  if (!hasHadBirthdayThisYear) {
    age -= 1
  }

  return age
}

/**
 * Registers the built-in vee-validate rules used throughout the app.
 */
const registerBuiltInRules = (): void => {
  defineRule('required', required)
  defineRule('email', email)
  defineRule('min', min)
  defineRule('max', max)
  defineRule('max_value', max_value)
  defineRule('min_value', min_value)
  defineRule('alpha', alpha)
  defineRule('alpha_dash', alpha_dash)
  defineRule('digits', digits)
  defineRule('confirmed', confirmed)
}

/**
 * Registers reusable, app-specific validation rules.
 */
const registerCustomRules = (): void => {
  defineRule('safe_password', (value: unknown) =>
    /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{}|;:'",.<>/?`~]+$/.test(String(value))
      ? true
      : 'Only letters, numbers, and special characters allowed',
  )

  defineRule('phone_strict', (value: unknown) => {
    if (!value) {
      return 'Phone number is required'
    }

    const normalized = String(value).replace(/\s+/g, '')

    return /^[+0-9]{7,15}$/.test(normalized)
      ? true
      : 'Must be a valid phone number (digits, spaces, optional +)'
  })

  defineRule('date', (value: unknown) => (parseDate(value as ValidationValue) ? true : false))

  defineRule('min_age', (value: unknown, [requiredAge = 18]: [number | string | undefined]) => {
    if (!value) {
      return true
    }

    const age = calculateAge(value as ValidationValue)

    if (age === null) {
      return false
    }

    return age >= Number(requiredAge)
  })

  /**
   * Validates that the current date is on or after the provided reference field.
   *
   * @param value - Current field value, usually an end date.
   * @param params - Rule parameters. `params[0]` is the other field name.
   * @param ctx - Validation context containing the form values.
   */
  defineRule(
    'date_after',
    (value: unknown, [targetField]: [string | undefined], ctx: ValidationContext) => {
      if (!targetField || !value) {
        return true
      }

      const currentField = parseDate(value as ValidationValue)

      if (!currentField) {
        return true
      }

      const comparisonField = parseDate(ctx.form[targetField] as ValidationValue)

      if (!comparisonField) {
        return true
      }

      return currentField >= comparisonField
    },
  )

  /**
   * Validates that the current date is on or before the provided reference field.
   *
   * @param value - Current field value, usually a start date.
   * @param params - Rule parameters. `params[0]` is the other field name.
   * @param ctx - Validation context containing the form values.
   */
  defineRule(
    'date_before',
    (value: unknown, [targetField]: [string | undefined], ctx: ValidationContext) => {
      if (!targetField || !value) {
        return true
      }

      const currentField = parseDate(value as ValidationValue)

      if (!currentField) {
        return true
      }

      const comparisonField = parseDate(ctx.form[targetField] as ValidationValue)

      if (!comparisonField) {
        return true
      }

      return currentField <= comparisonField
    },
  )

  /**
   * Validates the selected media category and file size.
   *
   * @param file - Uploaded file or stored file reference.
   * @param params - Rule parameters.
   * @param ctx - Validation context exposing form values.
   */
  defineRule(
    'specificType',
    (
      file: unknown,
      [targetField, controlFlag]: [string | undefined, string | undefined],
      ctx: ValidationContext,
    ) => {
      let comparisonField = targetField ? ctx.form[targetField] : undefined

      const MAX_IMAGE_BYTES = 10 * 1024 * 1024 * 1024
      const MAX_VIDEO_BYTES = 10 * 1024 * 1024 * 1024
      const MAX_AUDIO_BYTES = 10 * 1024 * 1024 * 1024

      if (typeof file === 'string' && !controlFlag) {
        if (file !== comparisonField) {
          return 'Original File does not match new Media Type'
        }

        return true
      }

      if (controlFlag === 'true') {
        comparisonField = targetField
      }

      if (!comparisonField) {
        return 'Select Media Type'
      }

      if (!file) {
        return true
      }

      if (!(file instanceof File)) {
        return true
      }

      switch (comparisonField) {
        case 'Image':
          if (!file.type.startsWith('image/')) {
            return 'File must be an image'
          }

          if (file.size > MAX_IMAGE_BYTES) {
            return 'Image exceeds the 10 GB limit.'
          }

          return true

        case 'Video':
          if (!file.type.startsWith('video/')) {
            return 'File must be a video'
          }

          if (file.size > MAX_VIDEO_BYTES) {
            return 'Video exceeds the 40 GB limit.'
          }

          return true

        case 'Audio':
          if (!file.type.startsWith('audio/')) {
            return 'File must be audio'
          }

          if (file.size > MAX_AUDIO_BYTES) {
            return 'Audio exceeds the 40 GB limit.'
          }

          return true

        default:
          return true
      }
    },
  )

  /**
   * Ensures an uploaded value is an image file when a file is present.
   *
   * @param file - Uploaded file value.
   * @returns True when valid or empty, otherwise an error message.
   */
  defineRule('image_type', (file: unknown) => {
    if (!file) {
      return true
    }

    const selectedFile =
      file instanceof FileList ? file[0] : file instanceof File ? file : undefined

    if (!selectedFile) {
      return true
    }

    return selectedFile.type.startsWith('image/') ? true : 'File must be an image'
  })

  /**
   * Validates that a selected file does not exceed the provided size.
   *
   * @param value - File or FileList value.
   * @param params - Rule parameters. `params[0]` is the limit in MB.
   */
  defineRule('file_max_size', (value: unknown, [limitMB = 10]: [number | string | undefined]) => {
    if (!value) {
      return true
    }

    const file = value instanceof FileList ? value[0] : value instanceof File ? value : undefined

    if (!file) {
      return true
    }

    const maxBytes = Number(limitMB) * 1024 * 1024

    return file.size <= maxBytes
  })

  /**
   * Ensures a form value is an integer greater than or equal to zero.
   *
   * @param value - Raw field value received from VeeValidate.
   */
  defineRule('positive_integer', (value: unknown) => {
    const number = Number(value)

    return Number.isInteger(number) && number >= 0
  })
}

/**
 * Initializes all validation rules and vee-validate configuration.
 *
 * Registers built-in rules, custom rules, default messages,
 * and validation triggers.
 */
export function setupValidation(): void {
  registerBuiltInRules()
  registerCustomRules()

  configure({
    generateMessage: ({ field, rule }) => {
      if (!rule) {
        return `${field} is invalid`
      }

      const message = defaultMessages[rule.name]

      if (!message) {
        return `${field} is invalid`
      }

      return message(field, {
        params: Array.isArray(rule.params) ? rule.params : undefined,
      })
    },

    validateOnInput: true,
  })
}
