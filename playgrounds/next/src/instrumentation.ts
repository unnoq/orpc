import { registerOTel } from '@vercel/otel'
import { ORPCInstrumentation } from '@orpc/otel'

export async function register() {
  registerOTel({
    serviceName: 'next-app',
    instrumentations: [
      new ORPCInstrumentation(),
    ],
  })

  await import('./lib/orpc.server')
}
