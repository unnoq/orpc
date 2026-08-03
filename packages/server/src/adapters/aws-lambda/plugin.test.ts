import type { AwsLambdaHandlerPlugin } from './plugin'
import { CompositeAwsLambdaHandlerPlugin } from './plugin'

describe('compositeAwsLambdaHandlerPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards initAwsLambdaHandlerOptions and sorts plugins by dependencies', () => {
    const plugin1 = {
      name: 'plugin-1',
      initAwsLambdaHandlerOptions: vi.fn((options: any) => options),
      after: ['plugin-2'],
    } satisfies AwsLambdaHandlerPlugin<any>

    const plugin2 = {
      name: 'plugin-2',
      initAwsLambdaHandlerOptions: vi.fn((options: any) => options),
      before: ['plugin-1'],
    } satisfies AwsLambdaHandlerPlugin<any>

    const plugin3 = {
      name: 'plugin-3',
      initAwsLambdaHandlerOptions: vi.fn((options: any) => options),
      after: ['plugin-1'],
    } satisfies AwsLambdaHandlerPlugin<any>

    const composite = new CompositeAwsLambdaHandlerPlugin([plugin1, plugin2, plugin3])
    const options = { awsLambdaInterceptors: [vi.fn()] }

    const result = composite.initAwsLambdaHandlerOptions(options)

    expect(result).toBe(options)

    expect(plugin1.initAwsLambdaHandlerOptions).toHaveBeenCalledOnce()
    expect(plugin2.initAwsLambdaHandlerOptions).toHaveBeenCalledOnce()
    expect(plugin3.initAwsLambdaHandlerOptions).toHaveBeenCalledOnce()

    expect(plugin2.initAwsLambdaHandlerOptions).toHaveBeenCalledBefore(plugin1.initAwsLambdaHandlerOptions)
    expect(plugin1.initAwsLambdaHandlerOptions).toHaveBeenCalledBefore(plugin3.initAwsLambdaHandlerOptions)
  })
})
