import { configure, defineRule, validate } from 'vee-validate'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setupValidation } from '../validation'

describe('validation helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupValidation()
  })

  describe('setupValidation', () => {
    it('registers validation rules and configuration', () => {
      expect(defineRule).toBeDefined()
      expect(configure).toBeDefined()
    })
  })

  describe('required', () => {
    it('accepts a value', async () => {
      const result = await validate('John', 'required')

      expect(result.valid).toBe(true)
    })

    it('rejects an empty value', async () => {
      const result = await validate('', 'required')

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toBe('{field} is required')
    })
  })

  describe('email', () => {
    it('accepts a valid email', async () => {
      const result = await validate('user@example.com', 'email')

      expect(result.valid).toBe(true)
    })

    it('rejects an invalid email', async () => {
      const result = await validate('invalid-email', 'email')

      expect(result.valid).toBe(false)
    })
  })

  describe('alpha', () => {
    it('accepts alphabetic characters', async () => {
      const result = await validate('John', 'alpha')

      expect(result.valid).toBe(true)
    })

    it('rejects numeric characters', async () => {
      const result = await validate('John123', 'alpha')

      expect(result.valid).toBe(false)
    })
  })

  describe('alpha_dash', () => {
    it('accepts letters, numbers, underscores, and dashes', async () => {
      const result = await validate('john-doe_123', 'alpha_dash')

      expect(result.valid).toBe(true)
    })
  })

  describe('min', () => {
    it('accepts a value meeting the minimum length', async () => {
      const result = await validate('12345', 'min:5')

      expect(result.valid).toBe(true)
    })

    it('rejects a value below the minimum length', async () => {
      const result = await validate('1234', 'min:5')

      expect(result.valid).toBe(false)
    })
  })

  describe('max', () => {
    it('accepts a value within the maximum length', async () => {
      const result = await validate('12345', 'max:5')

      expect(result.valid).toBe(true)
    })

    it('rejects a value above the maximum length', async () => {
      const result = await validate('123456', 'max:5')

      expect(result.valid).toBe(false)
    })
  })

  describe('min_value', () => {
    it('accepts a value above the minimum', async () => {
      const result = await validate(10, 'min_value:5')

      expect(result.valid).toBe(true)
    })

    it('rejects a value below the minimum', async () => {
      const result = await validate(3, 'min_value:5')

      expect(result.valid).toBe(false)
    })
  })

  describe('max_value', () => {
    it('accepts a value below the maximum', async () => {
      const result = await validate(5, 'max_value:10')

      expect(result.valid).toBe(true)
    })

    it('rejects a value above the maximum', async () => {
      const result = await validate(15, 'max_value:10')

      expect(result.valid).toBe(false)
    })
  })

  describe('digits', () => {
    it('accepts the correct number of digits', async () => {
      const result = await validate('123456', 'digits:6')

      expect(result.valid).toBe(true)
    })

    it('rejects an incorrect number of digits', async () => {
      const result = await validate('12345', 'digits:6')

      expect(result.valid).toBe(false)
    })
  })

  describe('confirmed', () => {
    it('accepts matching values', async () => {
      const result = await validate('password123', 'confirmed:@password', {
        name: 'password_confirmation',
        values: {
          password: 'password123',
        },
      })

      expect(result.valid).toBe(true)
    })

    it('rejects non-matching values', async () => {
      const result = await validate('different', 'confirmed:@password', {
        name: 'password_confirmation',
        values: {
          password: 'password123',
        },
      })

      expect(result.valid).toBe(false)
    })
  })

  describe('safe_password', () => {
    it('accepts letters, numbers, and allowed special characters', async () => {
      const result = await validate('Password123!', 'safe_password')

      expect(result.valid).toBe(true)
    })

    it('rejects unsupported characters', async () => {
      const result = await validate('Password 123', 'safe_password')

      expect(result.valid).toBe(false)
    })
  })

  describe('phone_strict', () => {
    it('accepts a valid phone number', async () => {
      const result = await validate('+254712345678', 'phone_strict')

      expect(result.valid).toBe(true)
    })

    it('accepts phone numbers containing spaces', async () => {
      const result = await validate('+254 712 345 678', 'phone_strict')

      expect(result.valid).toBe(true)
    })

    it('rejects an invalid phone number', async () => {
      const result = await validate('abc123', 'phone_strict')

      expect(result.valid).toBe(false)
    })

    it('rejects an empty phone number', async () => {
      const result = await validate('', 'phone_strict')

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toBe('Phone number is required')
    })
  })

  describe('date', () => {
    it('accepts a valid date', async () => {
      const result = await validate('2026-01-01', 'date')

      expect(result.valid).toBe(true)
    })

    it('rejects an invalid date', async () => {
      const result = await validate('invalid-date', 'date')

      expect(result.valid).toBe(false)
    })

    it('accepts an empty value', async () => {
      const result = await validate('', 'date')

      expect(result.valid).toBe(false)
    })
  })

  describe('min_age', () => {
    it('accepts a user who meets the minimum age', async () => {
      const result = await validate('2000-01-01', 'min_age:18')

      expect(result.valid).toBe(true)
    })

    it('rejects a user below the minimum age', async () => {
      const currentYear = new Date().getFullYear()
      const birthYear = currentYear - 10

      const result = await validate(`${birthYear}-01-01`, 'min_age:18')

      expect(result.valid).toBe(false)
    })

    it('allows an empty value', async () => {
      const result = await validate('', 'min_age:18')

      expect(result.valid).toBe(true)
    })
  })

  describe('date_after', () => {
    it('accepts a date after the reference date', async () => {
      const result = await validate('2026-02-01', 'date_after:startDate', {
        name: 'endDate',
        values: {
          startDate: '2026-01-01',
        },
      })

      expect(result.valid).toBe(true)
    })

    it('accepts the same date as the reference date', async () => {
      const result = await validate('2026-01-01', 'date_after:startDate', {
        name: 'endDate',
        values: {
          startDate: '2026-01-01',
        },
      })

      expect(result.valid).toBe(true)
    })

    it('rejects a date before the reference date', async () => {
      const result = await validate('2025-12-01', 'date_after:startDate', {
        name: 'endDate',
        values: {
          startDate: '2026-01-01',
        },
      })

      expect(result.valid).toBe(false)
    })
  })

  describe('date_before', () => {
    it('accepts a date before the reference date', async () => {
      const result = await validate('2026-01-01', 'date_before:endDate', {
        name: 'startDate',
        values: {
          endDate: '2026-02-01',
        },
      })

      expect(result.valid).toBe(true)
    })

    it('accepts the same date as the reference date', async () => {
      const result = await validate('2026-01-01', 'date_before:endDate', {
        name: 'startDate',
        values: {
          endDate: '2026-01-01',
        },
      })

      expect(result.valid).toBe(true)
    })

    it('rejects a date after the reference date', async () => {
      const result = await validate('2026-03-01', 'date_before:endDate', {
        name: 'startDate',
        values: {
          endDate: '2026-02-01',
        },
      })

      expect(result.valid).toBe(false)
    })
  })

  describe('positive_integer', () => {
    it('accepts zero', async () => {
      const result = await validate(0, 'positive_integer')

      expect(result.valid).toBe(true)
    })

    it('accepts a positive integer', async () => {
      const result = await validate(10, 'positive_integer')

      expect(result.valid).toBe(true)
    })

    it('rejects negative integers', async () => {
      const result = await validate(-1, 'positive_integer')

      expect(result.valid).toBe(false)
    })

    it('rejects decimal numbers', async () => {
      const result = await validate(1.5, 'positive_integer')

      expect(result.valid).toBe(false)
    })
  })

  describe('image_type', () => {
    it('accepts an image file', async () => {
      const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' })

      const result = await validate(file, 'image_type')

      expect(result.valid).toBe(true)
    })

    it('rejects a non-image file', async () => {
      const file = new File(['document'], 'document.pdf', { type: 'application/pdf' })

      const result = await validate(file, 'image_type')

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toBe('File must be an image')
    })

    it('allows an empty value', async () => {
      const result = await validate('', 'image_type')

      expect(result.valid).toBe(true)
    })
  })

  describe('file_max_size', () => {
    it('accepts a file below the configured limit', async () => {
      const file = new File(['small file'], 'file.txt', { type: 'text/plain' })

      const result = await validate(file, 'file_max_size:10')

      expect(result.valid).toBe(true)
    })

    it('rejects a file above the configured limit', async () => {
      const file = new File(['x'], 'file.txt', { type: 'text/plain' })

      Object.defineProperty(file, 'size', {
        value: 11 * 1024 * 1024,
      })

      const result = await validate(file, 'file_max_size:10')

      expect(result.valid).toBe(false)
    })

    it('allows an empty value', async () => {
      const result = await validate('', 'file_max_size:10')

      expect(result.valid).toBe(true)
    })
  })

  describe('specificType', () => {
    it('accepts a valid image file for Image media type', async () => {
      const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' })

      const result = await validate(file, 'specificType:mediaType', {
        name: 'file',
        values: {
          mediaType: 'Image',
        },
      })

      expect(result.valid).toBe(true)
    })

    it('rejects a non-image file for Image media type', async () => {
      const file = new File(['document'], 'document.pdf', { type: 'application/pdf' })

      const result = await validate(file, 'specificType:mediaType', {
        name: 'file',
        values: {
          mediaType: 'Image',
        },
      })

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toBe('File must be an image')
    })

    it('rejects a file when no media type is selected', async () => {
      const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' })

      const result = await validate(file, 'specificType:mediaType', {
        name: 'file',
        values: {},
      })

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toBe('Select Media Type')
    })

    it('accepts a valid video file for Video media type', async () => {
      const file = new File(['video'], 'video.mp4', { type: 'video/mp4' })

      const result = await validate(file, 'specificType:mediaType', {
        name: 'file',
        values: {
          mediaType: 'Video',
        },
      })

      expect(result.valid).toBe(true)
    })

    it('accepts a valid audio file for Audio media type', async () => {
      const file = new File(['audio'], 'audio.mp3', { type: 'audio/mpeg' })

      const result = await validate(file, 'specificType:mediaType', {
        name: 'file',
        values: {
          mediaType: 'Audio',
        },
      })

      expect(result.valid).toBe(true)
    })

    it('rejects a stored file when its media type changes', async () => {
      const result = await validate('Image', 'specificType:mediaType', {
        name: 'file',
        values: {
          mediaType: 'Video',
        },
      })

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toBe('Original File does not match new Media Type')
    })
  })
})
