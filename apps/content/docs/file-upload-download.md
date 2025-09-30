---
title: File Upload and Download
description: Learn how to upload and download files using oRPC.
---

# File Operations in oRPC

oRPC natively supports standard [File](https://developer.mozilla.org/en-US/docs/Web/API/File) and [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) objects. You can even combine files with complex data structures like arrays and objects for upload and download operations.

:::tip File Uploads
For uploading files larger than 100 MB, we recommend using a dedicated upload solution or [extending the body parser](/docs/advanced/extend-body-parser) for better performance and reliability, as oRPC does not support chunked or resumable uploads.
:::

:::tip File Downloads
For downloading files, we recommend using **lazy file** libraries like [@mjackson/lazy-file](https://www.npmjs.com/package/@mjackson/lazy-file) or [Bun.file](https://bun.com/docs/api/file-io#reading-files-bun-file) to reduce memory usage.
:::

## Example

```ts twoslash
import { os } from '@orpc/server'
import * as z from 'zod'
// ---cut---
const example = os
  .input(z.object({ file: z.file() }))
  .output(z.instanceof(File))
  .handler(async ({ input }) => {
    console.log(input.file.name)

    return new File(['Hello World'], 'hello.txt', { type: 'text/plain' })
  })
```
