<template>
  <div class="mt-4">
    <p class="secondary-text text-sm">Keep your personal and contact information up to date.</p>

    <!-- Profile Pic -->
    <div class="grid gap-4 md:grid-cols-2 my-4">
      <div class="px-2">
        <UserIcon v-if="!profilePic" class="w-48 h-48 lg:w-52 lg:h-52 primary-text" />

        <img
          v-else
          :src="withCacheBust(profilePic)"
          :key="profilePic"
          alt="Profile Picture"
          class="w-48 h-48 lg:w-52 lg:h-52 object-cover"
        />

        <input
          v-if="editProfileMode"
          ref="profilePicture"
          data-testid="profile-picture-input"
          type="file"
          accept="image/*"
          class="mt-4 form-submit-secondary p-2 text-sm w-56"
          @change="handleProfilePictureChange"
        />

        <p
          v-if="errors.profile_pic"
          data-testid="profile-picture-error"
          class="text-red-500 text-sm mt-1"
        >
          {{ errors.profile_pic }}
        </p>
      </div>
    </div>

    <button
      data-testid="edit-profile-button"
      type="button"
      class="form-submit px-5 py-2 text-sm font-semibold mx-auto mt-2 mb-2"
      :disabled="isActive || submitting"
      @click="toggleEditProfileMode"
    >
      {{ editProfileMode ? 'Cancel Editing' : 'Edit Profile' }}
    </button>

    <form class="space-y-6 mt-8" @submit.prevent="updateProfile">
      <section class="space-y-4">
        <h2 class="font-poppins tracking-[0.4em] uppercase underline secondary-text">
          Basic Information
        </h2>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="secondary-text font-semibold mb-1">First Name</label>

            <InputField
              v-model="user.first_name"
              name="first_name"
              specific-type="fname"
              :icon-right="activeIcon"
              :rules="editProfileMode ? 'required|alpha' : ''"
              :disabled="!editProfileMode"
              :input-class="viewInputClass"
            />
          </div>

          <div>
            <label class="secondary-text font-semibold mb-1">Last Name</label>

            <InputField
              v-model="user.last_name"
              name="last_name"
              specific-type="lname"
              :icon-right="activeIcon"
              :rules="editProfileMode ? 'required|alpha' : ''"
              :disabled="!editProfileMode"
              :input-class="viewInputClass"
            />
          </div>

          <div>
            <label class="secondary-text font-semibold mb-1">Gender</label>

            <InputField
              v-model="user.gender"
              name="gender"
              specific-type="gender"
              :icon-right="activeIcon"
              :rules="editProfileMode ? 'required' : ''"
              :disabled="!editProfileMode"
              :input-class="viewInputClass"
            />
          </div>

          <div>
            <label class="secondary-text font-semibold mb-1">Date of Birth</label>

            <InputField
              v-model="user.date_of_birth"
              name="date_of_birth"
              type="date"
              :icon-right="activeIcon"
              rules="required|min_age:18"
              :disabled="!editProfileMode"
              :input-class="viewInputClass"
              errorLabel="DOB"
            />
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="font-poppins tracking-[0.4em] uppercase underline secondary-text">
          Contact Information
        </h2>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="secondary-text font-semibold mb-1">Email</label>

            <InputField
              v-model="user.email"
              name="email"
              specific-type="email"
              placeholder="Email"
              :icon-right="markRaw(LockClosedIcon)"
              disabled
              input-class="!bg-page dark:!bg-page-dark !cursor-not-allowed"
            />
          </div>

          <div>
            <label class="secondary-text font-semibold mb-1">Phone</label>

            <InputField
              v-model="user.phone"
              name="phone"
              specific-type="phone"
              placeholder="Phone"
              :icon-right="activeIcon"
              :rules="editProfileMode ? 'required|phone_strict' : ''"
              :disabled="!editProfileMode"
              :input-class="viewInputClass"
            />
          </div>
        </div>
      </section>

      <div v-if="editProfileMode" class="flex justify-end">
        <button
          data-testid="save-profile-button"
          type="submit"
          class="form-submit px-6 py-2 text-sm font-semibold center-flex"
          :disabled="submitting"
        >
          <span>{{ submitting ? 'Saving...' : 'Save Changes' }}</span>

          <div v-if="submitting" class="ml-4 submit-spinner"></div>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
/**
 * @module components/Users/ProfileCard
 * @description Displays and manages the authenticated user's profile information.
 *
 * Provides profile viewing and editing functionality, including personal and
 * contact information updates, profile picture preview, and API validation
 * error handling.
 */
import { isAxiosError } from 'axios'
import { computed, markRaw, onMounted, reactive, ref } from 'vue'
import { useForm } from 'vee-validate'

import { editMe, getMe, type EditMePayload } from '@/api/modules/users'
import InputField from '@/components/Base/InputField.vue'
import LockClosedIcon from '@/components/Icons/LockClosedIcon.vue'
import LockOpenIcon from '@/components/Icons/LockOpenIcon.vue'
import UserIcon from '@/components/Icons/UserIcon.vue'
import { useGlobals } from '@/composables/useGlobals'
import { useAuthStore } from '@/stores'
import { withCacheBust } from '@/utils/urlSecurity'

defineOptions({
  name: 'ProfileCard',
})

type ProfileField = keyof EditMePayload

const profileFields: ProfileField[] = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'date_of_birth',
  'gender',
  'profile_pic',
]

const authStore = useAuthStore()
const { $notifySuccess, $notifyError } = useGlobals()

const editProfileMode = ref(false)
const isActive = ref(false)
const submitting = ref(false)

const profilePic = ref<string | null>(null)
const profilePicFile = ref<File | null>(null)
const profilePicture = ref<HTMLInputElement | null>(null)

const user = reactive({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  gender: '' as EditMePayload['gender'] | '',
})

const { errors, handleSubmit, resetForm, setFieldError } = useForm<EditMePayload>({
  initialValues: user as Partial<EditMePayload>,
})

const viewInputClass = computed(() => {
  return editProfileMode.value ? '' : '!bg-page dark:!bg-page-dark !cursor-not-allowed'
})

const activeIcon = computed(() => {
  return editProfileMode.value ? markRaw(LockOpenIcon) : markRaw(LockClosedIcon)
})

/**
 * Populates the profile form with the authenticated user's details.
 *
 * @param currentUser - The authenticated user's profile data.
 */
function setFormValues(currentUser: Awaited<ReturnType<typeof getMe>>): void {
  resetForm({
    values: {
      first_name: currentUser.first_name,
      last_name: currentUser.last_name,
      email: currentUser.email,
      phone: currentUser.phone,
      date_of_birth: currentUser.date_of_birth ?? '',
      gender: currentUser.gender,
    },
  })
}

/**
 * Fetches the authenticated user's profile and initializes the profile form.
 */
async function getProfile(): Promise<void> {
  isActive.value = true

  try {
    const currentUser = await getMe()

    authStore.setLoggedInUser(currentUser)
    profilePic.value = currentUser.profile_pic

    setFormValues(currentUser)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to load your profile.'

    $notifyError(message)
  } finally {
    isActive.value = false
  }
}

/**
 * Toggles profile editing mode.
 *
 * When editing is cancelled, restores the form and profile picture to the
 * currently authenticated user's saved values and clears any selected file.
 */
function toggleEditProfileMode(): void {
  editProfileMode.value = !editProfileMode.value

  if (!editProfileMode.value) {
    const currentUser = authStore.loggedInUser

    if (currentUser) {
      setFormValues(currentUser)
      profilePic.value = currentUser.profile_pic
    }

    profilePicFile.value = null
    setFieldError('profile_pic', undefined)

    if (profilePicture.value) {
      profilePicture.value.value = ''
    }
  }
}

/**
 * Handles profile picture selection without compression.
 *
 * @param event - The file input change event.
 */
function handleProfilePictureChange(event: Event): void {
  setFieldError('profile_pic', undefined)

  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null

  if (!file) {
    profilePicFile.value = null
    return
  }

  if (!file.type.startsWith('image/')) {
    $notifyError('Please select an image file.')

    input.value = ''
    profilePicFile.value = null

    return
  }

  if (file.size > 5 * 1024 * 1024) {
    $notifyError('Profile Picture must be less than 5 MB')

    input.value = ''
    profilePicFile.value = null

    return
  }

  if (profilePic.value?.startsWith('blob:')) {
    URL.revokeObjectURL(profilePic.value)
  }

  profilePicFile.value = file
  profilePic.value = URL.createObjectURL(file)
}

/**
 * Validates and submits the user's updated profile details.
 *
 * Updates the authentication store and local profile state after a
 * successful request, and maps API validation errors to their fields.
 */
const updateProfile = handleSubmit(async (values) => {
  submitting.value = true

  try {
    const payload: EditMePayload = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      phone: values.phone,
      date_of_birth: values.date_of_birth,
      gender: values.gender as EditMePayload['gender'],
      ...(profilePicFile.value ? { profile_pic: profilePicFile.value } : {}),
    }

    const updatedUser = await editMe(payload)

    authStore.setLoggedInUser(updatedUser)

    if (profilePic.value?.startsWith('blob:')) {
      URL.revokeObjectURL(profilePic.value)
    }

    profilePic.value = updatedUser.profile_pic
    profilePicFile.value = null
    editProfileMode.value = false

    setFormValues(updatedUser)

    if (profilePicture.value) {
      profilePicture.value.value = ''
    }

    $notifySuccess('My Profile Details Successfully updated.')
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.data) {
      const data = error.response.data

      if (typeof data === 'object' && data !== null) {
        Object.entries(data).forEach(([field, messages]) => {
          if (
            profileFields.includes(field as ProfileField) &&
            Array.isArray(messages) &&
            messages.length > 0
          ) {
            setFieldError(field as ProfileField, String(messages[0]))
          }
        })
      }
    }

    const message = error instanceof Error ? error.message : 'Unable to update your profile.'

    $notifyError(message)
  } finally {
    submitting.value = false
  }
})

/**
 * Loads the authenticated user's profile when the component is mounted.
 */
onMounted(async () => {
  await getProfile()
})
</script>
