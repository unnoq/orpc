import { addImports, addServerImports, defineNuxtModule } from '@nuxt/kit'

export interface ModuleOptions {
}

/**
 * The oRPC Nuxt module: registers auto-imports for oRPC helpers
 * in both the app (`createNuxtUtils`) and the server (`defineORPCEventHandler`).
 *
 * @see {@link https://orpc.dev/docs/integrations/nuxt | Nuxt Integration}
 */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@orpc/nuxt',
    configKey: 'orpc',
    compatibility: {
      nuxt: '>=3.15.0',
    },
  },
  setup() {
    addImports([
      { name: 'createNuxtUtils', as: 'createNuxtUtils', from: '@orpc/nuxt/client' },
    ])

    addServerImports([
      { name: 'defineORPCEventHandler', as: 'defineORPCEventHandler', from: '@orpc/nuxt/h3' },
    ])
  },
})
