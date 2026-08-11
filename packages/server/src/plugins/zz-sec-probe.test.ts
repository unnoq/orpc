import fs from 'node:fs'
import { RPCHandler } from '../adapters/fetch/rpc-handler'
import { RPC_DEFAULT_ALLOW_METHODS } from '../adapters/standard'
import { os } from '../builder'
import { CORSHandlerPlugin } from './cors'
import { SimpleCsrfProtectionHandlerPlugin } from './simple-csrf-protection'

const OUT = '/tmp/claude-1000/-home-dinwwwh-orpc--claude-worktrees-cors-plugin-default-origin-acf154/1a0aa5cf-2ae4-4cd2-8cb9-c811986e03d9/scratchpad/probe.txt'
function log(...args: unknown[]) {
  fs.appendFileSync(OUT, `${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}\n`)
}

const del = vi.fn(() => 'deleted')
const router = { deletePlanet: os.handler(del) }

function h(csrfOptions: any = {}, extra: any[] = []) {
  return new RPCHandler(router, {
    allowMethods: ['GET', ...RPC_DEFAULT_ALLOW_METHODS],
    plugins: [new SimpleCsrfProtectionHandlerPlugin(csrfOptions), ...extra],
  })
}

beforeAll(() => fs.writeFileSync(OUT, ''))

it('a: same-origin img smuggled url is allowed by DEFAULT config', async () => {
  del.mockClear()
  const { response } = await h().handle(new Request('https://api.example.com/deletePlanet', {
    headers: { 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'no-cors', 'sec-fetch-dest': 'image' },
  }))
  log('A status', response?.status, 'handler-called', del.mock.calls.length)
})

it('b: empty-string entry in allowlist lets in cross-site requests with no Origin', async () => {
  const cases: Array<[string, any]> = [
    ['literal empty string', ''],
    ['array with empty string', ['']],
    ['empty env var split(",")', () => ''.split(',')],
    ['reflecting fn', (o: string) => o],
  ]
  for (const [label, origin] of cases) {
    del.mockClear()
    const { response } = await h({ origin }).handle(new Request('https://api.example.com/deletePlanet', {
      headers: { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'no-cors', 'sec-fetch-dest': 'image' },
    }))
    log('B', label, 'status', response?.status, 'handler-called', del.mock.calls.length)
  }
})

it('c: none navigation to an unmatched path', async () => {
  del.mockClear()
  const { matched, response } = await h().handle(new Request('https://api.example.com/anything/else', {
    headers: { 'sec-fetch-site': 'none', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' },
  }))
  log('C matched', matched, 'status', response?.status)
})

it('d: CORS interaction depends on plugin array order', async () => {
  for (const [label, plugins] of [
    ['[CORS, CSRF]', [new CORSHandlerPlugin({ origin: ['https://app.example.com'], credentials: true }), new SimpleCsrfProtectionHandlerPlugin()]],
    ['[CSRF, CORS]', [new SimpleCsrfProtectionHandlerPlugin(), new CORSHandlerPlugin({ origin: ['https://app.example.com'], credentials: true })]],
  ] as const) {
    const handler = new RPCHandler(router, { plugins: plugins as any })
    const preflight = await handler.handle(new Request('https://api.example.com/deletePlanet', {
      method: 'OPTIONS',
      headers: { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'cors', 'origin': 'https://app.example.com', 'access-control-request-method': 'POST' },
    }))
    const actual = await handler.handle(new Request('https://api.example.com/deletePlanet', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'cors', 'origin': 'https://evil.com' },
      body: '{"json":null}',
    }))
    log('D', label, 'preflight', preflight.response?.status, Object.fromEntries(preflight.response!.headers.entries()))
    log('D', label, 'blocked', actual.response?.status, Object.fromEntries(actual.response!.headers.entries()))
  }
})

it('e: sec-fetch-site with weird whitespace / obs-fold', async () => {
  for (const site of [' same-origin', 'same-origin ', 'Same-Origin']) {
    del.mockClear()
    const { response } = await h().handle(new Request('https://api.example.com/deletePlanet', {
      headers: { 'sec-fetch-site': site },
    }))
    log('E', JSON.stringify(site), 'status', response?.status, 'handler-called', del.mock.calls.length)
  }
})
