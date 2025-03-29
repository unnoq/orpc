import { redirectToScalarForm } from './actions'
import { CreatePlanetMutationForm } from './orpc-mutation'
import { ListPlanetsQuery } from './orpc-query'
import { OrpcServerAction } from './orpc-server-action'

export default function Home() {
  return (
    <div>
      <h1>ORPC Playground</h1>
      <p>
        You can visit the
        {' '}
        <form action={redirectToScalarForm}>
          <input type="text" name="user[name]" defaultValue="unnoq" hidden />
          <input type="text" name="user[age]" defaultValue="18" hidden />
          <button type="submit">Redirect to Scalar Client Page</button>
        </form>
        {' '}
        page.
      </p>
      <hr />
      <OrpcServerAction />
      <hr />
      <CreatePlanetMutationForm />
      <hr />
      <ListPlanetsQuery />
    </div>
  )
}
