import type { ContractRouter, InferRouterInitialContext, Procedure, Router, Schema } from '@orpc/server'
import type { AsyncIteratorClass } from '@orpc/shared'
import type { inferRouterContext } from '@trpc/server'
import type { inferRouterMeta, TrackedData } from '@trpc/server/unstable-core-do-not-import'
import type { TRPCContext, TRPCMeta, trpcRouter } from '../tests/shared'
import type { ToORPCRouterResult } from './to-orpc-router'

it('ToORPCRouterResult', () => {
  const orpcRouter = {} as ToORPCRouterResult<
    inferRouterContext<typeof trpcRouter>,
    inferRouterMeta<typeof trpcRouter>,
      typeof trpcRouter['_def']['record']
  >

  expectTypeOf(orpcRouter).toExtend<Router<ContractRouter<TRPCMeta>, TRPCContext>>()

  expectTypeOf<InferRouterInitialContext<typeof orpcRouter>>().toEqualTypeOf<{ a: string }>()

  expectTypeOf(orpcRouter.ping).toEqualTypeOf<
    Procedure<TRPCContext, object, Schema<{ input: number }, unknown>, Schema<unknown, { output: string }>, object, TRPCMeta>
  >()

  expectTypeOf(orpcRouter.throw).toEqualTypeOf<
    Procedure<TRPCContext, object, Schema<{ b: number, c: string }, unknown>, Schema<unknown, never>, object, TRPCMeta>
  >()

  expectTypeOf(orpcRouter.subscribe).toEqualTypeOf<
    Procedure<TRPCContext, object, Schema<{ u: string }, unknown>, Schema<unknown, AsyncIteratorClass<'pong' | TrackedData<{ order: number }>, void, any>>, object, TRPCMeta>
  >()

  expectTypeOf(orpcRouter.nested).toEqualTypeOf<
    {
      ping: Procedure<TRPCContext, object, Schema<{ a: string }, unknown>, Schema<unknown, number>, object, TRPCMeta>
    }
  >()

  expectTypeOf(orpcRouter.lazy).toEqualTypeOf<
    {
      subscribe: Procedure<TRPCContext, object, Schema<void, unknown>, Schema<unknown, AsyncIteratorClass<string, void, any>>, object, TRPCMeta>
      lazy: {
        throw: Procedure<TRPCContext, object, Schema<{ input: number }, unknown>, Schema<unknown, { output: string }>, object, TRPCMeta>
      }
    }
  >()
})
