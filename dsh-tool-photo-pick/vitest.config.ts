import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['../../../../tsconfig.base.json'] })],
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      'dsh-photo-pick': fileURLToPath(new URL('../dsh-photo-pick/src/index.ts', import.meta.url)),
      'dsh-tool-photo-pick': fileURLToPath(new URL('../dsh-tool-photo-pick/src/index.ts', import.meta.url)),
    },
  },
})
