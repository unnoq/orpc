/// <reference lib="dom" />

import wcmatch from 'wildcard-match'
import {
  type CustomErrorParams,
  type ZodEffects,
  type ZodType,
  type ZodTypeDef,
  custom,
} from 'zod'

export type CustomZodType = 'File' | 'Blob' | 'Invalid Date' | 'RegExp' | 'URL'

const customZodTypeSymbol = Symbol('customZodTypeSymbol')

const customZodFileMimeTypeSymbol = Symbol('customZodFileMimeTypeSymbol')

type CustomParams = CustomErrorParams & {
  fatal?: boolean
}

export function getCustomZodType(def: ZodTypeDef): CustomZodType | undefined {
  return customZodTypeSymbol in def
    ? (def[customZodTypeSymbol] as CustomZodType)
    : undefined
}

export function getCustomZodFileMimeType(def: ZodTypeDef): string | undefined {
  return customZodFileMimeTypeSymbol in def
    ? (def[customZodFileMimeTypeSymbol] as string)
    : undefined
}

function composeParams<T = unknown>(options: {
  params?: string | CustomParams | ((input: T) => CustomParams)
  defaultMessage?: string | ((input: T) => string)
}): (input: T) => CustomParams {
  return (val) => {
    const defaultMessage =
      typeof options.defaultMessage === 'function'
        ? options.defaultMessage(val)
        : options.defaultMessage

    if (!options.params) {
      return {
        message: defaultMessage,
      }
    }

    if (typeof options.params === 'function') {
      return {
        message: defaultMessage,
        ...options.params(val),
      }
    }

    if (typeof options.params === 'object') {
      return {
        message: defaultMessage,
        ...options.params,
      }
    }

    return {
      message: options.params,
    }
  }
}

export function file(
  params?: string | CustomParams | ((input: unknown) => CustomParams),
): ZodType<InstanceType<typeof File>, ZodTypeDef, InstanceType<typeof File>> & {
  type(
    mimeType: string,
    params?: string | CustomParams | ((input: unknown) => CustomParams),
  ): ZodEffects<
    ZodType<InstanceType<typeof File>, ZodTypeDef, InstanceType<typeof File>>,
    InstanceType<typeof File>,
    InstanceType<typeof File>
  >
} {
  const schema = custom<InstanceType<typeof File>>(
    (val) => val instanceof File,
    composeParams({ params, defaultMessage: 'Input is not a file' }),
  )

  Object.assign(schema._def, {
    [customZodTypeSymbol]: 'File' satisfies CustomZodType,
  })

  return Object.assign(schema, {
    type: (
      mimeType: string,
      params: string | CustomParams | ((input: unknown) => CustomParams),
    ) => {
      const isMatch = wcmatch(mimeType)

      const refinedSchema = schema.refine(
        (val) => isMatch(val.type.split(';')[0]!),
        composeParams<InstanceType<typeof File>>({
          params,
          defaultMessage: (val) =>
            `Expected a file of type ${mimeType} but got a file of type ${val.type || 'unknown'}`,
        }),
      )

      Object.assign(refinedSchema._def, {
        [customZodTypeSymbol]: 'File' satisfies CustomZodType,
        [customZodFileMimeTypeSymbol]: mimeType,
      })

      return refinedSchema
    },
  })
}

export function blob(
  params?: string | CustomParams | ((input: unknown) => CustomParams),
): ZodType<InstanceType<typeof Blob>, ZodTypeDef, InstanceType<typeof Blob>> {
  const schema = custom<InstanceType<typeof Blob>>(
    (val) => val instanceof Blob,
    composeParams({ params, defaultMessage: 'Input is not a blob' }),
  )

  Object.assign(schema._def, {
    [customZodTypeSymbol]: 'Blob' satisfies CustomZodType,
  })

  return schema
}

export function invalidDate(
  params?: string | CustomParams | ((input: unknown) => CustomParams),
): ZodType<Date, ZodTypeDef, Date> {
  const schema = custom<Date>(
    (val) => val instanceof Date && Number.isNaN(val.getTime()),
    composeParams({ params, defaultMessage: 'Input is not an invalid date' }),
  )

  Object.assign(schema._def, {
    [customZodTypeSymbol]: 'Invalid Date' satisfies CustomZodType,
  })

  return schema
}

export function regexp(
  options?: CustomParams,
): ZodType<RegExp, ZodTypeDef, RegExp> {
  const schema = custom<RegExp>(
    (val) => val instanceof RegExp,
    composeParams({ params: options, defaultMessage: 'Input is not a regexp' }),
  )

  Object.assign(schema._def, {
    [customZodTypeSymbol]: 'RegExp' satisfies CustomZodType,
  })

  return schema
}

export function url(options?: CustomParams): ZodType<URL, ZodTypeDef, URL> {
  const schema = custom<URL>(
    (val) => val instanceof URL,
    composeParams({ params: options, defaultMessage: 'Input is not a URL' }),
  )

  Object.assign(schema._def, {
    [customZodTypeSymbol]: 'URL' satisfies CustomZodType,
  })

  return schema
}

export const oz = {
  file,
  blob,
  invalidDate,
  regexp,
  url,
}
