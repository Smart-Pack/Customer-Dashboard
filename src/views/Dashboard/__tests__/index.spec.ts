import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VueApexCharts from 'vue3-apexcharts'

import HomeView from '../index.vue'
import UserGroupIcon from '@/components/Icons/UserGroupIcon.vue'
import UserIcon from '@/components/Icons/UserIcon.vue'
import BackPackIcon from '@/components/Icons/BackPackIcon.vue'
import ScaleIcon from '@/components/Icons/ScaleIcon.vue'
import WalkingIcon from '@/components/Icons/WalkingIcon.vue'

import type { UserGroup } from '@/api/modules/users'
import type { SmartPack, SmartPackSensorMeasurement } from '@/api/modules/smartpacks'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

type PageParams = {
  page: number
}

type MeasurementParams = PageParams & {
  smartpack: number
  timestamp_gte: string
  timestamp_lte: string
}

type AuthUser = { groups?: unknown } | null

type ChartType = 'donut' | 'line' | 'bar'

type ChartSeries = { name: string; data: number[] }

type ChartOptions = {
  labels?: string[]
  xaxis?: { categories?: string[] }
  yaxis?: { labels?: { formatter: (value: number) => string } }
  tooltip?: { y?: { formatter: (value: number) => string } }
  plotOptions?: {
    pie?: {
      donut?: {
        labels?: {
          total?: { label?: string; formatter?: () => string }
        }
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  state: {
    loggedInUser: null as AuthUser,
  },

  listSmartPacks: vi.fn<(params: PageParams) => Promise<PaginatedResponse<SmartPack>>>(),
  listMeasurements:
    vi.fn<(params: MeasurementParams) => Promise<PaginatedResponse<SmartPackSensorMeasurement>>>(),

  getStepsDelta:
    vi.fn<(current: SmartPackSensorMeasurement, previous: SmartPackSensorMeasurement) => number>(),
}))

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => ({
    get loggedInUser() {
      return mocks.state.loggedInUser
    },
  }),
}))

vi.mock('@/api/modules', () => ({
  default: {
    smartpacks: {
      list: mocks.listSmartPacks,
      listSensorMeasurements: mocks.listMeasurements,
    },
  },
}))

vi.mock('@/api/modules/smartpacks', () => ({
  getStepsDelta: mocks.getStepsDelta,
}))

// Charts are not rendered in jsdom. They are stubbed so that tests can inspect
// the props (type, series, options) the dashboard passes to them.
vi.mock('vue3-apexcharts', () => ({
  default: {
    name: 'VueApexCharts',
    props: ['type', 'height', 'options', 'series'],
    render: () => null,
  },
}))

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

// Wednesday, 28 October 2026 at noon (local time). The default 7 day range is
// therefore 22 Oct - 28 Oct, and the 30 day range starts on 29 Sep.
const NOW = new Date(2026, 9, 28, 12, 0, 0)

// Owner and admin memberships count as "Admin": 2 admin, 2 regular.
const mockGroups = [
  { id: 1, role: 'owner' },
  { id: 2, role: 'admin' },
  { id: 3, role: 'member' },
  { id: 4, role: 'member' },
] as unknown as UserGroup[]

// 1 assigned, 2 unassigned (empty and whitespace-only child names).
const mockSmartPacks = [
  { id: 101, imei: '111111111111111', child_name: 'Amina' },
  { id: 102, imei: '222222222222222', child_name: '' },
  { id: 103, imei: '333333333333333', child_name: '   ' },
] as unknown as SmartPack[]

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const paginate = <T>(results: T[], next: string | null = null): PaginatedResponse<T> => ({
  count: results.length,
  next,
  previous: null,
  results,
})

const localIso = (month: number, day: number, hour = 12): string =>
  new Date(2026, month - 1, day, hour).toISOString()

const measurement = (
  timestamp: string,
  weight: number | string,
  steps: number | string,
): SmartPackSensorMeasurement =>
  ({ timestamp, weight, steps }) as unknown as SmartPackSensorMeasurement

const formatLabel = (date: Date): string =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)

// Labels for the last `days` days, ending on NOW.
const expectedLabels = (days: number): string[] =>
  Array.from({ length: days }, (_, index) =>
    formatLabel(new Date(2026, 9, 28 - (days - 1) + index)),
  )

const createDeferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

// Measurements returned by the mocked API, keyed by SmartPack ID.
let measurementsByPack: Record<number, SmartPackSensorMeasurement[]> = {}

const mountHomeView = async (): Promise<VueWrapper> => {
  const wrapper = shallowMount(HomeView)

  await flushPromises()

  return wrapper
}

const findStatCard = (wrapper: VueWrapper, label: string): Element | null => {
  const heading = wrapper.findAll('h3, h4').find((candidate) => candidate.text().trim() === label)

  if (!heading) {
    throw new Error(`Stat "${label}" was not found`)
  }

  return heading.element.closest('.dashboard-card')
}

const getStatValue = (wrapper: VueWrapper, label: string): string | null =>
  findStatCard(wrapper, label)?.querySelector('span.font-bold')?.textContent?.trim() ?? null

const isStatLoading = (wrapper: VueWrapper, label: string): boolean =>
  findStatCard(wrapper, label)?.querySelector('.loading-animation') != null

const getOptions = (chart: { props: (key: string) => unknown }): ChartOptions =>
  chart.props('options') as ChartOptions

const findChart = (wrapper: VueWrapper, type: ChartType, firstLabel?: string) =>
  wrapper.findAllComponents(VueApexCharts).find((chart) => {
    if (chart.props('type') !== type) {
      return false
    }

    return firstLabel === undefined || getOptions(chart).labels?.[0] === firstLabel
  })

const requireChart = (wrapper: VueWrapper, type: ChartType, firstLabel?: string) => {
  const chart = findChart(wrapper, type, firstLabel)

  if (!chart) {
    throw new Error(`Chart "${type}${firstLabel ? ` / ${firstLabel}` : ''}" was not found`)
  }

  return chart
}

const getSeries = (wrapper: VueWrapper, type: ChartType): ChartSeries[] =>
  requireChart(wrapper, type).props('series') as ChartSeries[]

const setSmartPack = async (wrapper: VueWrapper, value: number | string): Promise<void> => {
  await wrapper.findAll('select')[0]!.setValue(value)
  await flushPromises()
}

const setDateRange = async (wrapper: VueWrapper, value: number): Promise<void> => {
  await wrapper.findAll('select')[1]!.setValue(value)
  await flushPromises()
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('HomeView', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Only Date is faked so that flushPromises keeps working.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)

    vi.spyOn(console, 'error').mockImplementation(() => {})

    mocks.state.loggedInUser = { groups: mockGroups }

    measurementsByPack = {
      101: [
        measurement(localIso(10, 27, 8), 2000, 1000),
        measurement(localIso(10, 27, 16), 3000, 1500),
        measurement(localIso(10, 28, 9), 4000, 1800),
      ],
    }

    mocks.listSmartPacks.mockResolvedValue(paginate(mockSmartPacks))
    mocks.listMeasurements.mockImplementation(async ({ smartpack }) =>
      paginate(measurementsByPack[smartpack] ?? []),
    )

    // Mirrors the real helper: decreases in the counter are clamped to 0.
    mocks.getStepsDelta.mockImplementation((current, previous) =>
      Math.max(0, Number(current.steps) - Number(previous.steps)),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('rendering', () => {
    it('renders the dashboard heading and description', async () => {
      const wrapper = await mountHomeView()

      expect(wrapper.find('h1').text()).toBe('Dashboard')
      expect(wrapper.text()).toContain(
        'An overview of your groups, SmartPacks, backpack load, and steps.',
      )
    })

    it('renders every section of the dashboard', async () => {
      const wrapper = await mountHomeView()

      expect(wrapper.text()).toContain('Group Memberships')
      expect(wrapper.text()).toContain('SmartPack Assignments')
      expect(wrapper.text()).toContain('Activity Analytics')
      expect(wrapper.text()).toContain('Backpack Load Analysis')
      expect(wrapper.text()).toContain('Daily Steps')
    })

    it('renders the dashboard icons', async () => {
      const wrapper = await mountHomeView()

      expect(wrapper.findAllComponents(UserGroupIcon)).toHaveLength(1)
      expect(wrapper.findAllComponents(UserIcon)).toHaveLength(1)
      expect(wrapper.findAllComponents(BackPackIcon)).toHaveLength(3)
      expect(wrapper.findAllComponents(ScaleIcon)).toHaveLength(2)
      expect(wrapper.findAllComponents(WalkingIcon)).toHaveLength(3)
    })

    it('renders the donut, line and bar charts', async () => {
      const wrapper = await mountHomeView()

      expect(findChart(wrapper, 'donut', 'Admin')).toBeDefined()
      expect(findChart(wrapper, 'donut', 'Assigned to a child')).toBeDefined()
      expect(findChart(wrapper, 'line')).toBeDefined()
      expect(findChart(wrapper, 'bar')).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Group memberships
  // ---------------------------------------------------------------------------

  describe('group memberships', () => {
    it('displays the total number of group memberships', async () => {
      const wrapper = await mountHomeView()

      expect(getStatValue(wrapper, 'Group memberships')).toBe('4')
    })

    it('counts owner and admin roles as Admin', async () => {
      const wrapper = await mountHomeView()

      expect(getStatValue(wrapper, 'Admin memberships')).toBe('2')
      expect(getStatValue(wrapper, 'Admin')).toBe('2')
    })

    it('counts member roles as Regular member', async () => {
      const wrapper = await mountHomeView()

      expect(getStatValue(wrapper, 'Regular member')).toBe('2')
    })

    it('passes the role breakdown to the donut chart', async () => {
      const wrapper = await mountHomeView()

      const chart = requireChart(wrapper, 'donut', 'Admin')
      const options = getOptions(chart)

      expect(chart.props('series')).toEqual([2, 2])
      expect(options.labels).toEqual(['Admin', 'Regular member'])
      expect(options.plotOptions?.pie?.donut?.labels?.total?.label).toBe('Groups')
      expect(options.plotOptions?.pie?.donut?.labels?.total?.formatter?.()).toBe('4')
    })

    it.each([null, {}, { groups: null }, { groups: 'invalid' }])(
      'shows an empty state when the logged in user is %j',
      async (loggedInUser) => {
        mocks.state.loggedInUser = loggedInUser

        const wrapper = await mountHomeView()

        expect(getStatValue(wrapper, 'Group memberships')).toBe('0')
        expect(getStatValue(wrapper, 'Admin memberships')).toBe('0')
        expect(getStatValue(wrapper, 'Regular member')).toBe('0')
        expect(wrapper.text()).toContain('No group memberships available')
        expect(findChart(wrapper, 'donut', 'Admin')).toBeUndefined()
      },
    )

    it('does not wait for SmartPacks before showing memberships', async () => {
      mocks.listSmartPacks.mockReturnValueOnce(
        createDeferred<PaginatedResponse<SmartPack>>().promise,
      )

      const wrapper = await mountHomeView()

      expect(getStatValue(wrapper, 'Group memberships')).toBe('4')
      expect(isStatLoading(wrapper, 'Group memberships')).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // SmartPacks
  // ---------------------------------------------------------------------------

  describe('smartpacks', () => {
    it('fetches the first page of SmartPacks on mount', async () => {
      await mountHomeView()

      expect(mocks.listSmartPacks).toHaveBeenCalledExactlyOnceWith({ page: 1 })
    })

    it('fetches every page of SmartPacks', async () => {
      mocks.listSmartPacks.mockReset()
      mocks.listSmartPacks
        .mockResolvedValueOnce(paginate([mockSmartPacks[0]!], 'https://api.test/?page=2'))
        .mockResolvedValueOnce(paginate([mockSmartPacks[1]!], 'https://api.test/?page=3'))
        .mockResolvedValueOnce(paginate([mockSmartPacks[2]!]))

      const wrapper = await mountHomeView()

      expect(mocks.listSmartPacks).toHaveBeenCalledTimes(3)
      expect(mocks.listSmartPacks).toHaveBeenNthCalledWith(1, { page: 1 })
      expect(mocks.listSmartPacks).toHaveBeenNthCalledWith(2, { page: 2 })
      expect(mocks.listSmartPacks).toHaveBeenNthCalledWith(3, { page: 3 })
      expect(getStatValue(wrapper, 'Total SmartPacks')).toBe('3')
    })

    it('displays the total number of SmartPacks', async () => {
      const wrapper = await mountHomeView()

      expect(getStatValue(wrapper, 'Total SmartPacks')).toBe('3')
    })

    it('counts SmartPacks with a child name as assigned', async () => {
      const wrapper = await mountHomeView()

      expect(getStatValue(wrapper, 'Assigned to children')).toBe('1')
      expect(getStatValue(wrapper, 'Assigned')).toBe('1')
    })

    it('counts empty, whitespace-only and missing child names as unassigned', async () => {
      mocks.listSmartPacks.mockResolvedValue(
        paginate([
          ...mockSmartPacks,
          { id: 104, imei: '444444444444444', child_name: null },
        ] as unknown as SmartPack[]),
      )

      const wrapper = await mountHomeView()

      expect(getStatValue(wrapper, 'Total SmartPacks')).toBe('4')
      expect(getStatValue(wrapper, 'Unassigned')).toBe('3')
    })

    it('passes the assignment breakdown to the donut chart', async () => {
      const wrapper = await mountHomeView()

      const chart = requireChart(wrapper, 'donut', 'Assigned to a child')
      const options = getOptions(chart)

      expect(chart.props('series')).toEqual([1, 2])
      expect(options.labels).toEqual(['Assigned to a child', 'No child assigned'])
      expect(options.plotOptions?.pie?.donut?.labels?.total?.label).toBe('SmartPacks')
      expect(options.plotOptions?.pie?.donut?.labels?.total?.formatter?.()).toBe('3')
    })

    it('shows an empty state when there are no SmartPacks', async () => {
      mocks.listSmartPacks.mockResolvedValue(paginate<SmartPack>([]))

      const wrapper = await mountHomeView()

      expect(getStatValue(wrapper, 'Total SmartPacks')).toBe('0')
      expect(wrapper.text()).toContain('No SmartPacks available')
      expect(findChart(wrapper, 'donut', 'Assigned to a child')).toBeUndefined()
    })

    it('does not fetch measurements when there are no SmartPacks', async () => {
      mocks.listSmartPacks.mockResolvedValue(paginate<SmartPack>([]))

      await mountHomeView()

      expect(mocks.listMeasurements).not.toHaveBeenCalled()
    })

    it('shows loading placeholders while SmartPacks are loading', async () => {
      const deferred = createDeferred<PaginatedResponse<SmartPack>>()
      mocks.listSmartPacks.mockReturnValueOnce(deferred.promise)

      const wrapper = await mountHomeView()

      expect(isStatLoading(wrapper, 'Total SmartPacks')).toBe(true)
      expect(isStatLoading(wrapper, 'Assigned to children')).toBe(true)
      expect(getStatValue(wrapper, 'Total SmartPacks')).toBeNull()
      expect(findChart(wrapper, 'donut', 'Assigned to a child')).toBeUndefined()
      expect(mocks.listMeasurements).not.toHaveBeenCalled()

      deferred.resolve(paginate(mockSmartPacks))
      await flushPromises()

      expect(isStatLoading(wrapper, 'Total SmartPacks')).toBe(false)
      expect(getStatValue(wrapper, 'Total SmartPacks')).toBe('3')
      expect(getStatValue(wrapper, 'Assigned to children')).toBe('1')
    })

    it('shows an error when SmartPacks fail to load', async () => {
      mocks.listSmartPacks.mockRejectedValueOnce(new Error('Network error'))

      const wrapper = await mountHomeView()

      expect(wrapper.text()).toContain('Unable to load SmartPacks. Please try again.')
      expect(findChart(wrapper, 'donut', 'Assigned to a child')).toBeUndefined()
      expect(console.error).toHaveBeenCalled()
    })

    it('does not fetch measurements when SmartPacks fail to load', async () => {
      mocks.listSmartPacks.mockRejectedValueOnce(new Error('Network error'))

      await mountHomeView()

      expect(mocks.listMeasurements).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  describe('filters', () => {
    it('defaults to all SmartPacks and the last 7 days', async () => {
      const wrapper = await mountHomeView()

      const [smartPackSelect, dateRangeSelect] = wrapper.findAll('select')

      expect((smartPackSelect!.element as HTMLSelectElement).value).toBe('all')
      expect((dateRangeSelect!.element as HTMLSelectElement).value).toBe('7')
    })

    it('lists every SmartPack in the selector', async () => {
      const wrapper = await mountHomeView()

      const options = wrapper
        .findAll('select')[0]!
        .findAll('option')
        .map((option) => option.text())

      expect(options).toHaveLength(4)
      expect(options[0]).toBe('All SmartPacks')
    })

    it('labels SmartPacks with the child name, falling back to the IMEI', async () => {
      const wrapper = await mountHomeView()

      const options = wrapper
        .findAll('select')[0]!
        .findAll('option')
        .map((option) => option.text())

      expect(options).toContain('Amina')
      expect(options).toContain('222222222222222')
      expect(options).toContain('333333333333333')
    })

    it('offers 7 and 30 day date ranges', async () => {
      const wrapper = await mountHomeView()

      const options = wrapper
        .findAll('select')[1]!
        .findAll('option')
        .map((option) => option.text())

      expect(options).toEqual(['Last 7 days', 'Last 30 days'])
    })

    it('disables the SmartPack selector while SmartPacks are loading', async () => {
      const deferred = createDeferred<PaginatedResponse<SmartPack>>()
      mocks.listSmartPacks.mockReturnValueOnce(deferred.promise)

      const wrapper = await mountHomeView()

      const select = () => wrapper.findAll('select')[0]!.element as HTMLSelectElement

      expect(select().disabled).toBe(true)

      deferred.resolve(paginate(mockSmartPacks))
      await flushPromises()

      expect(select().disabled).toBe(false)
    })

    it('fetches measurements for the selected SmartPack only', async () => {
      const wrapper = await mountHomeView()

      mocks.listMeasurements.mockClear()

      await setSmartPack(wrapper, 102)

      expect(mocks.listMeasurements).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ smartpack: 102 }),
      )
    })

    it('updates the stats when a SmartPack without data is selected', async () => {
      const wrapper = await mountHomeView()

      expect(getStatValue(wrapper, 'Measurements recorded')).toBe('3')

      await setSmartPack(wrapper, 102)

      expect(getStatValue(wrapper, 'Measurements recorded')).toBe('0')
      expect(getStatValue(wrapper, 'Average daily load')).toBe('0.00 kg')
      expect(getStatValue(wrapper, 'Total steps')).toBe('0')
    })

    it('does not reload SmartPacks when a filter changes', async () => {
      const wrapper = await mountHomeView()

      await setSmartPack(wrapper, 101)
      await setDateRange(wrapper, 30)

      expect(mocks.listSmartPacks).toHaveBeenCalledTimes(1)
    })

    it('refetches measurements for the new range when the date range changes', async () => {
      const wrapper = await mountHomeView()

      mocks.listMeasurements.mockClear()

      await setDateRange(wrapper, 30)

      expect(mocks.listMeasurements).toHaveBeenCalledTimes(3)
      expect(mocks.listMeasurements).toHaveBeenCalledWith({
        page: 1,
        smartpack: 101,
        timestamp_gte: new Date(2026, 8, 29, 0, 0, 0, 0).toISOString(),
        timestamp_lte: new Date(2026, 9, 28, 23, 59, 59, 999).toISOString(),
      })
    })

    it('expands both charts to 30 days when the range changes', async () => {
      const wrapper = await mountHomeView()

      await setDateRange(wrapper, 30)

      expect(getSeries(wrapper, 'line')[0]!.data).toHaveLength(30)
      expect(getSeries(wrapper, 'bar')[0]!.data).toHaveLength(30)
      expect(getOptions(requireChart(wrapper, 'line')).xaxis?.categories).toEqual(
        expectedLabels(30),
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Fetching measurements
  // ---------------------------------------------------------------------------

  describe('measurements', () => {
    it('fetches measurements for every SmartPack on mount', async () => {
      await mountHomeView()

      expect(mocks.listMeasurements).toHaveBeenCalledTimes(3)

      for (const smartpack of mockSmartPacks) {
        expect(mocks.listMeasurements).toHaveBeenCalledWith(
          expect.objectContaining({ smartpack: smartpack.id }),
        )
      }
    })

    it('requests the selected date range from midnight to the end of today', async () => {
      await mountHomeView()

      expect(mocks.listMeasurements).toHaveBeenCalledWith({
        page: 1,
        smartpack: 101,
        timestamp_gte: new Date(2026, 9, 22, 0, 0, 0, 0).toISOString(),
        timestamp_lte: new Date(2026, 9, 28, 23, 59, 59, 999).toISOString(),
      })
    })

    it('fetches every page of measurements', async () => {
      mocks.listMeasurements.mockReset()
      mocks.listMeasurements.mockImplementation(async ({ smartpack, page }) => {
        if (smartpack !== 101) {
          return paginate<SmartPackSensorMeasurement>([])
        }

        return page === 1
          ? paginate([measurement(localIso(10, 28, 8), 1000, 100)], 'https://api.test/?page=2')
          : paginate([measurement(localIso(10, 28, 9), 1000, 200)])
      })

      const wrapper = await mountHomeView()

      expect(mocks.listMeasurements).toHaveBeenCalledWith(
        expect.objectContaining({ smartpack: 101, page: 2 }),
      )
      expect(getStatValue(wrapper, 'Measurements recorded')).toBe('2')
    })

    it('displays the number of measurements recorded', async () => {
      const wrapper = await mountHomeView()

      expect(getStatValue(wrapper, 'Measurements recorded')).toBe('3')
    })

    it('shows loading placeholders while measurements are loading', async () => {
      const deferred = createDeferred<PaginatedResponse<SmartPackSensorMeasurement>>()
      mocks.listMeasurements.mockReset()
      mocks.listMeasurements.mockReturnValue(deferred.promise)

      const wrapper = await mountHomeView()

      expect(isStatLoading(wrapper, 'Average daily load')).toBe(true)
      expect(isStatLoading(wrapper, 'Measurements recorded')).toBe(true)
      expect(isStatLoading(wrapper, 'Total steps')).toBe(true)
      expect(isStatLoading(wrapper, 'Average steps per active day')).toBe(true)
      expect(findChart(wrapper, 'line')).toBeUndefined()
      expect(findChart(wrapper, 'bar')).toBeUndefined()

      deferred.resolve(paginate<SmartPackSensorMeasurement>([]))
      await flushPromises()

      expect(isStatLoading(wrapper, 'Average daily load')).toBe(false)
      expect(findChart(wrapper, 'line')).toBeDefined()
      expect(findChart(wrapper, 'bar')).toBeDefined()
    })

    it('shows an error in both analytics sections when measurements fail to load', async () => {
      mocks.listMeasurements.mockRejectedValueOnce(new Error('Network error'))

      const wrapper = await mountHomeView()

      const errors = wrapper
        .findAll('p')
        .filter(
          (paragraph) =>
            paragraph.text() === 'Unable to load sensor measurements. Please try again.',
        )

      expect(errors).toHaveLength(2)
      expect(findChart(wrapper, 'line')).toBeUndefined()
      expect(findChart(wrapper, 'bar')).toBeUndefined()
      expect(console.error).toHaveBeenCalled()
    })

    it('clears the error after a successful reload', async () => {
      mocks.listMeasurements.mockRejectedValueOnce(new Error('Network error'))

      const wrapper = await mountHomeView()

      expect(wrapper.text()).toContain('Unable to load sensor measurements')

      await setDateRange(wrapper, 30)

      expect(wrapper.text()).not.toContain('Unable to load sensor measurements')
      expect(findChart(wrapper, 'line')).toBeDefined()
      expect(findChart(wrapper, 'bar')).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Backpack load
  // ---------------------------------------------------------------------------

  describe('backpack load', () => {
    it('averages the load per day and converts grams to kilograms', async () => {
      const wrapper = await mountHomeView()

      const [series] = getSeries(wrapper, 'line')

      expect(series!.name).toBe('Average load')
      // 27 Oct: (2 kg + 3 kg) / 2, 28 Oct: 4 kg.
      expect(series!.data).toEqual([0, 0, 0, 0, 0, 2.5, 4])
    })

    it('displays zero for days without measurements', async () => {
      const wrapper = await mountHomeView()

      const [series] = getSeries(wrapper, 'line')

      expect(series!.data.slice(0, 5)).toEqual([0, 0, 0, 0, 0])
    })

    it('averages the daily load only across days with measurements', async () => {
      const wrapper = await mountHomeView()

      // (2.5 + 4) / 2 - the five empty days are excluded.
      expect(getStatValue(wrapper, 'Average daily load')).toBe('3.25 kg')
    })

    it('shows 0.00 kg when there are no measurements', async () => {
      measurementsByPack = {}

      const wrapper = await mountHomeView()

      expect(getStatValue(wrapper, 'Average daily load')).toBe('0.00 kg')
      expect(getSeries(wrapper, 'line')[0]!.data).toEqual([0, 0, 0, 0, 0, 0, 0])
    })

    it('combines measurements from every SmartPack', async () => {
      measurementsByPack = {
        101: [measurement(localIso(10, 28, 8), 2000, 0)],
        102: [measurement(localIso(10, 28, 9), 4000, 0)],
      }

      const wrapper = await mountHomeView()

      expect(getSeries(wrapper, 'line')[0]!.data[6]).toBe(3)
    })

    it('ignores negative, non-numeric and undated measurements', async () => {
      measurementsByPack = {
        101: [
          measurement(localIso(10, 28, 8), 2000, 0),
          measurement(localIso(10, 28, 9), -500, 0),
          measurement(localIso(10, 28, 10), 'abc', 0),
          measurement('not-a-date', 9000, 0),
        ],
      }

      const wrapper = await mountHomeView()

      expect(getSeries(wrapper, 'line')[0]!.data[6]).toBe(2)
      expect(getStatValue(wrapper, 'Average daily load')).toBe('2.00 kg')
    })

    it('labels the x axis with the dates in the selected range', async () => {
      const wrapper = await mountHomeView()

      expect(getOptions(requireChart(wrapper, 'line')).xaxis?.categories).toEqual(expectedLabels(7))
    })

    it('formats the y axis and tooltip values in kilograms', async () => {
      const wrapper = await mountHomeView()

      const options = getOptions(requireChart(wrapper, 'line'))

      expect(options.yaxis?.labels?.formatter(2.456)).toBe('2.5 kg')
      expect(options.tooltip?.y?.formatter(2.456)).toBe('2.46 kg')
    })
  })

  // ---------------------------------------------------------------------------
  // Steps
  // ---------------------------------------------------------------------------

  describe('steps', () => {
    it('attributes step differences to the day of the later reading', async () => {
      const wrapper = await mountHomeView()

      const [series] = getSeries(wrapper, 'bar')

      expect(series!.name).toBe('Steps')
      // 27 Oct: 1500 - 1000, 28 Oct: 1800 - 1500.
      expect(series!.data).toEqual([0, 0, 0, 0, 0, 500, 300])
    })

    it('calculates differences using getStepsDelta', async () => {
      await mountHomeView()

      expect(mocks.getStepsDelta).toHaveBeenCalledTimes(2)
      expect(mocks.getStepsDelta).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ steps: 1500 }),
        expect.objectContaining({ steps: 1000 }),
      )
      expect(mocks.getStepsDelta).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ steps: 1800 }),
        expect.objectContaining({ steps: 1500 }),
      )
    })

    it('displays the total steps', async () => {
      const wrapper = await mountHomeView()

      expect(getStatValue(wrapper, 'Total steps')).toBe((800).toLocaleString())
    })

    it('averages steps across active days only', async () => {
      const wrapper = await mountHomeView()

      // 800 steps over 2 active days.
      expect(getStatValue(wrapper, 'Average steps per active day')).toBe((400).toLocaleString())
    })

    it('shows zero steps when there are no measurements', async () => {
      measurementsByPack = {}

      const wrapper = await mountHomeView()

      expect(getStatValue(wrapper, 'Total steps')).toBe('0')
      expect(getStatValue(wrapper, 'Average steps per active day')).toBe('0')
      expect(getSeries(wrapper, 'bar')[0]!.data).toEqual([0, 0, 0, 0, 0, 0, 0])
    })

    it('sorts readings by time before calculating differences', async () => {
      measurementsByPack = {
        101: [
          measurement(localIso(10, 28, 9), 1000, 1800),
          measurement(localIso(10, 27, 8), 1000, 1000),
          measurement(localIso(10, 27, 16), 1000, 1500),
        ],
      }

      const wrapper = await mountHomeView()

      expect(getSeries(wrapper, 'bar')[0]!.data).toEqual([0, 0, 0, 0, 0, 500, 300])
    })

    it('attributes the difference to the later day when readings cross midnight', async () => {
      measurementsByPack = {
        101: [
          measurement(localIso(10, 27, 23), 1000, 100),
          measurement(localIso(10, 28, 1), 1000, 400),
        ],
      }

      const wrapper = await mountHomeView()

      const { data } = getSeries(wrapper, 'bar')[0]!

      expect(data[5]).toBe(0)
      expect(data[6]).toBe(300)
    })

    it('ignores decreases in the step counter', async () => {
      measurementsByPack = {
        101: [
          measurement(localIso(10, 28, 8), 1000, 1000),
          measurement(localIso(10, 28, 9), 1000, 200),
          measurement(localIso(10, 28, 10), 1000, 500),
        ],
      }

      const wrapper = await mountHomeView()

      expect(getSeries(wrapper, 'bar')[0]!.data[6]).toBe(300)
      expect(getStatValue(wrapper, 'Total steps')).toBe('300')
    })

    it('calculates differences separately for each SmartPack', async () => {
      measurementsByPack = {
        101: [
          measurement(localIso(10, 28, 8), 1000, 100),
          measurement(localIso(10, 28, 9), 1000, 200),
        ],
        102: [
          measurement(localIso(10, 28, 8), 1000, 5000),
          measurement(localIso(10, 28, 9), 1000, 5050),
        ],
      }

      const wrapper = await mountHomeView()

      // 100 + 50, with no difference taken between the two SmartPacks.
      expect(getSeries(wrapper, 'bar')[0]!.data[6]).toBe(150)
      expect(mocks.getStepsDelta).toHaveBeenCalledTimes(2)
    })

    it('skips readings with invalid steps or timestamps', async () => {
      measurementsByPack = {
        101: [
          measurement(localIso(10, 28, 8), 1000, 100),
          measurement(localIso(10, 28, 9), 1000, -5),
          measurement(localIso(10, 28, 10), 1000, 'abc'),
          measurement('not-a-date', 1000, 999),
          measurement(localIso(10, 28, 11), 1000, 160),
        ],
      }

      const wrapper = await mountHomeView()

      expect(mocks.getStepsDelta).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ steps: 160 }),
        expect.objectContaining({ steps: 100 }),
      )
      expect(getSeries(wrapper, 'bar')[0]!.data[6]).toBe(60)
    })

    it('labels the x axis with the dates in the selected range', async () => {
      const wrapper = await mountHomeView()

      expect(getOptions(requireChart(wrapper, 'bar')).xaxis?.categories).toEqual(expectedLabels(7))
    })

    it('formats the y axis and tooltip values as step counts', async () => {
      const wrapper = await mountHomeView()

      const options = getOptions(requireChart(wrapper, 'bar'))

      expect(options.yaxis?.labels?.formatter(1234.4)).toBe((1234).toLocaleString())
      expect(options.tooltip?.y?.formatter(1234.4)).toBe(`${(1234).toLocaleString()} steps`)
    })
  })
})
