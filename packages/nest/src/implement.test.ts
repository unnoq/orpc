import type { NodeHttpRequest } from '@orpc/standard-server-node'
import { Controller, Req } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { oc, ORPCError } from '@orpc/contract'
import { implement, lazy } from '@orpc/server'
import * as StandardServerNode from '@orpc/standard-server-node'
import supertest from 'supertest'
import { expect, it, vi } from 'vitest'
import * as z from 'zod'
import { Implement } from './implement'
import { ORPCModule } from './module'

const sendStandardResponseSpy = vi.spyOn(StandardServerNode, 'sendStandardResponse')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('@Implement', async () => {
  const ping_handler = vi.fn(() => ({ body: 'pong', headers: { 'x-ping': 'pong' } }))
  const pong_handler = vi.fn(({ input }) => {
    throw new ORPCError('TEST', {
      data: `pong ${input.name}`,
      status: 408,
    })
  })
  const peng_handler = vi.fn(({ input }) => `peng ${input.path}`)

  const contract = {
    ping: oc.route({
      path: '/ping',
      inputStructure: 'detailed',
      outputStructure: 'detailed',
      method: 'POST',
    }),
    pong: oc.route({
      path: '/pong/{name}',
      method: 'GET',
    }).input(z.object({
      name: z.string(),
    })),
    nested: {
      peng: oc.route({
        path: '/{+path}',
        method: 'DELETE',
      }).input(z.object({
        path: z.string(),
      })),
    },
  }

  let req: NodeHttpRequest | undefined

  beforeEach(() => {
    req = undefined
  })

  @Controller()
  class ImplProcedureController {
    @Implement(contract.ping)
    ping(@Req() _req: NodeHttpRequest) {
      req = _req

      return implement(contract.ping).handler(ping_handler)
    }

    @Implement(contract.pong)
    pong(@Req() _req: NodeHttpRequest) {
      req = _req

      return implement(contract.pong).handler(pong_handler)
    }

    @Implement(contract.nested.peng)
    peng(@Req() _req: NodeHttpRequest) {
      req = _req

      return implement(contract.nested.peng).handler(peng_handler)
    }
  }

  const AdvanceMeta: MethodDecorator = (target, propertyKey, descriptor) => {
    Reflect.defineMetadata('orpc:meta', { path: '/advanced' }, target, propertyKey)
  }

  @Controller()
  class ImplRouterController {
    @Implement(contract)
    @AdvanceMeta
    router(@Req() _req: NodeHttpRequest) {
      req = _req

      return {
        ping: implement(contract.ping).handler(ping_handler),
        pong: lazy(() => Promise.resolve({ default: implement(contract.pong).handler(pong_handler) })),
        nested: lazy(() => Promise.resolve({
          default: {
            peng: implement(contract.nested.peng).handler(peng_handler),
          },
        })),
      }
    }

    /**
     * Make sure the @Implement can prevent conflict method name
     */
    router_ping() {
      return 'router_ping'
    }

    /**
     * Make sure the @Implement can prevent conflict method name
     */
    router_ping_0() {
      return 'router_ping_0'
    }

    /**
     * Make sure the @Implement can prevent conflict method name
     */
    router_nested_peng() {
      return 'router_nested_peng'
    }
  }

  describe.each([
    [ImplProcedureController, 'implement each standalone procedure'],
    [ImplRouterController, 'implement entire contract'],
  ] as const)('type: $1', async (Controller, _) => {
    const moduleRef = await Test.createTestingModule({
      controllers: [Controller],
    }).compile()

    const app = moduleRef.createNestApplication()
    await app.init()

    const httpServer = app.getHttpServer()

    it('case: call ping', async () => {
      const res = await supertest(httpServer)
        .post('/ping?param=value&param2[]=value2&param2[]=value3')
        .set('x-custom', 'value')
        .send({ hello: 'world' })

      expect(res.statusCode).toEqual(200)
      expect(res.body).toEqual('pong')
      expect(res.headers).toEqual(expect.objectContaining({ 'x-ping': 'pong' }))

      expect(ping_handler).toHaveBeenCalledTimes(1)
      expect(ping_handler).toHaveBeenCalledWith(expect.objectContaining({
        input: {
          headers: expect.objectContaining({
            'x-custom': 'value',
          }),
          body: { hello: 'world' },
          params: {},
          query: {
            param: 'value',
            param2: ['value2', 'value3'],
          },
        },
      }))

      expect(req).toBeDefined()
      expect(req!.method).toEqual('POST')
      expect(req!.url).toEqual('/ping?param=value&param2[]=value2&param2[]=value3')
    })

    it('case: call pong', async () => {
      const res = await supertest(httpServer).get('/pong/world')

      expect(res.statusCode).toEqual(408)
      expect(res.body).toEqual(expect.objectContaining({
        code: 'TEST',
        data: 'pong world',
      }))

      expect(pong_handler).toHaveBeenCalledTimes(1)
      expect(pong_handler).toHaveBeenCalledWith(expect.objectContaining({
        input: {
          name: 'world',
        },
      }))

      expect(req).toBeDefined()
      expect(req!.method).toEqual('GET')
      expect(req!.url).toEqual('/pong/world')
    })

    /**
     * parameter match slash is not supported on fastify
     */
    it('case: call peng', async () => {
      const res = await supertest(httpServer).delete('/world/who%3F')

      expect(res.statusCode).toEqual(200)
      expect(res.body).toEqual('peng world/who?')

      expect(peng_handler).toHaveBeenCalledTimes(1)
      expect(peng_handler).toHaveBeenCalledWith(expect.objectContaining({
        input: {
          path: 'world/who?',
        },
      }))

      expect(req).toBeDefined()
      expect(req!.method).toEqual('DELETE')
      expect(req!.url).toEqual('/world/who%3F')
    })
  })

  it('can avoid conflict method name', async () => {
    const controller = new ImplRouterController()

    expect(controller.router_ping()).toEqual('router_ping')
    expect(controller.router_ping_0()).toEqual('router_ping_0')
    expect(controller.router_nested_peng()).toEqual('router_nested_peng')
  })

  it('reflect metadata on new method', async () => {
    const controller = new ImplRouterController()

    expect(Reflect.getMetadata('orpc:meta', controller, 'router_ping_1')).toEqual({ path: '/advanced' })
    expect(Reflect.getMetadata('orpc:meta', controller, 'router_pong')).toEqual({ path: '/advanced' })
    expect(Reflect.getMetadata('orpc:meta', controller, 'router_nested')).toEqual({ path: '/advanced' })
    expect(Reflect.getMetadata('orpc:meta', controller, 'router_nested_peng_0')).toEqual({ path: '/advanced' })
  })

  it('on body parsing error', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ImplProcedureController],
    }).compile()

    const app = moduleRef.createNestApplication()
    await app.init()

    const httpServer = app.getHttpServer()

    const res = await supertest(httpServer)
      .post('/ping')
      .set('content-type', 'multipart/form-data')
      .send('invalid')

    expect(res.statusCode).toEqual(400)
    expect(res.body).toEqual(expect.objectContaining({
      code: 'BAD_REQUEST',
      message: 'Malformed request. Ensure the request body is properly formatted and the \'Content-Type\' header is set correctly.',
    }))
  })

  it('can handle wrong implementation on runtime', async () => {
    @Controller()
    class WrongImplProcedureController {
      @Implement(contract.ping)
      ping() {
        return 'wrong' as any
      }
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [WrongImplProcedureController],
    }).compile()

    const app = moduleRef.createNestApplication({ logger: false })
    await app.init()

    const httpServer = app.getHttpServer()

    const res = await supertest(httpServer)
      .post('/ping?param=value&param2[]=value2&param2[]=value3')
      .set('x-custom', 'value')
      .send({ hello: 'world' })

    expect(res.statusCode).toEqual(500)
    expect(res.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    })
  })

  it('throw on build if contract is not has a path', async () => {
    const invalidContract = oc.route({})

    expect(() => {
      @Controller()
      class WrongImplProcedureController {
        @Implement(invalidContract)
        peng() {
          return implement(invalidContract).handler(() => {})
        }
      }
    }).toThrow('Please define one using \'path\' property on the \'.route\' method.')
  })

  it('partial working on fastify', async () => {
    @Controller()
    class FastifyController {
      @Implement(contract.ping)
      pong(@Req() _req: any) {
        req = _req
        return implement(contract.ping).handler(ping_handler)
      }
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [FastifyController],
    }).compile()

    const app = moduleRef.createNestApplication(new FastifyAdapter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    const httpServer = app.getHttpServer()

    const res = await supertest(httpServer)
      .post('/ping?param=value&param2[]=value2&param2[]=value3')
      .set('x-custom', 'value')
      .send({ hello: 'world' })

    expect(res.statusCode).toEqual(200)
    expect(res.body).toEqual('pong')
    expect(res.headers).toEqual(expect.objectContaining({ 'x-ping': 'pong' }))

    expect(ping_handler).toHaveBeenCalledTimes(1)
    expect(ping_handler).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        headers: expect.objectContaining({
          'x-custom': 'value',
        }),
        body: { hello: 'world' },
        params: {},
        query: {
          param: 'value',
          param2: ['value2', 'value3'],
        },
      },
    }))

    expect(req).toBeDefined()
    expect(req!.method).toEqual('POST')
    expect(req!.url).toEqual('/ping?param=value&param2[]=value2&param2[]=value3')
  })

  it('should pass correct signal and lastEventId', async () => {
    const states: any[] = []

    @Controller()
    class ImplProcedureController {
      @Implement(contract.pong)
      ping() {
        return implement(contract.pong).handler(({ signal, lastEventId }) => {
          states.push(lastEventId)

          states.push(signal!.aborted)
          signal?.addEventListener('abort', () => {
            states.push(true)
          })
        })
      }
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [ImplProcedureController],
    }).compile()

    const app = moduleRef.createNestApplication()
    await app.init()

    const httpServer = app.getHttpServer()

    const res = await supertest(httpServer)
      .get('/pong/world')
      .set('last-event-id', '123')

    expect(res.statusCode).toEqual(200)

    expect(states).toEqual([
      '123',
      false,
    ])
  })

  it('works with ORPCModule.forRoot', async () => {
    const interceptor = vi.fn(({ next }) => next())
    const moduleRef = await Test.createTestingModule({
      imports: [
        ORPCModule.forRoot({
          interceptors: [interceptor],
          eventIteratorKeepAliveComment: '__TEST__',
        }),
      ],
      controllers: [ImplProcedureController],
    }).compile()

    const app = moduleRef.createNestApplication()
    await app.init()

    const httpServer = app.getHttpServer()

    const res = await supertest(httpServer)
      .post('/ping?param=value&param2[]=value2&param2[]=value3')
      .set('x-custom', 'value')
      .send({ hello: 'world' })

    expect(res.statusCode).toEqual(200)
    expect(res.body).toEqual('pong')

    expect(interceptor).toHaveBeenCalledTimes(1)
    expect(sendStandardResponseSpy).toHaveBeenCalledTimes(1)
    expect(sendStandardResponseSpy).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({
      eventIteratorKeepAliveComment: '__TEST__',
    }))
  })
})
