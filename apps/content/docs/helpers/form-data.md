---
title: Form Data Helpers
description: Utilities for parsing form data and handling validation errors with bracket notation support.
---

# Form Data Helpers

Form data helpers provide utilities for parsing HTML form data and extracting validation error messages, with full support for [bracket notation](/docs/openapi/bracket-notation) to handle complex nested structures.

## `parseFormData`

Parses HTML form data using [bracket notation](/docs/openapi/bracket-notation) to deserialize complex nested objects and arrays.

```ts twoslash
import { parseFormData } from '@orpc/openapi-client/helpers'

const form = new FormData()
form.append('name', 'John')
form.append('user[email]', 'john@example.com')
form.append('user[hobbies][]', 'reading')
form.append('user[hobbies][]', 'gaming')

const parsed = parseFormData(form)
// Result:
// {
//   name: 'John',
//   user: {
//     email: 'john@example.com',
//     hobbies: ['reading', 'gaming']
//   }
// }
```

## `getIssueMessage`

Extracts validation error messages from [standard schema](https://github.com/standard-schema/standard-schema) issues using [bracket notation](/docs/openapi/bracket-notation) paths.

```ts twoslash
import { getIssueMessage } from '@orpc/openapi-client/helpers'

const error = {
  data: {
    issues: [
      {
        path: ['user', 'email'],
        message: 'Invalid email format'
      }
    ]
  }
}

const emailError = getIssueMessage(error, 'user[email]')
// Returns: 'Invalid email format'

const tagError = getIssueMessage(error, 'user[tags][]')
// Returns error message for any array item

const anyError = getIssueMessage('anything', 'path')
// Returns undefined if cannot find issue
```

::: warning
The `getIssueMessage` utility works with any data type but requires validation errors to follow the [standard schema issue format](https://github.com/standard-schema/standard-schema?tab=readme-ov-file#the-interface). It looks for issues in the `data.issues` property. If you use custom [validation errors](/docs/advanced/validation-errors), store them elsewhere, or modify the issue format, `getIssueMessage` may not work as expected.
:::

## Usage Example

```tsx
import { getIssueMessage, parseFormData } from '@orpc/openapi-client/helpers'

export function ContactForm() {
  const [error, setError] = useState()

  const handleSubmit = (form: FormData) => {
    try {
      const data = parseFormData(form)
      // Process structured data
    }
    catch (error) {
      setError(error)
    }
  }

  return (
    <form action={handleSubmit}>
      <input name="user[name]" type="text" />
      <span>{getIssueMessage(error, 'user[name]')}</span>

      <input name="user[emails][]" type="email" />
      <span>{getIssueMessage(error, 'user[emails][]')}</span>

      <button type="submit">Submit</button>
    </form>
  )
}
```
