import { defineConfig } from '@solidjs/start/config'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  vite: {
    plugins: [
      // TODO: remove `as any`
      topLevelAwait() as any,
    ],
  },
})
