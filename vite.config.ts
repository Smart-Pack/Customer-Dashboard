import { defineConfig, loadEnv } from 'vite'

import { sharedConfig } from './vite.shared'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const port = Number(env.VITE_DEV_PORT) || 5173

  const allowedHosts = env.VITE_DEV_ALLOWED_HOSTS
    ? env.VITE_DEV_ALLOWED_HOSTS.split(',').map((host) => host.trim())
    : ['localhost', '127.0.0.1']

  return {
    ...sharedConfig,
    server: {
      port,
      allowedHosts,
    },
  }
})
