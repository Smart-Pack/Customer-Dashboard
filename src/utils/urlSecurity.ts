const ALLOWED_EXTERNAL_URL_PROTOCOLS = new Set(['http:', 'https:'])
const SIGNED_URL_PARAMS = ['X-Amz-Signature', 'Signature', 'Expires', 'token']

/**
 * Returns a normalized http(s) URL for safe external navigation.
 * Rejects empty, malformed, relative, and dangerous schemes such as javascript:, data:, blob:, and file:.
 *
 * @param {unknown} value Candidate URL value.
 * @returns {string|null} Normalized URL when safe, otherwise null.
 */
export function safeExternalHref(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const candidate = value.trim()
  if (!candidate) return null

  try {
    const parsed = new URL(candidate)
    return ALLOWED_EXTERNAL_URL_PROTOCOLS.has(parsed.protocol) ? parsed.href : null
  } catch {
    return null
  }
}

/**
 * Appends a cache-busting query parameter to an unsigned URL.
 *
 * Signed URLs are returned unchanged because modifying their query
 * parameters may invalidate the signature or authentication.
 *
 * @param url - The URL to process, or `null`.
 * @returns The original URL for signed URLs, a cache-busted URL for
 *   unsigned URLs, or `undefined` when no URL is provided.
 */
export function withCacheBust(url: string | null): string | undefined {
  if (!url) return undefined

  if (url.startsWith('blob:') || SIGNED_URL_PARAMS.some((param) => url.includes(`${param}=`))) {
    return url
  }

  const separator = url.includes('?') ? '&' : '?'

  return `${url}${separator}v=${Date.now()}`
}
