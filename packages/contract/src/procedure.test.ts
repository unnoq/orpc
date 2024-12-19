import { z } from 'zod'
import { ContractProcedure, isContractProcedure } from './procedure'

describe('isContractProcedure', () => {
  it('works', () => {
    expect(new ContractProcedure({ InputSchema: undefined, OutputSchema: undefined })).toSatisfy(isContractProcedure)
    expect(new ContractProcedure({ InputSchema: z.object({}), OutputSchema: undefined })).toSatisfy(isContractProcedure)
    expect(new ContractProcedure({ InputSchema: z.object({}), OutputSchema: undefined, route: {} })).toSatisfy(isContractProcedure)
    expect({}).not.toSatisfy(isContractProcedure)
    expect(true).not.toSatisfy(isContractProcedure)
    expect(1).not.toSatisfy(isContractProcedure)
    expect({ '~orpc': {} }).not.toSatisfy(isContractProcedure)
  })

  it('works with raw object', () => {
    expect(Object.assign({}, new ContractProcedure({ InputSchema: undefined, OutputSchema: undefined }))).toSatisfy(isContractProcedure)
    expect(Object.assign({}, new ContractProcedure({ InputSchema: z.object({}), OutputSchema: undefined }))).toSatisfy(isContractProcedure)
    expect(Object.assign({}, new ContractProcedure({ InputSchema: z.object({}), OutputSchema: undefined, route: {} }))).toSatisfy(isContractProcedure)
  })
})
