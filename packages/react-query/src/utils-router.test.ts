import * as generalUtilsModule from './utils-general'
import * as procedureUtilsModule from './utils-procedure'
import { createRouterUtils } from './utils-router'

const procedureUtilsSpy = vi.spyOn(procedureUtilsModule, 'createProcedureUtils')
const generalUtilsSpy = vi.spyOn(generalUtilsModule, 'createGeneralUtils')

beforeEach(() => {
  procedureUtilsSpy.mockClear()
  generalUtilsSpy.mockClear()
})

describe('router utils', () => {
  it('works', () => {
    const client = vi.fn() as any
    client.ping = vi.fn()
    client.ping.peng = vi.fn()

    const utils = createRouterUtils(client) as any

    expect(generalUtilsSpy).toHaveBeenCalledTimes(1)
    expect(generalUtilsSpy).toHaveBeenCalledWith([])
    expect(procedureUtilsSpy).toHaveBeenCalledTimes(1)
    expect(procedureUtilsSpy).toHaveBeenCalledWith(client, [])

    expect(typeof utils.key).toEqual('function')
    expect(typeof utils.queryOptions).toEqual('function')

    generalUtilsSpy.mockClear()
    procedureUtilsSpy.mockClear()
    void utils.ping

    expect(generalUtilsSpy).toHaveBeenCalledTimes(1)
    expect(generalUtilsSpy).toHaveBeenCalledWith(['ping'])
    expect(procedureUtilsSpy).toHaveBeenCalledTimes(1)
    expect(procedureUtilsSpy).toHaveBeenCalledWith(client.ping, ['ping'])

    expect(typeof utils.ping.key).toEqual('function')
    expect(typeof utils.ping.queryOptions).toEqual('function')

    generalUtilsSpy.mockClear()
    procedureUtilsSpy.mockClear()
    void utils.ping.peng

    expect(generalUtilsSpy).toHaveBeenCalledTimes(2)
    expect(generalUtilsSpy).toHaveBeenNthCalledWith(1, ['ping'])
    expect(generalUtilsSpy).toHaveBeenNthCalledWith(2, ['ping', 'peng'])

    expect(procedureUtilsSpy).toHaveBeenCalledTimes(2)
    expect(procedureUtilsSpy).toHaveBeenNthCalledWith(1, client.ping, ['ping'])
    expect(procedureUtilsSpy).toHaveBeenNthCalledWith(2, client.ping.peng, ['ping', 'peng'])

    expect(typeof utils.ping.peng.key).toEqual('function')
    expect(typeof utils.ping.peng.queryOptions).toEqual('function')
  })

  it('can custom  base path', () => {
    const client = vi.fn() as any

    const utils = createRouterUtils(client, ['base']) as any

    expect(generalUtilsSpy).toHaveBeenCalledTimes(1)
    expect(generalUtilsSpy).toHaveBeenCalledWith(['base'])
    expect(procedureUtilsSpy).toHaveBeenCalledTimes(1)
    expect(procedureUtilsSpy).toHaveBeenCalledWith(client, ['base'])
  })
})
