import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import UserCreationForm from '@/components/Users/CreationForm.vue'
import CreationFormLayout, { type Adder } from '@/components/Base/CreationFormLayout.vue'
import { getUserSections } from '@/data/forms/userSections'

const mockUsersAdd = vi.fn<Adder>()

const mountForm = () =>
  mount(UserCreationForm, {
    global: {
      mocks: {
        $api: {
          users: {
            add: mockUsersAdd,
          },
        },
      },
      stubs: {
        CreationFormLayout: true,
      },
    },
  })

describe('UserCreationForm', () => {
  describe('rendering', () => {
    it('renders a CreationFormLayout', () => {
      const wrapper = mountForm()

      expect(wrapper.findComponent(CreationFormLayout).exists()).toBe(true)
    })

    it('passes the page heading, description, and resource name through', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('pageHeading')).toBe('Add User')
      expect(layout.props('pageDescription')).toBe(
        'Register a new user so they can access the platform.',
      )
      expect(layout.props('name')).toBe('User')
    })

    it('passes detailsPage as user-details', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('detailsPage')).toBe('user-details')
    })

    it('passes the users API add function as the adder', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('adder')).toBe(mockUsersAdd)
    })
  })

  describe('sections', () => {
    it('passes the sections returned by getUserSections', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('sections')).toEqual(getUserSections())
    })

    it('includes a Personal Details section with the expected fields', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)
      const sections = layout.props('sections') as Array<{
        title: string
        fields: Array<{ name: string }>
      }>

      const personalDetails = sections.find((section) => section.title === 'Personal Details')

      expect(personalDetails?.fields.map((field) => field.name)).toEqual([
        'first_name',
        'last_name',
        'email',
        'gender',
        'date_of_birth',
      ])
    })

    it('includes an Account Settings section with the expected fields', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)
      const sections = layout.props('sections') as Array<{
        title: string
        fields: Array<{ name: string }>
      }>

      const accountSettings = sections.find((section) => section.title === 'Account Settings')

      expect(accountSettings?.fields.map((field) => field.name)).toEqual(['role', 'phone'])
    })

    it('applies the min_age rule and DOB error label to date_of_birth', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)
      const sections = layout.props('sections') as Array<{
        title: string
        fields: Array<{ name: string; rules?: string; errorName?: string; type?: string }>
      }>

      const personalDetails = sections.find((section) => section.title === 'Personal Details')
      const dob = personalDetails?.fields.find((field) => field.name === 'date_of_birth')

      expect(dob?.rules).toBe('min_age:13')
      expect(dob?.errorName).toBe('DOB')
      expect(dob?.type).toBe('date')
    })

    it('assigns the correct specificType to each field', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)
      const sections = layout.props('sections') as Array<{
        fields: Array<{ name: string; specificType?: string }>
      }>

      const allFields = sections.flatMap((section) => section.fields)
      const byName = Object.fromEntries(allFields.map((field) => [field.name, field.specificType]))

      expect(byName).toEqual({
        first_name: 'fname',
        last_name: 'lname',
        email: 'email',
        gender: 'gender',
        date_of_birth: undefined,
        role: 'user',
        phone: 'phone',
      })
    })
  })
})
