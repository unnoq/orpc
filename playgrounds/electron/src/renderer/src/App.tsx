import { CreatePlanetMutationForm } from './components/orpc-mutation'
import { ListPlanetsQuery } from './components/orpc-query'

function App(): React.JSX.Element {
  return (
    <div>
      <h1>ORPC Playground</h1>
      <hr />
      <CreatePlanetMutationForm />
      <hr />
      <ListPlanetsQuery />
    </div>
  )
}

export default App
