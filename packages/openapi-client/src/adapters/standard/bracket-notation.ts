import type { Segment } from '@orpc/shared'
import { isObject, NullProtoObj } from '@orpc/shared'

export type StandardBracketNotationSerialized = [string, unknown][]

export interface StandardBracketNotationSerializerOptions {
  /**
   * Maximum allowed array index for bracket notation deserialization.
   *
   * This helps protect against memory exhaustion attacks where malicious input
   * uses extremely large array indices (e.g., `?arr[4294967296]=value`).
   *
   * While bracket notation creates sparse arrays that handle large indices efficiently,
   * downstream code might inadvertently convert these sparse arrays to dense arrays,
   * potentially creating millions of undefined elements and causing memory issues.
   *
   * @note Only applies to deserialization.
   * @default 9_999 (array with 10,000 elements)
   */
  maxBracketNotationArrayIndex?: number
}

export class StandardBracketNotationSerializer {
  private readonly maxArrayIndex: number

  constructor(options: StandardBracketNotationSerializerOptions = {}) {
    this.maxArrayIndex = options.maxBracketNotationArrayIndex ?? 9_999
  }

  serialize(data: unknown, segments: Segment[] = [], result: StandardBracketNotationSerialized = []): StandardBracketNotationSerialized {
    if (Array.isArray(data)) {
      data.forEach((item, i) => {
        this.serialize(item, [...segments, i], result)
      })
    }

    else if (isObject(data)) {
      for (const key in data) {
        this.serialize(data[key], [...segments, key], result)
      }
    }

    else {
      result.push([this.stringifyPath(segments), data])
    }

    return result
  }

  deserialize(serialized: StandardBracketNotationSerialized): Record<string, unknown> | unknown[] {
    if (serialized.length === 0) {
      return {}
    }

    const arrayPushStyles = new WeakSet()
    const ref: { value: Record<string, unknown> | unknown[] } = { value: [] }

    for (const [path, value] of serialized) {
      const segments = this.parsePath(path)

      let currentRef: any = ref
      let nextSegment: string = 'value'

      segments.forEach((segment, i) => {
        if (!Array.isArray(currentRef[nextSegment]) && !isObject(currentRef[nextSegment])) {
          currentRef[nextSegment] = []
        }

        if (i !== segments.length - 1) {
          if (Array.isArray(currentRef[nextSegment]) && !isValidArrayIndex(segment, this.maxArrayIndex)) {
            if (arrayPushStyles.has(currentRef[nextSegment])) {
              arrayPushStyles.delete(currentRef[nextSegment])
              currentRef[nextSegment] = pushStyleArrayToObject(currentRef[nextSegment])
            }
            else {
              currentRef[nextSegment] = arrayToObject(currentRef[nextSegment])
            }
          }
        }
        else {
          if (Array.isArray(currentRef[nextSegment])) {
            if (segment === '') {
              if (currentRef[nextSegment].length && !arrayPushStyles.has(currentRef[nextSegment])) {
                currentRef[nextSegment] = arrayToObject(currentRef[nextSegment])
              }
            }
            else {
              if (arrayPushStyles.has(currentRef[nextSegment])) {
                arrayPushStyles.delete(currentRef[nextSegment])
                currentRef[nextSegment] = pushStyleArrayToObject(currentRef[nextSegment])
              }

              else if (!isValidArrayIndex(segment, this.maxArrayIndex)) {
                currentRef[nextSegment] = arrayToObject(currentRef[nextSegment])
              }
            }
          }
        }

        currentRef = currentRef[nextSegment]
        nextSegment = segment
      })

      if (Array.isArray(currentRef) && nextSegment === '') {
        arrayPushStyles.add(currentRef)
        currentRef.push(value)
      }
      else if (nextSegment in currentRef) {
        if (Array.isArray(currentRef[nextSegment])) {
          currentRef[nextSegment].push(value)
        }
        else {
          currentRef[nextSegment] = [currentRef[nextSegment], value]
        }
      }
      else {
        currentRef[nextSegment] = value
      }
    }

    return ref.value
  }

  stringifyPath(segments: readonly Segment[]): string {
    return segments
      .map((segment) => {
        return segment.toString().replace(/[\\[\]]/g, (match) => {
          switch (match) {
            case '\\':
              return '\\\\'
            case '[':
              return '\\['
            case ']':
              return '\\]'
            /* v8 ignore next 2 */
            default:
              return match
          }
        })
      })
      .reduce((result, segment, i) => {
        if (i === 0) {
          return segment
        }

        return `${result}[${segment}]`
      }, '')
  }

  parsePath(path: string): string[] {
    const segments: string[] = []

    let inBrackets = false
    let currentSegment = ''
    let backslashCount = 0

    for (let i = 0; i < path.length; i++) {
      const char = path[i]!
      const nextChar = path[i + 1]

      if (inBrackets && char === ']' && (nextChar === undefined || nextChar === '[') && backslashCount % 2 === 0) {
        if (nextChar === undefined) {
          inBrackets = false
        }

        segments.push(currentSegment)
        currentSegment = ''
        i++
      }

      else if (segments.length === 0 && char === '[' && backslashCount % 2 === 0) {
        inBrackets = true
        segments.push(currentSegment)
        currentSegment = ''
      }

      else if (char === '\\') {
        backslashCount++
      }

      else {
        currentSegment += '\\'.repeat(backslashCount / 2) + char
        backslashCount = 0
      }
    }

    return inBrackets || segments.length === 0 ? [path] : segments
  }
}

function isValidArrayIndex(value: string, maxIndex: number): boolean {
  return /^0$|^[1-9]\d*$/.test(value) && Number(value) <= maxIndex
}

function arrayToObject(array: any[]): Record<string, unknown> {
  const obj = new NullProtoObj()

  array.forEach((item, i) => {
    obj[i] = item
  })

  return obj
}

function pushStyleArrayToObject(array: any[]): Record<string, unknown> {
  const obj = new NullProtoObj()

  obj[''] = array.length === 1 ? array[0] : array

  return obj
}
