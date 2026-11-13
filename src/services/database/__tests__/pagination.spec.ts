import { describe, expect, it } from 'vitest'

import { paginate } from '../pagination'

describe('paginate', () => {
  const items = [
    { id: 1, name: 'Group 1' },
    { id: 2, name: 'Group 2' },
    { id: 3, name: 'Group 3' },
    { id: 4, name: 'Group 4' },
    { id: 5, name: 'Group 5' },
  ]

  it('returns the requested page of items', () => {
    const result = paginate(items, 1, 2)

    expect(result).toEqual({
      count: 5,
      next: '2',
      previous: null,
      results: items.slice(0, 2),
    })
  })

  it('returns the correct items for subsequent pages', () => {
    const result = paginate(items, 2, 2)

    expect(result).toEqual({
      count: 5,
      next: '3',
      previous: '1',
      results: items.slice(2, 4),
    })
  })

  it('returns the remaining items on the last page', () => {
    const result = paginate(items, 3, 2)

    expect(result).toEqual({
      count: 5,
      next: null,
      previous: '2',
      results: [items[4]],
    })
  })

  it('returns an empty results array when the requested page exceeds the total pages', () => {
    const result = paginate(items, 4, 2)

    expect(result).toEqual({
      count: 5,
      next: null,
      previous: null,
      results: [],
    })
  })

  it('returns an empty paginated response when there are no items', () => {
    const result = paginate([], 1, 10)

    expect(result).toEqual({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
  })

  it('returns all items when the page size exceeds the item count', () => {
    const result = paginate(items, 1, 10)

    expect(result).toEqual({
      count: 5,
      next: null,
      previous: null,
      results: items,
    })
  })

  it('supports a page size of one', () => {
    const result = paginate(items, 2, 1)

    expect(result).toEqual({
      count: 5,
      next: '3',
      previous: '1',
      results: [items[1]],
    })
  })

  it('throws an error when the page is less than one', () => {
    expect(() => paginate(items, 0, 2)).toThrow('Page must be a positive integer.')
  })

  it('throws an error when the page is not an integer', () => {
    expect(() => paginate(items, 1.5, 2)).toThrow('Page must be a positive integer.')
  })

  it('throws an error when the page size is less than one', () => {
    expect(() => paginate(items, 1, 0)).toThrow('Page size must be a positive integer.')
  })

  it('throws an error when the page size is not an integer', () => {
    expect(() => paginate(items, 1, 2.5)).toThrow('Page size must be a positive integer.')
  })
})
