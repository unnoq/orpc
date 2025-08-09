import { orpc } from '@/lib/orpc'
import { useQuery } from '@tanstack/react-query'

export function SSE() {
  const { status, data } = useQuery(orpc.sse.experimental_streamedOptions({
    input: (async function* () {
      for (let i = 0; i < 10; i++) {
        yield { time: new Date() }
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }()),
  }))

  if (status === 'error') {
    return (
      <p>
        Something went wrong.
      </p>
    )
  }

  if (status === 'pending') {
    return (
      <p>
        Loading...
      </p>
    )
  }

  return (
    <div>
      <h2>oRPC and SSE | Server-Sent Events example</h2>

      <ul>
        {data.map((item, i) => (
          <li key={i}>
            {item.time.toLocaleTimeString()}
          </li>
        ))}
      </ul>
    </div>
  )
}
