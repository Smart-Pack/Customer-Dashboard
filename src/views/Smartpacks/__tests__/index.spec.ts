import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComponentPublicInstance } from 'vue'

import SmartPacksView from '@/views/Smartpacks/index.vue'

vi.mock('@/components/Smartpacks/Table.vue', () => ({
  default: {
    name: 'SmartPacksTable',
    props: ['refreshKey'],
    template: '<div class="smartpacks-table" />',
  },
}))

vi.mock('@/components/Smartpacks/ClaimModal.vue', () => ({
  default: {
    name: 'ClaimSmartPackModal',
    emits: ['close', 'claimed'],
    template: '<div class="claim-modal" />',
  },
}))

describe('SmartPacksView', () => {
  let wrapper: VueWrapper<ComponentPublicInstance> | undefined

  const mountView = (): VueWrapper<ComponentPublicInstance> => {
    wrapper = mount(SmartPacksView)

    return wrapper
  }

  const findClaimButton = () => wrapper!.find('button')
  const findModal = () => wrapper!.findComponent({ name: 'ClaimSmartPackModal' })
  const findTable = () => wrapper!.findComponent({ name: 'SmartPacksTable' })

  const openModal = async () => {
    await findClaimButton().trigger('click')
  }

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  describe('rendering', () => {
    it('renders the heading and the claim button', () => {
      mountView()

      expect(wrapper!.find('h2').text()).toBe('SmartPacks')
      expect(findClaimButton().text()).toBe('Claim SmartPack')
      expect(findClaimButton().attributes('disabled')).toBeUndefined()
    })

    it('renders the table with an initial refresh key of 0', () => {
      mountView()

      expect(findTable().exists()).toBe(true)
      expect(findTable().props('refreshKey')).toBe(0)
    })

    it('does not render the claim modal initially', () => {
      mountView()

      expect(findModal().exists()).toBe(false)
    })
  })

  describe('opening the claim modal', () => {
    it('shows the modal when the claim button is clicked', async () => {
      mountView()

      await openModal()

      expect(findModal().exists()).toBe(true)
    })

    it('disables the claim button while the modal is open', async () => {
      mountView()

      await openModal()

      expect(findClaimButton().attributes('disabled')).toBeDefined()
    })
  })

  describe('closing the claim modal', () => {
    it('hides the modal and re-enables the button when the modal emits close', async () => {
      mountView()

      await openModal()
      findModal().vm.$emit('close')
      await wrapper!.vm.$nextTick()

      expect(findModal().exists()).toBe(false)
      expect(findClaimButton().attributes('disabled')).toBeUndefined()
    })

    it('does not change the table refresh key when the modal is closed', async () => {
      mountView()

      await openModal()
      findModal().vm.$emit('close')
      await wrapper!.vm.$nextTick()

      expect(findTable().props('refreshKey')).toBe(0)
    })
  })

  describe('claiming a SmartPack', () => {
    it('hides the modal when the modal emits claimed', async () => {
      mountView()

      await openModal()
      findModal().vm.$emit('claimed')
      await wrapper!.vm.$nextTick()

      expect(findModal().exists()).toBe(false)
      expect(findClaimButton().attributes('disabled')).toBeUndefined()
    })

    it('increments the table refresh key when the modal emits claimed', async () => {
      mountView()

      await openModal()
      findModal().vm.$emit('claimed')
      await wrapper!.vm.$nextTick()

      expect(findTable().props('refreshKey')).toBe(1)
    })

    it('increments the refresh key on every successful claim', async () => {
      mountView()

      await openModal()
      findModal().vm.$emit('claimed')
      await wrapper!.vm.$nextTick()

      await openModal()
      findModal().vm.$emit('claimed')
      await wrapper!.vm.$nextTick()

      expect(findTable().props('refreshKey')).toBe(2)
    })
  })
})
