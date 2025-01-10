'use client'

import { orpc } from '@/lib/orpc'
import { useInfiniteQuery } from '@tanstack/react-query'

export function ListPlanetsQuery() {
  const { data, refetch, fetchNextPage, hasNextPage, isLoading, status } = useInfiniteQuery(
    orpc.planet.list.infiniteOptions({
      input: {},
      getNextPageParam: (lastPage) => {
        return 2
      },
    }),
  )

  if (status === 'pending') {
    return <p>Loading...</p>
  }

  if (status === 'error') {
    return (
      <p>
        Something went wrong.
      </p>
    )
  }

  return (
    <div>
      <h2>oRPC and Tanstack Query | List Planets example</h2>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Description</th>
            <th>Image</th>
          </tr>
        </thead>
        <tbody>
          {data.pages.flatMap((page, i) =>
            page.map(planet => (
            // eslint-disable-next-line react/no-array-index-key
              <tr key={`${planet.id}-${i}`}>
                <td>{planet.id}</td>
                <td>{planet.name}</td>
                <td>{planet.description}</td>
                <td>{planet.imageUrl}</td>
              </tr>
            )),
          )}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan={4}>
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={!hasNextPage}
              >
                Load more
              </button>

              <button type="button" onClick={() => refetch()}>
                Refresh
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

  )
}
