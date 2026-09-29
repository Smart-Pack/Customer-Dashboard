import { describe, expect, it } from 'vitest'

import { safeExternalHref, withCacheBust } from '@/utils/urlSecurity'

describe('safeExternalHref', () => {
  it('returns a normalized https URL', () => {
    expect(safeExternalHref('https://example.com/path')).toBe('https://example.com/path')
  })

  it('returns a normalized http URL', () => {
    expect(safeExternalHref('http://example.com/path')).toBe('http://example.com/path')
  })

  it('trims whitespace from the URL', () => {
    expect(safeExternalHref('  https://example.com/path  ')).toBe('https://example.com/path')
  })

  it('normalizes the URL using the URL API', () => {
    expect(safeExternalHref('https://example.com:443/path')).toBe('https://example.com/path')
  })

  it('returns null for an empty string', () => {
    expect(safeExternalHref('')).toBeNull()
  })

  it('returns null for whitespace-only input', () => {
    expect(safeExternalHref('   ')).toBeNull()
  })

  it('returns null for a relative URL', () => {
    expect(safeExternalHref('/users/123')).toBeNull()
  })

  it('returns null for a malformed URL', () => {
    expect(safeExternalHref('not-a-valid-url')).toBeNull()
  })

  it('rejects javascript URLs', () => {
    expect(safeExternalHref('javascript:alert(1)')).toBeNull()
  })

  it('rejects data URLs', () => {
    expect(safeExternalHref('data:text/html,<h1>Hello</h1>')).toBeNull()
  })

  it('rejects blob URLs', () => {
    expect(safeExternalHref('blob:https://example.com/id')).toBeNull()
  })

  it('rejects file URLs', () => {
    expect(safeExternalHref('file:///etc/passwd')).toBeNull()
  })

  it('returns null for non-string values', () => {
    expect(safeExternalHref(null)).toBeNull()
    expect(safeExternalHref(undefined)).toBeNull()
    expect(safeExternalHref(123)).toBeNull()
    expect(safeExternalHref({})).toBeNull()
    expect(safeExternalHref([])).toBeNull()
  })

  it('accepts URLs with query parameters and fragments', () => {
    expect(safeExternalHref('https://example.com/users?page=2#details')).toBe(
      'https://example.com/users?page=2#details',
    )
  })

  it('rejects URLs with unsupported protocols', () => {
    expect(safeExternalHref('ftp://example.com/file')).toBeNull()
    expect(safeExternalHref('mailto:user@example.com')).toBeNull()
    expect(safeExternalHref('tel:+254700000000')).toBeNull()
  })
})
describe('withCacheBust', () => {
  it('adds a cache-busting parameter to an unsigned URL', () => {
    const url =
      'http://api.smartpack.com/media/profile-pics/1f7ee4da-3f4c-46c8-832f-79f701a81560.jpeg'

    expect(withCacheBust(url)).toMatch(
      /^http:\/\/api\.smartpack\.com\/media\/profile-pics\/1f7ee4da-3f4c-46c8-832f-79f701a81560\.jpeg\?v=\d+$/,
    )
  })

  it('preserves a signed object storage URL unchanged', () => {
    const url =
      'https://hel1.your-objectstorage.com/m-shiriki-qa/media/profile-pics/5f37bfe5-f02b-48bf-8e3b-552f31af7d3e..png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=WKMCLY9CXHPSZ5H0WNLJ%2F20260929%2Fhel1%2Fs3%2Faws4_request&X-Amz-Date=20260929T055441Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=3e7ad0eb0b786b73fc477a1a6665c2fd352ff7330be75c63dc4f4e181c5fa4b4'

    expect(withCacheBust(url)).toBe(url)
  })

  it('uses an ampersand when the URL already has query parameters', () => {
    const url = 'http://api.smartpack.com/media/profile-pic.jpeg?foo=bar'

    expect(withCacheBust(url)).toMatch(
      /^http:\/\/api\.smartpack\.com\/media\/profile-pic\.jpeg\?foo=bar&v=\d+$/,
    )
  })

  it('returns undefined for an undefined URL', () => {
    expect(withCacheBust('')).toBeUndefined()
  })
  it('returns a blob URL unchanged', () => {
    const url = 'blob:http://localhost:5173/8c5d1234-5678-90ab-cdef-123456789abc'

    expect(withCacheBust(url)).toBe(url)
  })
})
