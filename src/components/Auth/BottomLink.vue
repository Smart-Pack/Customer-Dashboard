<template>
  <div>
    <span class="secondary-text opacity-70 text-sm lg:text-base block">
      {{ accountPrompt }}
      <router-link :to="{ name: routeName }" class="auth-link">
        {{ actionText }}
      </router-link>
    </span>

    <GoogleLoginButton v-if="mode === 'signIn'" />
  </div>
</template>

<script lang="ts">
import GoogleLoginButton from './GoogleLoginButton.vue'

/**
 * @module components/Base/AuthCard
 * @description A highly reusable component that provides the account
 * navigation link displayed at the bottom of authentication forms.
 */
export default {
  name: 'AuthCardBottomLink',

  components: {
    GoogleLoginButton,
  },

  props: {
    /**
     * Determines whether the link prompts the user to sign in or sign up.
     */
    mode: {
      type: String,
      required: true,
      validator(value: string) {
        return ['create', 'signIn'].includes(value)
      },
    },
  },

  computed: {
    accountPrompt(): string {
      return this.mode === 'create' ? 'Already have an account?' : "Don't have an account yet?"
    },

    actionText(): string {
      return this.mode === 'create' ? 'Sign in' : 'Sign up'
    },

    routeName(): string {
      return this.mode === 'create' ? 'login' : 'signup'
    },
  },
}
</script>
