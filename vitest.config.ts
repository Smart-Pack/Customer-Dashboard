import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'

import { sharedConfig } from './vite.shared'

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude],
    },
  })
)
