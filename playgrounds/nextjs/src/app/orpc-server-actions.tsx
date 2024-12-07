'use client'

import { createPlanetFA } from '@/actions/planet'

export function CreatePlanetServerAction() {
  return (
    <div>
      <h2>oRPC and Server Actions | Create Planet example</h2>

      <form action={(form) => {
        createPlanetFA(form).then((planet) => {
          alert(`Planet created.`)
        })
      }}
      >
        <label>
          Name
          <input type="text" name="name" required />
        </label>
        <label>
          Description
          <textarea name="description" />
        </label>
        <label>
          Image
          <input type="file" name="image" accept="image/*" required />
        </label>
        <button type="submit">Submit</button>
      </form>
    </div>
  )
}
