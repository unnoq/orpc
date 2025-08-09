import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreatePlanetMutationForm } from './components/orpc-mutation'
import { ListPlanetsQuery } from './components/orpc-query'
import { SSE } from './components/orpc-sse'

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <h1>ORPC Playground</h1>
        You can visit the
        {' '}
        <a href="/api">Redirect to Scalar API Reference</a>
        {' '}
        page.
        <hr />
        <CreatePlanetMutationForm />
        <hr />
        <ListPlanetsQuery />
        <hr />
        <SSE />
      </div>
    </QueryClientProvider>
  )
}

export default App
