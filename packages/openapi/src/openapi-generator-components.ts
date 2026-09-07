import type { JsonSchema, JsonSchemaConverterDirection } from '@orpc/json-schema'
import type { OpenAPIV3_2 } from './types'
import {
  decodeJsonPointerSegment,
  encodeJsonPointerSegment,
  ensureJsonSchemaObject,
  mapJsonSchemaRefs,
} from '@orpc/json-schema'
import { isDeepEqual } from '@orpc/shared'

/**
 * Collects reusable schemas into `doc.components.schemas`.
 *
 * Equivalent schemas (including recursive ones) reuse a single component, and different
 * schemas competing for the same name get direction-suffixed or numbered postfixes.
 */
export class OpenAPIComponentRegistry {
  constructor(
    private readonly doc: OpenAPIV3_2.OpenAPIObject,
    private readonly customComponentName: ((defName: string, defSchema: JsonSchema) => string | undefined) | undefined,
  ) {}

  /**
   * Registers `schema` as a component under `preferredName` (or an equivalent/postfixed name)
   * and returns a `$ref` to it.
   */
  register(preferredName: string, schema: Exclude<JsonSchema, boolean>): JsonSchema {
    const { $defs, ...body } = schema

    // the schema can carry its own local $defs, keep the registered name unique among them
    let defName = preferredName
    if ($defs) {
      for (let i = 2; defName in $defs; i++) {
        defName = `${preferredName}${i}`
      }
    }

    return this.hoistDefs({
      $defs: { ...$defs, [defName]: body },
      $ref: `#/$defs/${encodeJsonPointerSegment(defName)}`,
    })
  }

  /**
   * Moves a schema's root-level `$defs` into `doc.components.schemas` and rewrites
   * its refs accordingly.
   */
  hoistDefs(schema: JsonSchema, direction?: JsonSchemaConverterDirection): JsonSchema {
    if (typeof schema !== 'object' || !schema.$defs) {
      return schema
    }

    const { $defs, ...rest } = schema
    const defs: Record<string, Exclude<JsonSchema, boolean>> = {}
    const preferredNames: Record<string, string> = {}

    for (const defName of Object.keys($defs)) {
      const defSchema = $defs[defName]

      if (defSchema === undefined) {
        continue
      }

      const normalized = ensureJsonSchemaObject(defSchema)

      defs[defName] = normalized
      preferredNames[defName] = this.customComponentName?.(defName, normalized) ?? defName
    }

    const defNames = Object.keys(defs)

    if (defNames.length === 0) {
      return schema
    }

    this.doc.components ??= {}
    this.doc.components.schemas ??= {}

    const componentsSchemas = this.doc.components.schemas
    const identityRenameMap = Object.fromEntries(
      defNames.map(defName => [defName, preferredNames[defName]!]),
    ) as Record<string, string>
    const renameMap: Record<string, string> = {}
    const pendingSchemas: { cleanSchema: Exclude<JsonSchema, boolean>, componentName: string }[] = []

    for (const defName of defNames) {
      const cleanSchema = defs[defName]!
      const candidateSchemas = Object.fromEntries(
        defNames.map(currentDefName => [
          preferredNames[currentDefName]!,
          rewriteComponentSchemaRefs(defs[currentDefName]!, {
            ...identityRenameMap,
            ...renameMap,
          }),
        ]),
      ) as Record<string, JsonSchema>
      const preferredName = preferredNames[defName]!
      const prelimSchema = candidateSchemas[preferredName]!

      const [componentName, reuseExisting] = resolveComponentName(
        componentsSchemas,
        new Set(Object.values(renameMap)),
        preferredName,
        prelimSchema,
        candidateSchemas,
        direction,
      )

      renameMap[defName] = componentName

      if (!reuseExisting) {
        pendingSchemas.push({ cleanSchema, componentName })
      }
    }

    for (const { cleanSchema, componentName } of pendingSchemas) {
      componentsSchemas[componentName] = rewriteComponentSchemaRefs(
        cleanSchema,
        renameMap,
      )
    }

    return rewriteComponentSchemaRefs(rest, renameMap)
  }

  toOpenAPISchema(schema: JsonSchema, direction?: JsonSchemaConverterDirection): OpenAPIV3_2.SchemaObject {
    return ensureJsonSchemaObject(this.hoistDefs(schema, direction))
  }
}

/**
 * Walks a def's name family until it finds an equivalent existing component to reuse or
 * runs out of family members, then fills the first free mintable slot. Equal schemas under
 * unrelated names are never merged: a different name signals a different purpose.
 *
 * The family is the bare name, the direction-suffixed names when the conversion direction
 * is known, then plain numeric postfixes (`Planet`, `PlanetOutput`, `PlanetInput`,
 * `Planet2`, ...). Every member is checked for reuse, including the opposite direction,
 * but new components are only minted under the bare, own-direction, or numeric names.
 */
function resolveComponentName(
  componentsSchemas: Record<string, any>,
  claimedNames: Set<string>,
  preferredName: string,
  schema: JsonSchema,
  candidateSchemas: Record<string, JsonSchema>,
  direction: JsonSchemaConverterDirection | undefined,
): [componentName: string, reuseExisting: boolean] {
  let mintName: string | undefined

  for (let i = 1; ; i++) {
    const [componentName, mintable, tail] = componentNameCandidate(preferredName, direction, i)
    const existingSchema = componentsSchemas[componentName]

    if (existingSchema === undefined) {
      // a sibling def can claim a slot before its schema is written, keep probing past it
      if (mintable && !claimedNames.has(componentName)) {
        mintName ??= componentName

        if (tail) {
          return [mintName, false]
        }
      }

      continue
    }

    if (areSchemasEquivalentForReuse(
      schema,
      existingSchema,
      schema,
      existingSchema,
      candidateSchemas,
      componentsSchemas,
      new Map([[preferredName, componentName]]),
      new Map([[componentName, preferredName]]),
    )) {
      return [componentName, true]
    }
  }
}

function componentNameCandidate(
  preferredName: string,
  direction: JsonSchemaConverterDirection | undefined,
  attempt: number,
): [componentName: string, mintable: boolean, tail: boolean] {
  if (attempt === 1) {
    return [preferredName, true, false]
  }

  if (direction !== undefined) {
    if (attempt === 2) {
      return [`${preferredName}${direction === 'input' ? 'Input' : 'Output'}`, true, false]
    }

    // the opposite direction is only ever reused, never minted
    if (attempt === 3) {
      return [`${preferredName}${direction === 'input' ? 'Output' : 'Input'}`, false, false]
    }

    return [`${preferredName}${attempt - 2}`, true, true]
  }

  return [`${preferredName}${attempt}`, true, true]
}

function definedKeysOf(object: Record<string, unknown>): string[] {
  // `undefined`-valued keys (e.g. `default: undefined`) are stripped during serialization,
  // so they must not affect equivalence against components from serialized documents
  return Object.keys(object).filter(key => object[key] !== undefined).sort()
}

function areSchemasEquivalentForReuse(
  candidate: unknown,
  existing: unknown,
  candidateRootSchema: JsonSchema,
  existingRootSchema: JsonSchema,
  candidateSchemas: Record<string, JsonSchema>,
  existingSchemas: Record<string, any>,
  candidateToExistingComponentNames: Map<string, string>,
  existingToCandidateComponentNames: Map<string, string>,
  visited = new WeakMap<object, WeakSet<object>>(),
): boolean {
  if (candidate === existing) {
    return true
  }

  if (typeof candidate !== typeof existing) {
    return false
  }

  if (candidate === null || existing === null) {
    return candidate === existing
  }

  if (typeof candidate !== 'object' || typeof existing !== 'object') {
    return isDeepEqual(candidate, existing)
  }

  const seenExisting = visited.get(candidate)

  if (seenExisting?.has(existing)) {
    return true
  }

  if (seenExisting) {
    seenExisting.add(existing)
  }
  else {
    visited.set(candidate, new WeakSet([existing]))
  }

  if (Array.isArray(candidate) || Array.isArray(existing)) {
    if (!Array.isArray(candidate) || !Array.isArray(existing) || candidate.length !== existing.length) {
      return false
    }

    return candidate.every((item, index) => areSchemasEquivalentForReuse(
      item,
      existing[index],
      candidateRootSchema,
      existingRootSchema,
      candidateSchemas,
      existingSchemas,
      candidateToExistingComponentNames,
      existingToCandidateComponentNames,
      visited,
    ))
  }

  const candidateObject = candidate as Record<string, unknown>
  const existingObject = existing as Record<string, unknown>
  const candidateKeys = definedKeysOf(candidateObject)
  const existingKeys = definedKeysOf(existingObject)

  if (!isDeepEqual(candidateKeys, existingKeys)) {
    return false
  }

  return candidateKeys.every((key) => {
    const candidateValue = candidateObject[key]
    const existingValue = existingObject[key]

    if (key === '$ref' && typeof candidateValue === 'string' && typeof existingValue === 'string') {
      return areSchemaRefsEquivalentForReuse(
        candidateValue,
        existingValue,
        candidateRootSchema,
        existingRootSchema,
        candidateSchemas,
        existingSchemas,
        candidateToExistingComponentNames,
        existingToCandidateComponentNames,
        visited,
      )
    }

    return areSchemasEquivalentForReuse(
      candidateValue,
      existingValue,
      candidateRootSchema,
      existingRootSchema,
      candidateSchemas,
      existingSchemas,
      candidateToExistingComponentNames,
      existingToCandidateComponentNames,
      visited,
    )
  })
}

function parseComponentRefName(ref: string): string | undefined {
  if (!ref.startsWith('#/components/schemas/')) {
    return undefined
  }

  return ref
    .slice('#/components/schemas/'.length)
    .split('/')
    .map(decodeJsonPointerSegment)
    .join('/')
}

function resolveSchemaComparisonRef(
  ref: string,
  rootSchema: JsonSchema,
  componentsSchemas: Record<string, any>,
): { schema: JsonSchema, rootSchema: JsonSchema } | undefined {
  const localDefName = parseLocalDefRefName(ref)

  if (localDefName !== undefined && typeof rootSchema === 'object' && rootSchema !== null) {
    const localDef = rootSchema.$defs?.[localDefName]

    if (localDef !== undefined) {
      return {
        schema: localDef,
        rootSchema,
      }
    }
  }

  const componentName = parseComponentRefName(ref)

  if (componentName !== undefined) {
    const componentSchema = componentsSchemas[componentName]

    if (componentSchema !== undefined) {
      return {
        schema: componentSchema,
        rootSchema: componentSchema,
      }
    }
  }

  return undefined
}

function areSchemaRefsEquivalentForReuse(
  candidateRef: string,
  existingRef: string,
  candidateRootSchema: JsonSchema,
  existingRootSchema: JsonSchema,
  candidateSchemas: Record<string, JsonSchema>,
  existingSchemas: Record<string, any>,
  candidateToExistingComponentNames: Map<string, string>,
  existingToCandidateComponentNames: Map<string, string>,
  visited: WeakMap<object, WeakSet<object>>,
): boolean {
  const candidateComponentName = parseComponentRefName(candidateRef)
  const existingComponentName = parseComponentRefName(existingRef)

  if ((candidateComponentName === undefined) !== (existingComponentName === undefined)) {
    return false
  }

  if (candidateComponentName !== undefined && existingComponentName !== undefined) {
    const mappedExisting = candidateToExistingComponentNames.get(candidateComponentName)

    if (mappedExisting !== undefined && mappedExisting !== existingComponentName) {
      return false
    }

    const mappedCandidate = existingToCandidateComponentNames.get(existingComponentName)

    if (mappedCandidate !== undefined && mappedCandidate !== candidateComponentName) {
      return false
    }

    candidateToExistingComponentNames.set(candidateComponentName, existingComponentName)
    existingToCandidateComponentNames.set(existingComponentName, candidateComponentName)
  }

  const resolvedCandidate = resolveSchemaComparisonRef(candidateRef, candidateRootSchema, candidateSchemas)
  const resolvedExisting = resolveSchemaComparisonRef(existingRef, existingRootSchema, existingSchemas)

  if (resolvedCandidate === undefined || resolvedExisting === undefined) {
    return candidateRef === existingRef
  }

  return areSchemasEquivalentForReuse(
    resolvedCandidate.schema,
    resolvedExisting.schema,
    resolvedCandidate.rootSchema,
    resolvedExisting.rootSchema,
    candidateSchemas,
    existingSchemas,
    candidateToExistingComponentNames,
    existingToCandidateComponentNames,
    visited,
  )
}

function parseLocalDefRefName(ref: string): string | undefined {
  if (!ref.startsWith('#/$defs/')) {
    return undefined
  }

  return ref
    .slice('#/$defs/'.length)
    .split('/')
    .map(decodeJsonPointerSegment)
    .join('/')
}

function rewriteComponentSchemaRefs(schema: JsonSchema, renameMap: Record<string, string>): JsonSchema {
  return mapJsonSchemaRefs(schema, (ref) => {
    const refName = parseLocalDefRefName(ref)

    if (refName === undefined) {
      return ref
    }

    const renamedName = renameMap[refName]

    if (renamedName === undefined) {
      return ref
    }

    return `#/components/schemas/${encodeJsonPointerSegment(renamedName)}`
  })
}
