import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AdminGeneralAnalysis } from '@/api/modules/analysis'

import DashboardView from '../index.vue'

// --- Mocks -------------------------------------------------------------

const mockGetAdminGeneralAnalysis = vi.hoisted(() => vi.fn<() => Promise<AdminGeneralAnalysis>>())

const mockNotifyError = vi.hoisted(() => vi.fn<(message: string) => void>())

vi.mock('@/api/modules/analysis', () => ({
  getAdminGeneralAnalysis: mockGetAdminGeneralAnalysis,
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: () => ({
    $notifyError: mockNotifyError,
  }),
}))

// --- Helpers -----------------------------------------------------------

const mockAnalysis: AdminGeneralAnalysis = {
  users: {
    total: 120,
    customers: 90,
    internal: 30,
  },
  smartpacks: {
    total: 45,
    assigned: 30,
    unassigned: 15,
  },
}

const mountView = () => mount(DashboardView)

// --- Tests -------------------------------------------------------------

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetAdminGeneralAnalysis.mockResolvedValue(mockAnalysis)
  })

  describe('fetching the analysis', () => {
    it('fetches the general analysis once when mounted', async () => {
      mountView()

      await flushPromises()

      expect(mockGetAdminGeneralAnalysis).toHaveBeenCalledTimes(1)
    })

    it('does not notify an error when the request succeeds', async () => {
      mountView()

      await flushPromises()

      expect(mockNotifyError).not.toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('shows loading placeholders for every card while the request is pending', async () => {
      mockGetAdminGeneralAnalysis.mockReturnValue(new Promise<AdminGeneralAnalysis>(() => {}))

      const wrapper = mountView()

      await nextTick()

      expect(wrapper.findAll('.dashboard-card')).toHaveLength(6)
      expect(wrapper.findAll('.loading-animation')).toHaveLength(6)
      expect(wrapper.text()).not.toContain('120')
    })

    it('removes the loading placeholders once the request completes', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.findAll('.loading-animation')).toHaveLength(0)
    })
  })

  describe('rendering', () => {
    it('renders the section headings', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('User Summary')
      expect(wrapper.text()).toContain('SmartPack Summary')
    })

    it('renders six summary cards', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.findAll('.dashboard-card')).toHaveLength(6)
    })

    it('renders the user summary cards with their values', async () => {
      const wrapper = mountView()

      await flushPromises()

      const cards = wrapper.findAll('.dashboard-card').slice(0, 3)

      expect(cards[0]?.text()).toContain('Total Users')
      expect(cards[0]?.text()).toContain('120')

      expect(cards[1]?.text()).toContain('Customers')
      expect(cards[1]?.text()).toContain('90')

      expect(cards[2]?.text()).toContain('Internal Users')
      expect(cards[2]?.text()).toContain('30')
    })

    it('renders the SmartPack summary cards with their values', async () => {
      const wrapper = mountView()

      await flushPromises()

      const cards = wrapper.findAll('.dashboard-card').slice(3)

      expect(cards[0]?.text()).toContain('Total SmartPacks')
      expect(cards[0]?.text()).toContain('45')

      expect(cards[1]?.text()).toContain('Assigned')
      expect(cards[1]?.text()).toContain('30')

      expect(cards[2]?.text()).toContain('Unassigned')
      expect(cards[2]?.text()).toContain('15')
    })

    it('renders an icon in every card', async () => {
      const wrapper = mountView()

      await flushPromises()

      wrapper.findAll('.dashboard-card').forEach((card) => {
        expect(card.find('.dashboard-icon').exists()).toBe(true)
      })
    })
  })

  describe('error handling', () => {
    it('notifies the error message when the request fails', async () => {
      mockGetAdminGeneralAnalysis.mockRejectedValue(new Error('Server unavailable'))

      mountView()

      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledExactlyOnceWith('Server unavailable')
    })

    it('falls back to a default message for non-Error rejections', async () => {
      mockGetAdminGeneralAnalysis.mockRejectedValue('boom')

      mountView()

      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledExactlyOnceWith('Failed to fetch dashboard analysis')
    })

    it('stops loading and shows zero values after a failure', async () => {
      mockGetAdminGeneralAnalysis.mockRejectedValue(new Error('Server unavailable'))

      const wrapper = mountView()

      await flushPromises()

      const cards = wrapper.findAll('.dashboard-card')

      expect(wrapper.findAll('.loading-animation')).toHaveLength(0)
      expect(cards).toHaveLength(6)

      cards.forEach((card) => {
        expect(card.text()).toContain('0')
      })
    })
  })
})
