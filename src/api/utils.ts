/**
 * Extracts a detail message from an API error response.
 *
 * @param error - The error thrown by an API request.
 * @returns The API detail message, or null if none is available.
 */
export const getApiErrorDetail = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null) {
    return null
  }

  if (!('response' in error)) {
    return null
  }

  const response = error.response

  if (typeof response !== 'object' || response === null) {
    return null
  }

  if (!('data' in response)) {
    return null
  }

  const data = response.data

  if (
    typeof data === 'object' &&
    data !== null &&
    'detail' in data &&
    typeof data.detail === 'string'
  ) {
    return data.detail
  }

  return null
}
