import fs from 'node:fs'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { os } from '@orpc/server'
import { SimpleCsrfProtectionHandlerPlugin } from '@orpc/server/plugins'
import { OpenAPIReferenceHandlerPlugin } from './openapi-reference'

const OUT = '/tmp/claude-1000/-home-dinwwwh-orpc--claude-worktrees-cors-plugin-default-origin-acf154/1a0aa5cf-2ae4-4cd2-8cb9-c811986e03d9/scratchpad/probe2.txt'
function log(...args: unknown[]) {
  fs.appendFileSync(OUT, `${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}\n`)
}

it('docs ui reachable with csrf plugin', async () => {
  fs.writeFileSync(OUT, '')
  const router = { ping: os.handler(() => 'pong') }

  for (const [label, plugins] of [
    ['[reference, csrf]', [new OpenAPIReferenceHandlerPlugin({ spec: {} as any }), new SimpleCsrfProtectionHandlerPlugin()]],
    ['[csrf, reference]', [new SimpleCsrfProtectionHandlerPlugin(), new OpenAPIReferenceHandlerPlugin({ spec: {} as any })]],
    ['[reference only]', [new OpenAPIReferenceHandlerPlugin({ spec: {} as any })]],
  ] as const) {
    const handler = new OpenAPIHandler(router, { plugins: plugins as any })
    // user opens the docs from a bookmark / address bar
    const res = await handler.handle(new Request('https://api.example.com/', {
      headers: { 'sec-fetch-site': 'none', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' },
    }))
    log(label, 'docs', res.response?.status)
  }
})
