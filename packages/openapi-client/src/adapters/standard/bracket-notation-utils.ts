import { isSchemaIssue } from '@orpc/contract'
import { isTypescriptObject } from '@orpc/shared'
import { StandardBracketNotationSerializer } from './bracket-notation'

/**
 * parse a form data with bracket notation
 *
 * @example
 * ```ts
 * const form = new FormData()
 * form.append('a', '1')
 * form.append('user[name]', 'John')
 * form.append('user[age]', '20')
 * form.append('user[friends][]', 'Bob')
 * form.append('user[friends][]', 'Alice')
 * form.append('user[friends][]', 'Charlie')
 * form.append('thumb', new Blob(['hello']), 'thumb.png')
 *
 * parseFormData(form)
 * // {
 * //   a: '1',
 * //   user: {
 * //     name: 'John',
 * //     age: '20',
 * //     friends: ['Bob', 'Alice', 'Charlie'],
 * //   },
 * //   thumb: form.get('thumb'),
 * // }
 * ```
 *
 * @see {@link https://orpc.unnoq.com/docs/openapi/bracket-notation Bracket Notation Docs}
 */
export function parseFormData(form: FormData): any {
  const serializer = new StandardBracketNotationSerializer()
  return serializer.deserialize(Array.from(form.entries())) as any
}

/**
 * Get the issue message from the error.
 *
 * @param error - The error (can be anything) can contain `data.issues` (standard schema issues)
 * @param path - The path of the field that has the issue follow [bracket notation](https://orpc.unnoq.com/docs/openapi/bracket-notation)
 *
 * @example
 * ```tsx
 * const { error, data, execute } = useServerAction(someAction)
 *
 * return <form action={(form) => execute(parseFormData(form))}>
 *   <input name="user[name]" type="text" />
 *   <p>{getIssueMessage(error, 'user[name]')}</p>
 *
 *   <input name="user[age]" type="number" />
 *   <p>{getIssueMessage(error, 'user[age]')}</p>
 *
 *   <input name="images[]" type="file" />
 *   <p>{getIssueMessage(error, 'images[]')}</p>
 * </form>
 *
 */
export function getIssueMessage(error: unknown, path: string): string | undefined {
  if (!isTypescriptObject(error) || !isTypescriptObject(error.data) || !Array.isArray(error.data.issues)) {
    return undefined
  }

  const serializer = new StandardBracketNotationSerializer()

  for (const issue of error.data.issues) {
    if (!isSchemaIssue(issue)) {
      continue
    }

    if (issue.path === undefined) {
      if (path === '') {
        return issue.message
      }

      continue
    }

    const issuePath = serializer.stringifyPath(
      issue.path.map(segment => typeof segment === 'object' ? segment.key.toString() : segment.toString()),
    )

    if (issuePath === path) {
      return issue.message
    }

    if (path.endsWith('[]') && issuePath.replace(/\[(?:0|[1-9]\d*)\]$/, '[]') === path) {
      return issue.message
    }

    if (path === '' && issuePath.match(/(?:0|[1-9]\d*)$/)) {
      return issue.message
    }
  }
}
