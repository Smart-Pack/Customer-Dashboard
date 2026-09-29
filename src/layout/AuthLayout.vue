<template>
  <div
    data-testid="auth-layout"
    class="w-full relative flex flex-col bg-auth-gradient dark:bg-auth-gradient-dark font-sans lg:flex-row lg:bg-none lg:bg-page-light"
    :class="screenSize ? 'h-[120%] overflow-y-auto' : 'h-full'"
  >
    <div
      v-if="uiStore.getSwalBackdrop"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1040]"
      aria-hidden="true"
    ></div>

    <!-- Right Image -->
    <aside class="w-full lg:w-1/2 lg:h-full lg:order-2 lg:relative" aria-label="Branding panel">
      <div class="flex justify-center lg:relative lg:z-10 lg:flex-col lg:items-center lg:mt-10">
        <div class="flex items-center gap-2">
          <SmartPackAuthLogoIcon class="h-16 w-16 md:h-20 md:w-20" />
          <h6 class="font-montserrat text-xl text-white text-center">SmartPack</h6>
        </div>
      </div>

      <div
        aria-hidden="true"
        class="hidden lg:block absolute inset-0 bg-auth-right bg-cover bg-[position:50%_10%] bg-no-repeat dark:bg-auth-right-dark"
      ></div>
    </aside>

    <!-- Auth login cards -->
    <main
      class="w-full lg:w-1/2 lg:h-full lg:order-1 lg:flex lg:flex-col lg:items-center lg:justify-center"
    >
      <router-view @change-size="handleChangeSize"></router-view>
    </main>

    <!-- Footer -->
    <footer
      class="absolute bottom-5 left-1/2 -translate-x-1/2 text-pwhite lg:left-1/4 lg:-translate-x-1/4 lg:text-primary dark:text-primary-dark font-bold"
    >
      © {{ year }} SMARTPACK
    </footer>
  </div>
</template>

<script lang="ts">
import { useUiStore } from '@/stores'
import SmartPackAuthLogoIcon from '@/components/Icons/SmartPackAuthLogo.vue'

/**
 * @module layout/AuthLayout
 * @description This layout component provides the structure for all
 * authentication-related pages.
 */
export default {
  name: 'AuthLayout',

  components: {
    SmartPackAuthLogoIcon,
  },

  data() {
    return {
      /**
       * The current year, used in the footer copyright.
       *
       * @type {number}
       */
      year: new Date().getFullYear(),

      /**
       * Controls the layout height for pages that require additional space.
       *
       * @type {boolean}
       */
      screenSize: false,
    }
  },

  setup() {
    const uiStore = useUiStore()

    return {
      uiStore,
    }
  },

  /**
   * Lifecycle hook called after the component is mounted.
   */
  mounted() {
    this.uiStore.updateSwalBackdrop(false)

    document.documentElement.classList.toggle('dark', !this.uiStore.getIsLightMode)
  },

  methods: {
    /**
     * Handle layout size changes emitted by child authentication pages.
     *
     * @param {boolean} value
     */
    handleChangeSize(value: boolean): void {
      this.screenSize = value
    },
  },

  watch: {
    /**
     * Watches the current theme state and synchronizes the dark class
     * on the document element.
     *
     * @param {boolean} isLight
     */
    'uiStore.getIsLightMode'(isLight) {
      document.documentElement.classList.toggle('dark', !isLight)
    },
  },
}
</script>

<style scoped></style>
