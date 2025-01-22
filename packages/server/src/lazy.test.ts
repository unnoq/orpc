import { ContractProcedure } from '@orpc/contract'
import { flatLazy, isLazy, lazy, LAZY_SYMBOL, unlazy } from './lazy'
import { Procedure } from './procedure'

const procedure = new Procedure({
  contract: new ContractProcedure({
    InputSchema: undefined,
    outputSchema: undefined,
    errorMap: {},
    route: {},
  }),
  handler: vi.fn(),
  middlewares: [],
  inputValidationIndex: 0,
  outputValidationIndex: 0,
})

const router = { procedure }

it('lazy', () => {
  const procedureLoader = () => Promise.resolve({ default: procedure })
  const routerLoader = () => Promise.resolve({ default: router })

  expect(lazy(procedureLoader)).toSatisfy(isLazy)
  expect(lazy(routerLoader)).toSatisfy(isLazy)

  expect(lazy(procedureLoader)[LAZY_SYMBOL]).toBe(procedureLoader)
  expect(lazy(routerLoader)[LAZY_SYMBOL]).toBe(routerLoader)
})

it('isLazy', () => {
  expect(lazy(() => Promise.resolve({ default: procedure }))).toSatisfy(isLazy)
  expect(lazy(() => Promise.resolve({ default: router }))).toSatisfy(isLazy)
  expect({}).not.toSatisfy(isLazy)
  expect(undefined).not.toSatisfy(isLazy)
})

it('unwrapLazy', async () => {
  const lazied = lazy(() => Promise.resolve({ default: 'root' }))

  expect(unlazy(lazied)).resolves.toEqual({ default: 'root' })
  expect((await unlazy(lazy(() => Promise.resolve({ default: lazied })))).default).toSatisfy(isLazy)
})

it('flatLazy', () => {
  const lazied = lazy(() => Promise.resolve({ default: 'root' }))

  expect(flatLazy(lazied)[LAZY_SYMBOL]()).resolves.toEqual({ default: 'root' })
  expect(flatLazy(lazy(() => Promise.resolve({ default: lazied })))[LAZY_SYMBOL]()).resolves.toEqual({ default: 'root' })
  expect(flatLazy(lazy(() => Promise.resolve({ default: lazy(() => Promise.resolve({ default: lazied })) })))[LAZY_SYMBOL]()).resolves.toEqual({ default: 'root' })
})
