import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      globals: true,
      include: ['**/*.test.ts'],
    },
  },
  {
    test: {
      globals: true,
      setupFiles: ['./packages/openapi/vitest.setup.ts'],
      include: ['./packages/openapi/**/*.test.ts'],
    },
  },
  {
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./vitest.jsdom-react.ts'],
      include: ['./packages/next/**/*.test.tsx', './packages/react-query/**/*.test.tsx'],
    },
  },
])
