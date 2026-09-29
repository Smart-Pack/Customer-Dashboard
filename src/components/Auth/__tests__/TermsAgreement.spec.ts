import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SmartPackLogoIcon from '@/components/Icons/SmartPackLogo.vue'
import TermsAgreement from '@/components/Auth/TermsAgreement.vue'

describe('TermsAgreement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mountComponent = () => shallowMount(TermsAgreement)

  it('renders the SmartPack logo', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent(SmartPackLogoIcon).exists()).toBe(true)
  })

  it('renders the terms and conditions heading', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('SMARTPACK TERMS AND CONDITIONS')
  })

  it('renders the effective date', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('Effective Date:')
    expect(wrapper.text()).toContain('09/16/2026')
  })

  it('renders the terms version', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('Version:')
    expect(wrapper.text()).toContain('1.0')
  })

  it('renders all terms sections', () => {
    const wrapper = mountComponent()

    const expectedSections = [
      '1. SERVICES OVERVIEW',
      '2. ACCOUNT & ACCESS',
      '3. SMARTPACK DEVICES',
      '4. DATA & PRIVACY',
      '5. SERVICE AVAILABILITY',
      '6. ACCEPTABLE USE',
      '7. CHANGES TO TERMS',
      '8. CONTACT',
    ]

    for (const section of expectedSections) {
      expect(wrapper.text()).toContain(section)
    }
  })

  it('renders the Accept terms button', () => {
    const wrapper = mountComponent()

    const button = wrapper.findAll('button').find((button) => button.text() === 'Accept terms')

    expect(button?.exists()).toBe(true)
  })

  it('renders the Cancel button', () => {
    const wrapper = mountComponent()

    const button = wrapper.findAll('button').find((button) => button.text() === 'Cancel')

    expect(button?.exists()).toBe(true)
  })

  it('emits confirmed with true when Accept terms is clicked', async () => {
    const wrapper = mountComponent()

    const button = wrapper.findAll('button').find((button) => button.text() === 'Accept terms')

    await button?.trigger('click')

    expect(wrapper.emitted('confirmed')).toEqual([[true]])
  })

  it('emits confirmed with false when Cancel is clicked', async () => {
    const wrapper = mountComponent()

    const button = wrapper.findAll('button').find((button) => button.text() === 'Cancel')

    await button?.trigger('click')

    expect(wrapper.emitted('confirmed')).toEqual([[false]])
  })

  it('renders the end of terms message', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('End of Terms and Conditions')
  })
})
