import { oc } from '@orpc/contract'
import { os, withHiddenRouterContract } from '@orpc/server'
import { getOpenAPIMeta, openapi } from '../../meta'
import { OpenAPIMatcher } from './openapi-matcher'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('openAPIMatcher', () => {
  describe('direct routes', () => {
    it('matches generated and explicit OpenAPI routes after pathname normalization', async () => {
      const ping = os.handler(() => 'pong')
      const echo = os
        .meta(openapi({ method: 'GET', path: '/nested/echo/{value}' }))
        .handler(() => 'echo')

      const matcher = new OpenAPIMatcher({
        ping,
        nested: { echo },
      })

      await expect(matcher.match('POST', '/ping', undefined)).resolves.toEqual({
        path: ['ping'],
        procedure: ping,
        params: undefined,
      })

      await expect(matcher.match('GET', '/nested/%65cho/dinwwwh%2F', undefined)).resolves.toEqual({
        path: ['nested', 'echo'],
        procedure: echo,
        params: { value: 'dinwwwh/' },
      })

      await expect(matcher.match('POST', '/nested/echo/dinwwwh%2F', undefined)).resolves.toBeUndefined()
    })

    it('normalizes trailing slashes in request paths and OpenAPI route definitions', async () => {
      const ping = os.handler(() => 'pong')
      const echo = os
        .meta(openapi({ method: 'GET', path: '/echo/' }))
        .handler(() => 'echo')

      const matcher = new OpenAPIMatcher({ ping, echo })

      await expect(matcher.match('POST', '/ping/', undefined)).resolves.toEqual({
        path: ['ping'],
        procedure: ping,
        params: undefined,
      })

      await expect(matcher.match('GET', '/echo', undefined)).resolves.toEqual({
        path: ['echo'],
        procedure: echo,
        params: undefined,
      })

      await expect(matcher.match('GET', '/echo/', undefined)).resolves.toEqual({
        path: ['echo'],
        procedure: echo,
        params: undefined,
      })
    })

    it('decodes catch-all params and trims trailing slashes', async () => {
      const files = os
        .meta(openapi({ method: 'GET', path: '/files/{+path}' }))
        .handler(() => 'ok')

      const matcher = new OpenAPIMatcher({ files })

      await expect(matcher.match('GET', '/files/a/b/c%2Fd/', undefined)).resolves.toEqual({
        path: ['files'],
        procedure: files,
        params: { path: 'a/b/c/d' },
      })
    })

    it('applies OpenAPI prefixes to generated and explicit routes', async () => {
      const ping = os
        .meta(openapi({ prefix: '/api' }))
        .handler(() => 'pong')

      const echo = os
        .meta(openapi({ method: 'GET', prefix: '/api/v1', path: '/echo/{value}' }))
        .handler(() => 'echo')

      const matcher = new OpenAPIMatcher({ ping, echo })

      await expect(matcher.match('POST', '/api/ping', undefined)).resolves.toEqual({
        path: ['ping'],
        procedure: ping,
        params: undefined,
      })

      await expect(matcher.match('GET', '/api/v1/echo/world', undefined)).resolves.toEqual({
        path: ['echo'],
        procedure: echo,
        params: { value: 'world' },
      })

      await expect(matcher.match('POST', '/ping', undefined)).resolves.toBeUndefined()
      await expect(matcher.match('GET', '/echo/world', undefined)).resolves.toBeUndefined()
    })

    it('supports filtering procedures during indexing', async () => {
      const ping = os.handler(() => 'pong')
      const secret = os.handler(() => 'hidden')
      const filter = vi.fn((_procedure: unknown, path: string[]) => !path.includes('secret'))

      const matcher = new OpenAPIMatcher({
        ping,
        internal: { secret },
      }, {
        filter,
      })

      await expect(matcher.match('POST', '/ping', undefined)).resolves.toEqual({
        path: ['ping'],
        procedure: ping,
        params: undefined,
      })

      await expect(matcher.match('POST', '/internal/secret', undefined)).resolves.toBeUndefined()

      expect(filter.mock.calls).toContainEqual([ping, ['ping']])
      expect(filter.mock.calls).toContainEqual([secret, ['internal', 'secret']])
    })

    it('serves a route whose optional wildcard segment is omitted', async () => {
      const files = os
        .meta(openapi({ method: 'GET', path: '/files/*' }))
        .handler(() => 'ok')

      const matcher = new OpenAPIMatcher({ files })

      // rou3 records a bare `*` as optional, so `/files` matches with the param unset
      const result = await matcher.match('GET', '/files', undefined)

      expect(result).toBeDefined()
      expect(result!.path).toEqual(['files'])
    })

    it('keeps a param literally named __proto__ as an own property', async () => {
      const procedure = os
        .meta(openapi({ method: 'GET', path: '/a/{__proto__}' }))
        .handler(() => 'ok')

      const matcher = new OpenAPIMatcher({ procedure })
      const result = await matcher.match('GET', '/a/value', undefined)

      expect(result).toBeDefined()
      expect(Object.keys(result!.params!)).toEqual(['__proto__'])
      expect(Object.getOwnPropertyDescriptor(result!.params!, '__proto__')?.value).toBe('value')
    })

    it('supports both normal and catch-all params at the same time', async () => {
      const procedure = os
        .meta(openapi({ method: 'GET', path: '/{name}/{+rest}' }))
        .handler(() => 'ok')

      const matcher = new OpenAPIMatcher({ procedure })

      await expect(matcher.match('GET', '/a/b/c%2Fd/', undefined)).resolves.toEqual({
        path: ['procedure'],
        procedure,
        params: { name: 'a', rest: 'b/c/d' },
      })
    })
  })

  describe('runtime prefix stripping', () => {
    it('strips prefixes before route matching, including trailing slash prefixes', async () => {
      const ping = os.handler(() => 'pong')
      const pong = os.meta(openapi({ path: '/' })).handler(() => 'pong')
      const matcher = new OpenAPIMatcher({ ping, pong })

      await expect(matcher.match('POST', '/api/v1/ping', '/api/v1')).resolves.toEqual({
        path: ['ping'],
        procedure: ping,
        params: undefined,
      })

      await expect(matcher.match('POST', '/api/ping', '/api/')).resolves.toEqual({
        path: ['ping'],
        procedure: ping,
        params: undefined,
      })

      await expect(matcher.match('POST', '/api', '/api')).resolves.toEqual({
        path: ['pong'],
        procedure: pong,
        params: undefined,
      })
    })

    it('mismatch when the runtime prefix is missing or not a full path segment', async () => {
      const ping = os.handler(() => 'pong')
      const matcher = new OpenAPIMatcher({ ping })

      await expect(matcher.match('POST', '/other/ping', '/api')).resolves.toBeUndefined()
      await expect(matcher.match('POST', '/apiping', '/api')).resolves.toBeUndefined()
    })
  })

  describe('lazy routers', () => {
    it('resolves unprefixed lazy routers once and reuses indexed routes', async () => {
      const info = os
        .meta(openapi({ method: 'GET', path: '/info' }))
        .handler(() => 'info')

      const loader = vi.fn(async () => ({
        default: { info },
      }))

      const matcher = new OpenAPIMatcher({
        lazy: os.lazy(loader),
      })

      await expect(matcher.match('GET', '/info', undefined)).resolves.toEqual({
        path: ['lazy', 'info'],
        procedure: info,
        params: undefined,
      })

      await expect(matcher.match('GET', '/info', undefined)).resolves.toEqual({
        path: ['lazy', 'info'],
        procedure: info,
        params: undefined,
      })

      expect(loader).toHaveBeenCalledTimes(1)
    })

    it('resolves prefixed lazy routers only when the pathname matches the prefix pattern', async () => {
      const info = os
        .meta(openapi({ method: 'GET', path: '/info/{tab}' }))
        .handler(() => 'info')

      const loader = vi.fn(async () => ({
        default: { info },
      }))

      const matcher = new OpenAPIMatcher({
        user: os.meta(openapi({ prefix: '/users/{userId}' })).lazy(loader),
      })

      await expect(matcher.match('GET', '/projects/42/info/general', undefined)).resolves.toBeUndefined()
      expect(loader).toHaveBeenCalledTimes(0)

      const firstResult = await matcher.match('GET', '/users/din/info/settings', undefined)

      expect(firstResult).toBeDefined()
      expect(firstResult!.path).toEqual(['user', 'info'])
      expect(firstResult!.params).toEqual({ userId: 'din', tab: 'settings' })
      expect(getOpenAPIMeta(firstResult!.procedure)).toMatchObject({
        method: 'GET',
        path: '/info/{tab}',
        prefix: '/users/{userId}',
      })

      await expect(matcher.match('GET', '/users/din/info/settings', undefined)).resolves.toEqual(firstResult)

      expect(loader).toHaveBeenCalledTimes(1)
    })

    it('retries a lazy router whose loader throws synchronously', async () => {
      const info = os
        .meta(openapi({ method: 'GET', path: '/info' }))
        .handler(() => 'info')

      let attempts = 0
      // deliberately not async: it throws synchronously out of `unlazy`
      const loader = vi.fn(() => {
        attempts++
        if (attempts === 1) {
          throw new Error('loader exploded')
        }
        return Promise.resolve({ default: { info } })
      })

      const matcher = new OpenAPIMatcher({ lazy: os.lazy(loader as any) })

      await expect(matcher.match('GET', '/info', undefined)).rejects.toThrowError('loader exploded')

      await expect(matcher.match('GET', '/info', undefined)).resolves.toEqual({
        path: ['lazy', 'info'],
        procedure: info,
        params: undefined,
      })

      expect(loader).toHaveBeenCalledTimes(2)
    })

    it('retries a lazy router whose first load fails', async () => {
      const info = os
        .meta(openapi({ method: 'GET', path: '/info' }))
        .handler(() => 'info')

      let attempts = 0
      const loader = vi.fn(async () => {
        attempts++
        if (attempts === 1) {
          throw new Error('loader exploded')
        }
        return { default: { info } }
      })

      const matcher = new OpenAPIMatcher({ lazy: os.lazy(loader) })

      await expect(matcher.match('GET', '/info', undefined)).rejects.toThrowError('loader exploded')

      // the failed router must stay pending so a later request can load it
      await expect(matcher.match('GET', '/info', undefined)).resolves.toEqual({
        path: ['lazy', 'info'],
        procedure: info,
        params: undefined,
      })

      expect(loader).toHaveBeenCalledTimes(2)
    })

    it('resolves a prefixed lazy router that only matches after percent-decoding', async () => {
      const info = os
        .meta(openapi({ method: 'GET', path: '/info' }))
        .handler(() => 'info')

      const loader = vi.fn(async () => ({ default: { info } }))

      const matcher = new OpenAPIMatcher({
        user: os.meta(openapi({ prefix: '/users' })).lazy(loader),
      })

      // "%75" is "u": the prefix RegExp is tested against the raw pathname first and fails,
      // so the retry has to re-run lazy resolution against the normalized pathname
      const result = await matcher.match('GET', '/%75sers/info', undefined)

      expect(result).toBeDefined()
      expect(result!.path).toEqual(['user', 'info'])
      expect(result!.params).toBeUndefined()
      expect(getOpenAPIMeta(result!.procedure)).toMatchObject({
        method: 'GET',
        path: '/info',
        prefix: '/users',
      })

      expect(loader).toHaveBeenCalledTimes(1)
    })

    it('resolves nested lazy routers added during the same match', async () => {
      const summary = os
        .meta(openapi({ method: 'GET', path: '/summary' }))
        .handler(() => 'summary')

      const projectLoader = vi.fn(async () => ({
        default: { summary },
      }))

      const outerLoader = vi.fn(async () => ({
        default: {
          project: os.meta(openapi({ prefix: '/projects/{projectId}' })).lazy(projectLoader),
        },
      }))

      const matcher = new OpenAPIMatcher({
        lazy: os.lazy(outerLoader),
      })

      const firstResult = await matcher.match('GET', '/projects/42/summary', undefined)

      expect(firstResult).toBeDefined()
      expect(firstResult!.path).toEqual(['lazy', 'project', 'summary'])
      expect(firstResult!.params).toEqual({ projectId: '42' })
      expect(getOpenAPIMeta(firstResult!.procedure)).toMatchObject({
        method: 'GET',
        path: '/summary',
        prefix: '/projects/{projectId}',
      })

      await expect(matcher.match('GET', '/projects/42/summary', undefined)).resolves.toEqual(firstResult)

      expect(outerLoader).toHaveBeenCalledTimes(1)
      expect(projectLoader).toHaveBeenCalledTimes(1)
    })
  })

  describe('concurrent lazy resolution', () => {
    it('resolves a lazy router for concurrent matches on the same path', async () => {
      const info = os
        .meta(openapi({ method: 'GET', path: '/info' }))
        .handler(() => 'info')

      const loader = vi.fn(async () => {
        // a real dynamic import settles over several microtasks
        await Promise.resolve()
        return { default: { info } }
      })

      const matcher = new OpenAPIMatcher({ lazy: os.lazy(loader) })

      const results = await Promise.all(
        Array.from({ length: 8 }, () => matcher.match('GET', '/info', undefined)),
      )

      for (const result of results) {
        expect(result).toEqual({
          path: ['lazy', 'info'],
          procedure: info,
          params: undefined,
        })
      }
    })

    it('resolves nested lazy routers for concurrent matches on the same path', async () => {
      const summary = os
        .meta(openapi({ method: 'GET', path: '/summary' }))
        .handler(() => 'summary')

      const projectLoader = vi.fn(async () => {
        await Promise.resolve()
        return { default: { summary } }
      })

      const outerLoader = vi.fn(async () => {
        await Promise.resolve()
        return {
          default: {
            project: os.meta(openapi({ prefix: '/projects/{projectId}' })).lazy(projectLoader),
          },
        }
      })

      const matcher = new OpenAPIMatcher({ lazy: os.lazy(outerLoader) })

      const results = await Promise.all(
        Array.from({ length: 8 }, () => matcher.match('GET', '/projects/42/summary', undefined)),
      )

      for (const result of results) {
        expect(result).toBeDefined()
        expect(result!.path).toEqual(['lazy', 'project', 'summary'])
        expect(result!.params).toEqual({ projectId: '42' })
      }
    })

    it('resolves concurrent matches that need different lazy routers', async () => {
      const alpha = os.meta(openapi({ method: 'GET', path: '/detail' })).handler(() => 'a')
      const beta = os.meta(openapi({ method: 'GET', path: '/detail' })).handler(() => 'b')

      const alphaLoader = vi.fn(async () => {
        await Promise.resolve()
        return { default: { alpha } }
      })

      const betaLoader = vi.fn(async () => {
        await Promise.resolve()
        return { default: { beta } }
      })

      const matcher = new OpenAPIMatcher({
        a: os.meta(openapi({ prefix: '/alpha' })).lazy(alphaLoader),
        b: os.meta(openapi({ prefix: '/beta' })).lazy(betaLoader),
      })

      // two in-flight requests, each unlocking a different pending lazy router:
      // neither may drop the other's pending entry
      const [first, second] = await Promise.all([
        matcher.match('GET', '/alpha/detail', undefined),
        matcher.match('GET', '/beta/detail', undefined),
      ])

      expect(first).toBeDefined()
      expect(first!.path).toEqual(['a', 'alpha'])
      expect(second).toBeDefined()
      expect(second!.path).toEqual(['b', 'beta'])

      // and both stay matchable afterwards
      await expect(matcher.match('GET', '/alpha/detail', undefined)).resolves.toEqual(first)
      await expect(matcher.match('GET', '/beta/detail', undefined)).resolves.toEqual(second)
    })

    it('resolves a deep lazy chain for concurrent matches without losing or reloading routers', async () => {
      const leaf1 = os.meta(openapi({ method: 'GET', path: '/leaf1' })).handler(() => '1')
      const leaf2 = os.meta(openapi({ method: 'GET', path: '/leaf2' })).handler(() => '2')
      const leaf3 = os.meta(openapi({ method: 'GET', path: '/leaf3' })).handler(() => '3')

      const loads = { l1: 0, l2: 0, l3: 0 }

      /** settle after N microtask turns so the three levels interleave */
      const settle = async (turns: number) => {
        for (let i = 0; i < turns; i++) {
          await Promise.resolve()
        }
      }

      const l3 = os.meta(openapi({ prefix: '/p3' })).lazy(async () => {
        loads.l3++
        await settle(2)
        return { default: { leaf3 } }
      })

      const l2 = os.meta(openapi({ prefix: '/p2' })).lazy(async () => {
        loads.l2++
        await settle(3)
        return { default: { leaf2, l3 } }
      })

      const matcher = new OpenAPIMatcher({
        lazy: os.lazy(async () => {
          loads.l1++
          await settle(4)
          return { default: { leaf1, l2 } }
        }),
      })

      const paths = ['/leaf1', '/p2/leaf2', '/p2/p3/leaf3'] as const
      const results = await Promise.all(
        paths.flatMap(path => [
          matcher.match('GET', path, undefined),
          matcher.match('GET', path, undefined),
        ]),
      )

      expect(results.map(result => result?.path.join('/'))).toEqual([
        'lazy/leaf1',
        'lazy/leaf1',
        'lazy/l2/leaf2',
        'lazy/l2/leaf2',
        'lazy/l2/l3/leaf3',
        'lazy/l2/l3/leaf3',
      ])

      // every level is loaded exactly once even though six matches raced for it
      expect(loads).toEqual({ l1: 1, l2: 1, l3: 1 })

      // and the deepest route stays matchable afterwards
      await expect(matcher.match('GET', '/p2/p3/leaf3', undefined)).resolves.toBeDefined()
      expect(loads).toEqual({ l1: 1, l2: 1, l3: 1 })
    })

    it('resolves concurrent matches at different depths of the same lazy tree', async () => {
      const shallow = os.meta(openapi({ method: 'GET', path: '/shallow' })).handler(() => 's')
      const deep = os.meta(openapi({ method: 'GET', path: '/deep' })).handler(() => 'd')

      const innerLoader = vi.fn(async () => {
        await Promise.resolve()
        return { default: { deep } }
      })

      const outerLoader = vi.fn(async () => {
        await Promise.resolve()
        return {
          default: {
            shallow,
            inner: os.meta(openapi({ prefix: '/inner' })).lazy(innerLoader),
          },
        }
      })

      const matcher = new OpenAPIMatcher({ lazy: os.lazy(outerLoader) })

      const [shallowResult, deepResult] = await Promise.all([
        matcher.match('GET', '/shallow', undefined),
        matcher.match('GET', '/inner/deep', undefined),
      ])

      expect(shallowResult).toBeDefined()
      expect(shallowResult!.path).toEqual(['lazy', 'shallow'])
      expect(deepResult).toBeDefined()
      expect(deepResult!.path).toEqual(['lazy', 'inner', 'deep'])

      await expect(matcher.match('GET', '/inner/deep', undefined)).resolves.toEqual(deepResult)
    })
  })

  describe('contract-first routers', () => {
    it('wraps implementations with contract metadata and caches wrapped procedures', async () => {
      const implementation = {
        ping: os
          .meta(openapi({ method: 'GET', path: '/implementation' }))
          .handler(() => 'pong'),
      }

      const contract = {
        ping: oc.meta(openapi({ method: 'DELETE', path: '/contract/{id}' })),
      }

      const matcher = new OpenAPIMatcher(withHiddenRouterContract(implementation, contract))
      const firstResult = await matcher.match('DELETE', '/contract/42', undefined)

      expect(firstResult).toBeDefined()
      expect(firstResult!.path).toEqual(['ping'])
      expect(firstResult!.params).toEqual({ id: '42' })
      expect(firstResult!.procedure).not.toBe(implementation.ping)
      expect(getOpenAPIMeta(firstResult!.procedure)).toMatchObject({
        method: 'DELETE',
        path: '/contract/{id}',
      })

      const secondResult = await matcher.match('DELETE', '/contract/42', undefined)

      expect(secondResult).toEqual(firstResult)
      expect(secondResult!.procedure).toBe(firstResult!.procedure) // ensure cache

      await expect(matcher.match('GET', '/implementation', undefined)).resolves.toBeUndefined()
    })

    it('throws when a contract-first implementation is missing', async () => {
      const matcher = new OpenAPIMatcher(withHiddenRouterContract({
        ping: os.handler(() => 'pong'),
      }, {
        missing: oc.meta(openapi({ method: 'GET', path: '/missing' })),
      }))

      await expect(matcher.match('GET', '/missing', undefined)).rejects.toThrowError(
        '[Contract-First] Missing or invalid implementation for procedure at path: "missing"',
      )
    })
  })
})
