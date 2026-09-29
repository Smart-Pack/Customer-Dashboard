<template>
  <footer class="flex primary-text justify-center font-bold">
    © {{ year }}
    SMARTPACK
  </footer>
</template>
<script lang="ts">
/**
 * @module layout/Dashboard/ContentFooter
 * @description This component displays the application's footer with copyright information.
 */
export default {
  data() {
    return {
      /**
       * The current year, used in the copyright notice.
       * @type {number}
       */
      year: new Date().getFullYear(),
    }
  },
}
</script>
<style></style>
