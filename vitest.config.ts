import { defineConfig } from 'vitest/config'

const sourceConditions = ['medusa-source']

export default defineConfig({
  resolve: { conditions: sourceConditions },
  ssr: { resolve: { conditions: sourceConditions } },
  test: {
    // Credo loads native Askar bindings, which are not safe to share across worker threads.
    pool: 'forks',
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['packages/*/test/**/*.test.ts'], exclude: ['**/*.e2e.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['packages/*/test/**/*.e2e.test.ts'],
          testTimeout: 60_000,
        },
      },
    ],
  },
})
