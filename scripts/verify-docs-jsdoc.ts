import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { parseArgs } from 'node:util'
import ts from 'typescript'

/**
 * Verifies that every `@orpc/*` API mentioned in the docs content (apps/content/docs)
 * carries a JSDoc comment with a valid backlink to https://orpc.dev on its declaration.
 *
 * Usage: node scripts/verify-docs-jsdoc.ts [--filter server,client] [--strict] [--list]
 */

const ROOT_DIR = process.cwd()
const DOCS_DIR = path.join(ROOT_DIR, 'apps/content/docs')
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages')
const DOCS_URL_PREFIX = 'https://orpc.dev/docs/'

/**
 * Justified exceptions, keyed by `<specifier>#<name>`, value is the reason.
 */
const ALLOWLIST: Record<string, string> = {}

interface Mention {
  specifier: string
  name: string
  pages: Set<string>
}

interface DocPage {
  file: string
  raw: string
  /** Cleaned text of the page's first heading. */
  title: string
  /** Heading slug -> cleaned heading text. */
  slugs: Map<string, string>
}

interface Issue {
  severity: 'error' | 'warning'
  code: string
  message: string
  /** Display group, e.g. the mention's specifier or `packages/<dir>` for scanned links. */
  group: string
  /** Display label, e.g. the mentioned symbol name or `link` for scanned links. */
  label: string
  location?: string
  note?: string
}

async function findFiles(dir: string, extension: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const result: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      result.push(...await findFiles(fullPath, extension))
    }
    else if (entry.isFile() && entry.name.endsWith(extension)) {
      result.push(fullPath)
    }
  }

  return result.sort()
}

const FENCE_OPEN_RE = /^\s*(`{3,})(\S*)/
const CODE_LANGS = new Set(['ts', 'typescript', 'tsx', 'js', 'jsx', 'vue', 'svelte'])

function extractCodeFences(markdown: string): { code: string[], outside: string[] } {
  const code: string[] = []
  const outside: string[] = []
  let fence: { marker: string, lines: string[], isCode: boolean } | undefined

  for (const line of markdown.split('\n')) {
    if (fence) {
      const close = line.match(/^\s*(`{3,})\s*$/)

      if (close && close[1]!.length >= fence.marker.length) {
        if (fence.isCode) {
          code.push(fence.lines.join('\n'))
        }
        fence = undefined
        continue
      }

      fence.lines.push(line)
      continue
    }

    const open = line.match(FENCE_OPEN_RE)

    if (open) {
      const lang = open[2]!.split(/[\s[{:]/)[0] ?? ''
      fence = { marker: open[1]!, lines: [], isCode: CODE_LANGS.has(lang) }
      continue
    }

    outside.push(line)
  }

  return { code, outside }
}

const IMPORT_RE = /import\s+(?:type\s+)?(?:[\w$]+\s*,\s*)?\{([^}]+)\}\s*from\s*['"](@orpc\/[^'"]+)['"]/g

function collectImportedNames(code: string): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()

  for (const match of code.matchAll(IMPORT_RE)) {
    const specifier = match[2]!
    let names = result.get(specifier)

    if (!names) {
      names = new Set()
      result.set(specifier, names)
    }

    for (const rawName of match[1]!.split(',')) {
      const name = rawName.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]?.trim()

      if (name && /^[\w$]+$/.test(name)) {
        names.add(name)
      }
    }
  }

  return result
}

/**
 * Mirrors VitePress' default heading slugification (the @mdit-vue/shared `slugify`):
 * special characters become dashes, dashes collapse, leading digits get a `_` prefix.
 */
function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F]/g, '')
    .replace(/[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'\u201C\u201D\u2018\u2019<>,.?/]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^(\d)/, '_$1')
    .toLowerCase()
}

function cleanHeadingText(text: string): string {
  return text
    .replace(/\{#[\w-]+\}\s*$/, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*]/g, '')
    .replace(/\\(.)/g, '$1')
    .trim()
}

function extractHeadings(outsideFenceLines: string[]): { title: string, slugs: Map<string, string> } {
  const slugs = new Map<string, string>()
  const counts = new Map<string, number>()
  let title = ''

  for (const line of outsideFenceLines) {
    const heading = line.match(/^#{1,6}\s(.*)$/)

    if (!heading) {
      continue
    }

    const rawText = heading[1]!.trim()
    const text = cleanHeadingText(rawText)
    title ||= text
    const custom = rawText.match(/\{#([\w-]+)\}\s*$/)

    if (custom) {
      slugs.set(custom[1]!, text)
      continue
    }

    const slug = slugify(text)
    const count = counts.get(slug) ?? 0
    counts.set(slug, count + 1)
    slugs.set(count === 0 ? slug : `${slug}-${count}`, text)
  }

  return { title, slugs }
}

async function collectDocs(): Promise<{ mentions: Map<string, Mention>, pages: Map<string, DocPage> }> {
  const mentions = new Map<string, Mention>()
  const pages = new Map<string, DocPage>()

  for (const file of await findFiles(DOCS_DIR, '.md')) {
    const raw = await readFile(file, 'utf8')
    const relPage = path.relative(DOCS_DIR, file).replace(/\.md$/, '').replaceAll(path.sep, '/')
    const { code, outside } = extractCodeFences(raw)

    pages.set(relPage.replace(/\/index$/, '') || 'index', {
      file,
      raw,
      ...extractHeadings(outside),
    })

    for (const fence of code) {
      for (const [specifier, names] of collectImportedNames(fence)) {
        for (const name of names) {
          const key = `${specifier}#${name}`
          let mention = mentions.get(key)

          if (!mention) {
            mention = { specifier, name, pages: new Set() }
            mentions.set(key, mention)
          }

          mention.pages.add(relPage)
        }
      }
    }
  }

  return { mentions, pages }
}

interface Entrypoints {
  /** `@orpc/name[/sub]` -> absolute source file */
  specifierToFile: Map<string, string>
  /** `@orpc/name` -> package directory name under packages/ */
  packageNameToDir: Map<string, string>
}

function firstStringValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) {
      const found = firstStringValue(nested)

      if (found) {
        return found
      }
    }
  }

  return undefined
}

async function loadEntrypoints(): Promise<Entrypoints> {
  const specifierToFile = new Map<string, string>()
  const packageNameToDir = new Map<string, string>()
  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const packageDir = path.join(PACKAGES_DIR, entry.name)
    let packageJson: { name?: string, exports?: Record<string, unknown> }

    try {
      packageJson = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'))
    }
    catch {
      continue
    }

    const packageName = packageJson.name

    if (!packageName || !packageJson.exports) {
      continue
    }

    packageNameToDir.set(packageName, entry.name)

    for (const [subpath, value] of Object.entries(packageJson.exports)) {
      if (subpath === './package.json') {
        continue
      }

      const target = firstStringValue(value)

      if (!target || !target.endsWith('.ts')) {
        continue
      }

      const specifier = subpath === '.' ? packageName : `${packageName}/${subpath.slice(2)}`
      specifierToFile.set(specifier, path.resolve(packageDir, target))
    }
  }

  return { specifierToFile, packageNameToDir }
}

function getJsDocText(declaration: ts.Declaration): string {
  const sourceFile = declaration.getSourceFile()

  return ts.getJSDocCommentsAndTags(declaration)
    .filter(ts.isJSDoc)
    .map(doc => doc.getText(sourceFile))
    .join('\n')
}

function formatLocation(declaration: ts.Declaration): string {
  const sourceFile = declaration.getSourceFile()
  const { line } = sourceFile.getLineAndCharacterOfPosition(declaration.getStart())

  return `${path.relative(ROOT_DIR, sourceFile.fileName)}:${line + 1}`
}

const SEE_LINK_RE = /@see\s+\{@link\s+(https:\/\/orpc\.dev\/[^\s}|]+)(?:\s*\|([^}]*))?\}/g
const LEGACY_TAG_RES: [RegExp, string][] = [
  [/@info\b/, 'non-standard @info tag (use @remarks with **Note**:)'],
  [/@warning\b/, 'non-standard @warning tag (use @remarks with **Warning**:)'],
  [/\{@see\s/, '{@see ...} misuse (use {@link ...})'],
  [/@return\s/, '@return tag (use @returns)'],
  [/\{@link\s+https:\/\/orpc\.dev\/\S+[^\S\n]+[^|}\s]/, 'space-form {@link url Title} (use {@link url | Title})'],
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface CheckContext {
  pages: Map<string, DocPage>
  strict: boolean
  issues: Issue[]
}

function checkMention(
  context: CheckContext,
  mention: Mention,
  declarations: ts.Declaration[],
): void {
  const { pages, strict, issues } = context
  const primary = declarations[0]
  const location = primary ? formatLocation(primary) : undefined
  const jsDocText = declarations.map(getJsDocText).filter(Boolean).join('\n')

  const report = (severity: 'error' | 'warning', code: string, message: string): void => {
    issues.push({
      severity,
      code,
      message,
      group: mention.specifier,
      label: mention.name,
      location,
      note: `mentioned in: ${[...mention.pages].sort().slice(0, 3).join(', ')}`,
    })
  }

  if (!jsDocText.trim()) {
    report('error', 'E2', 'declaration has no JSDoc comment')
    return
  }

  const links = [...jsDocText.matchAll(SEE_LINK_RE)]
    .map(match => ({ url: match[1]!, title: match[2]?.trim() }))

  if (links.length === 0) {
    report('error', 'E3', 'JSDoc has no @see {@link https://orpc.dev/docs/...} backlink')
    return
  }

  for (const { url, title } of links) {
    if (!url.startsWith(DOCS_URL_PREFIX)) {
      report('error', 'E4', `backlink ${url} does not point under ${DOCS_URL_PREFIX}`)
      continue
    }

    const [pagePath = '', anchor] = url.slice(DOCS_URL_PREFIX.length).split('#')
    const page = pages.get(pagePath)

    if (!page) {
      report('error', 'E4', `backlink page "${pagePath}" has no apps/content/docs/${pagePath}.md`)
      continue
    }

    if (anchor !== undefined && !page.slugs.has(anchor)) {
      report('error', 'E5', `anchor "#${anchor}" not found in apps/content/docs/${pagePath}.md`)
      continue
    }

    const anchorHeading = anchor !== undefined ? page.slugs.get(anchor) : undefined
    const expectedTitle = anchorHeading && anchorHeading !== page.title
      ? `${page.title} - ${anchorHeading}`
      : page.title

    if (title !== expectedTitle) {
      report('error', 'E6', `link title should be "| ${expectedTitle}"${title ? ` (found "| ${title}")` : ' (title missing)'}`)
      continue
    }

    const wordRe = new RegExp(`\\b${escapeRegExp(mention.name)}\\b`)

    if (!wordRe.test(page.raw)) {
      report(strict ? 'error' : 'warning', 'W1', `linked page "${pagePath}" never mentions "${mention.name}"`)
    }
  }

  for (const [legacyRe, description] of LEGACY_TAG_RES) {
    if (legacyRe.test(jsDocText)) {
      report('warning', 'W2', description)
    }
  }
}

const ORPC_DOCS_URL_RE = /https:\/\/orpc\.dev\/docs\/[^\s)}\]|'"`]+/g

/**
 * Validates that every `https://orpc.dev/docs/...` URL appearing anywhere in package
 * sources (inline markdown links, member-level docs, ...) points to an existing
 * content page and heading. Existence only — titles are enforced on `@see` tags.
 */
async function scanSourceLinks(context: CheckContext, filterDirs: Set<string> | undefined): Promise<number> {
  let scanned = 0
  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory() || (filterDirs && !filterDirs.has(entry.name))) {
      continue
    }

    const srcDir = path.join(PACKAGES_DIR, entry.name, 'src')
    let files: string[]

    try {
      files = [...await findFiles(srcDir, '.ts'), ...await findFiles(srcDir, '.tsx')]
    }
    catch {
      continue
    }

    for (const file of files) {
      if (/\.(?:test|test-d|bench)\./.test(file) || file.includes('__tests__') || file.includes('__mocks__')) {
        continue
      }

      const lines = (await readFile(file, 'utf8')).split('\n')

      for (const [index, line] of lines.entries()) {
        for (const match of line.matchAll(ORPC_DOCS_URL_RE)) {
          const url = match[0].replace(/[.,;:]+$/, '')
          scanned += 1

          const report = (code: string, message: string): void => {
            context.issues.push({
              severity: 'error',
              code,
              message,
              group: `packages/${entry.name}`,
              label: 'link',
              location: `${path.relative(ROOT_DIR, file)}:${index + 1}`,
            })
          }

          const [pagePath = '', anchor] = url.slice(DOCS_URL_PREFIX.length).split('#')
          const page = context.pages.get(pagePath)

          if (!page) {
            report('E4', `link page "${pagePath}" has no apps/content/docs/${pagePath}.md`)
            continue
          }

          if (anchor !== undefined && !page.slugs.has(anchor)) {
            report('E5', `anchor "#${anchor}" not found in apps/content/docs/${pagePath}.md`)
          }
        }
      }
    }
  }

  return scanned
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      filter: { type: 'string' },
      strict: { type: 'boolean', default: false },
      list: { type: 'boolean', default: false },
    },
  })

  const [{ mentions, pages }, entrypoints] = await Promise.all([collectDocs(), loadEntrypoints()])

  const packageDirOf = (specifier: string): string | undefined => {
    const packageName = specifier.split('/').slice(0, 2).join('/')
    return entrypoints.packageNameToDir.get(packageName)
  }

  const filterDirs = values.filter ? new Set(values.filter.split(',').map(part => part.trim())) : undefined
  const selected = [...mentions.values()]
    .filter(mention => !filterDirs || filterDirs.has(packageDirOf(mention.specifier) ?? ''))
    .sort((a, b) => a.specifier.localeCompare(b.specifier) || a.name.localeCompare(b.name))

  if (values.list) {
    for (const mention of selected) {
      console.log(`${mention.specifier}#${mention.name}\t${[...mention.pages].sort().join(', ')}`)
    }

    console.log(`\n${selected.length} docs-mentioned symbols`)
    return
  }

  const entryFiles = new Set<string>()
  const unknownSpecifiers = new Set<string>()

  for (const mention of selected) {
    const entryFile = entrypoints.specifierToFile.get(mention.specifier)

    if (entryFile) {
      entryFiles.add(entryFile)
    }
    else {
      unknownSpecifiers.add(mention.specifier)
    }
  }

  const program = ts.createProgram([...entryFiles], {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    noEmit: true,
  })

  const checker = program.getTypeChecker()
  const moduleExportsCache = new Map<string, Map<string, ts.Symbol>>()

  const getModuleExports = (entryFile: string): Map<string, ts.Symbol> | undefined => {
    const cached = moduleExportsCache.get(entryFile)

    if (cached) {
      return cached
    }

    const sourceFile = program.getSourceFile(entryFile)
    const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile)

    if (!moduleSymbol) {
      return undefined
    }

    const exportsMap = new Map<string, ts.Symbol>()

    for (const exportSymbol of checker.getExportsOfModule(moduleSymbol)) {
      exportsMap.set(exportSymbol.name, exportSymbol)
    }

    moduleExportsCache.set(entryFile, exportsMap)
    return exportsMap
  }

  const context: CheckContext = { pages, strict: values.strict, issues: [] }
  let allowlisted = 0

  for (const mention of selected) {
    const key = `${mention.specifier}#${mention.name}`

    if (ALLOWLIST[key]) {
      allowlisted += 1
      continue
    }

    if (unknownSpecifiers.has(mention.specifier)) {
      context.issues.push({
        severity: 'error',
        code: 'E1',
        message: `docs import from unknown entrypoint "${mention.specifier}"`,
        group: mention.specifier,
        label: mention.name,
      })
      continue
    }

    const entryFile = entrypoints.specifierToFile.get(mention.specifier)!
    const moduleExports = getModuleExports(entryFile)
    const symbol = moduleExports?.get(mention.name)

    if (!symbol) {
      context.issues.push({
        severity: 'error',
        code: 'E1',
        message: `"${mention.name}" is not exported from ${mention.specifier}`,
        group: mention.specifier,
        label: mention.name,
      })
      continue
    }

    const symbols = [symbol]

    if (symbol.flags & ts.SymbolFlags.Alias) {
      symbols.push(checker.getAliasedSymbol(symbol))
    }

    const declarations = symbols.flatMap(part => part.declarations ?? [])
      .sort((a, b) => (ts.isExportSpecifier(a) ? 1 : 0) - (ts.isExportSpecifier(b) ? 1 : 0))

    checkMention(context, mention, declarations)
  }

  const scannedLinks = await scanSourceLinks(context, filterDirs)

  const errors = context.issues.filter(issue => issue.severity === 'error')
  const warnings = context.issues.filter(issue => issue.severity === 'warning')
  const byGroup = new Map<string, Issue[]>()

  for (const issue of context.issues) {
    const group = byGroup.get(issue.group) ?? []
    group.push(issue)
    byGroup.set(issue.group, group)
  }

  for (const [group, issues] of [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`\n${group}`)

    for (const issue of issues) {
      const severityLabel = issue.severity === 'error' ? 'error' : 'warn '
      console.log(`  ${severityLabel} [${issue.code}] ${issue.label}  ${issue.location ?? '(unresolved)'}`)
      console.log(`        ${issue.message}${issue.note ? ` (${issue.note})` : ''}`)
    }
  }

  const allowlistNote = allowlisted > 0 ? `, ${allowlisted} allowlisted` : ''
  console.log(`\n${errors.length} errors, ${warnings.length} warnings across ${selected.length} docs-mentioned symbols and ${scannedLinks} orpc.dev links${allowlistNote}`)

  if (errors.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
