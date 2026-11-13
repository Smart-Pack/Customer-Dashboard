import type { PaginatedResponse } from '@/api/types'

/**
 * Paginates a list of items locally.
 *
 * @param items - Complete list of items.
 * @param page - Requested page number (1-based).
 * @param pageSize - Number of items per page.
 * @returns Paginated response containing the requested items.
 */
function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResponse<T> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('Page size must be a positive integer.')
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new Error('Page must be a positive integer.')
  }
  const count = items.length
  const totalPages = Math.ceil(count / pageSize)
  const currentPage = Math.max(1, page)

  const startIndex = (currentPage - 1) * pageSize
  const results = items.slice(startIndex, startIndex + pageSize)

  return {
    count,
    next: currentPage < totalPages ? String(currentPage + 1) : null,
    previous: currentPage > 1 && currentPage <= totalPages ? String(currentPage - 1) : null,
    results,
  }
}

export { paginate }
