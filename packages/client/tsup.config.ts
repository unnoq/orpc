import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    openapi: 'src/openapi/index.ts',
    rpc: 'src/rpc/index.ts',
    fetch: 'src/adapters/fetch/index.ts',
  },
  sourcemap: true,
  clean: true,
  format: 'esm',
})
