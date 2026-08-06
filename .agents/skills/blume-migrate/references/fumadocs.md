# Fumadocs → Blume

Fumadocs is code-first: navigation comes from the folder tree + per-folder `meta.json`. This maps cleanly to Blume — most content passes through, and `meta.json` becomes `meta.ts`. Fumadocs v16 runs on Next.js, React Router, TanStack Start, Astro, or Waku — detect by the Fumadocs files, not by Next.js files, and adjust the teardown list to whichever host framework is present.

## Detect

- Content under **`content/docs/`** (the Fumadocs convention).
- Per-folder **`meta.json`** files.
- `fumadocs-ui` / `fumadocs-core` / `fumadocs-mdx` deps and a `source.config.ts`.
- A `loader({ baseUrl: "/docs" })` call in `lib/source.ts` (or `app/source.ts`, `src/lib/source.ts`, `source.ts`).

## Config

Fumadocs declares almost nothing Blume needs — only two things map:

- **Title** — read `package.json` `name`, prettified (drop scope, split on `-_`, Title-Case). For a generic monorepo name (`web`, `app`, `docs`…), use the repo-root directory name instead.
- **Route prefix** — the `baseUrl` in the source loader (required in Fumadocs, so it's always declared). If it's a real prefix (e.g. `/docs`), set top-level **`basePath: "/docs"`** — it prefixes every route while staying invisible to the sidebar, which matches Fumadocs' behavior. (A `content.sources` `prefix` also works but adds a wrapping nav group — only use it when you _want_ the group.) If `baseUrl` is `"/"`, serve from the site root (nothing to set).

Everything else is `defineConfig({ title })`.

**Also read `source.config.ts` `mdxOptions`** — remark/rehype plugins live there:

- `remark-math`/`rehype-katex` → nothing to configure: block math `$$…$$` renders in `.mdx` out of the box (there is **no** `markdown.math` field). Inline `$…$` is **not** supported — convert inline math to `$$…$$` or drop it (report).
- A Twoslash transformer → Blume supports the `twoslash` fence meta natively; drop the plugin.
- Custom Shiki transformers/themes or other plugins → report.

## Navigation: `meta.json` → `meta.ts`

**Every `meta.json` becomes a `meta.ts` — this is the primary navigation carry-over for Fumadocs, always required, never optional.** `meta.json` is Fumadocs' canonical nav source; no filesystem-only shortcut reproduces its ordering, icons, and collapse state, so don't skip it in favor of filename inference. Move content from `content/docs/` to your chosen `content.root` (e.g. `docs/`), then convert each `meta.json` to a `meta.ts` (`defineMeta`):

| Fumadocs `meta.json` | Blume `meta.ts` |
| --- | --- |
| `title` | `title` |
| `icon` | `icon` — **convert the casing** (see Icons below) |
| `defaultOpen: false` | `collapsed: true` |
| `defaultOpen: true` | `collapsed: false` |
| `root: true` | a **`navigation.tabs` entry** (see below) — **not** a `meta.ts` field |
| `pages: [...]` slugs | `pages: [...]` (ordering) |
| `description` | **drop** (folders have no description) |
| `collapsible: false` | **drop** (report — no per-folder equivalent) |

`meta.ts` accepts **only** `title`, `icon`, `order`, `collapsed`, `pages` — there is **no `display` field** (writing one is a build error). Collapse rendering is global: when any folder needs collapsing, set `navigation.sidebar.display: "group"` once in `blume.config.ts`.

**`root: true` folders are Fumadocs' tab mechanism** — Fumadocs UI renders them as layout tabs and scopes the sidebar to the active one. That is exactly Blume's `navigation.tabs`: add `{ label, path, icon? }` per root folder (label/icon from its `meta.json`), pointing at the folder's route. Blume then scopes the sidebar by URL prefix the same way. Don't try to model root folders inside `meta.ts`.

Handle the `pages` array items:

- **`"..."`** (rest marker) / `""` → drop; Blume appends unlisted pages automatically. **`"z...a"`** (reversed rest) → no equivalent; list the pages explicitly in the intended order.
- **`"!page"`** (exclusion) → Blume _appends_ unlisted pages, so a dropped `!page` **resurfaces in the sidebar**. Set that page's frontmatter `sidebar.hidden: true` instead.
- **`"---Section---"`** (separator; also the `---[Icon]Label---` variant) → Blume has no flat separator. Turn each section into a **`(Section)/` group folder** (route-transparent — the `(…)` segment is stripped from URLs), and move the section's pages into it. If a section wraps a single existing folder, leave it in place and set that folder's `meta.ts` `title` instead.
- **`"...folder"`** (extract) → Blume can't flatten a folder inline; keep it as a normal group at that ordering position and report it.
- **`"[Text](url)"`** (link; also `[Icon][Text](url)` and `external:` variants) → a top-level/utility link belongs in **`navigation.featured`** (`{ label, href, icon? }` — pinned above the sidebar on every route). A link buried deep in one folder has no folder-meta home — drop and report (or model that one folder via an explicit `navigation.sidebar`).
- **`pagesIndex`** → make that page the folder's `index` (rename the file); report the route change and add a redirect.

## Frontmatter

Fumadocs' core frontmatter (`title`, `description`, `icon`) matches Blume — but **convert `icon` casing** (see Icons). Drops: **`full`** (Fumadocs' full-width/no-TOC layout — no equivalent; report) and **`_openapi`** (generated API stubs — delete the whole page, see OpenAPI). Any other non-schema key is a build error, so drop and report.

## Icons: lucide-react names → kebab-case

Fumadocs icons are strings resolved by the repo's own `icon` handler in `loader()` — in practice **PascalCase lucide-react export names** (`"BookOpen"`, `"HomeIcon"`). Blume resolves **kebab-case** Lucide names and silently renders nothing on a miss, so pass-through loses every icon. Read the loader's icon handler to confirm the scheme, then convert each name: strip any `Icon` suffix, kebab-case it (`BookOpen` → `book-open`, `HomeIcon` → `home`), and verify it exists at [lucide.dev/icons](https://lucide.dev/icons).

## Components

- **Callouts:** `<Callout type="x">` → `:::` directive. Fumadocs types are `info` (the default), `warn`, `warning`, `error`, `success`, `idea`: `warn`/`warning`→`:::warning`, `error`→`:::danger`, `success`→`:::success`, `idea`→`:::tip`, `info` and **bare `<Callout>`** → `:::info`. `title` → `:::type[Title]`; drop `icon`.
- **Cards:** `<Cards>` → `<CardGroup>`. `<Card>` needs **prop surgery**, not pass-through: Fumadocs `icon` is a JSX element (`icon={<Cpu />}` imported from `lucide-react`) → Blume takes a string name (`icon="cpu"`); Fumadocs `description="…"` → Blume has no `description` prop — move the text into the card body.
- **Accordions (container/item inversion):** `<Accordions>` → `<Accordion>` (container); `<Accordion>` → `<AccordionItem>` (item).
- **File trees:** `<Files>` → **`<Tree>`** (the JSX container for `Tree.*` children — _not_ `<FileTree>`, which wraps a Markdown list); `<Folder>` → `<Tree.Folder>` (`defaultOpen` carries over); `<File>` → `<Tree.File>`. Or convert the whole block to a list-driven `<FileTree>`.
- **Tabs:** Fumadocs declares labels on the parent (`<Tabs items={['npm','pnpm']}>`) and selects with `<Tab value="npm">`. Blume's `<Tab>` carries its own `title`. Strip `items={[…]}` from `<Tabs>` and give each child `<Tab>` a `title` (from its `value`, or the positional `items` entry).
- **Pass through unchanged:** `<Steps>`/`<Step>`, `<TypeTable>` (Blume's was modeled on Fumadocs' — identical `type` record shape), `<GithubInfo>`.
- **`<Banner>`** (layout-mounted, not per-page) → the `banner` config field (`{ content, link, dismissible, id }`).
- **`<include>./partial.mdx</include>`** — Blume has no runtime include. **Inline** the partial's body (strip its frontmatter) at migration time; resolve nested includes recursively.
- **No equivalent — report:** `<DynamicCodeBlock>`, `<ImageZoom>` (Blume zooms content images by default), `<InlineTOC>`.
- **Strip or convert every import** — not just `fumadocs-*`: `lucide-react` imports (icon JSX → string names), `next/image`/`next/link` (→ Markdown image/link), and local components. **Inventory `mdx-components.tsx` before deleting it** — components registered there are used import-free in MDX bodies; port or inline each usage first.

## Code fences

- ` ```npm ` fences (Fumadocs' remark-npm accepts both) → ` ```package-install `.
- Adjacent fences sharing `tab="…"` meta render as grouped tabs in Fumadocs → wrap them in a Blume `<CodeGroup>` and drop the `tab=` attrs.

## OpenAPI

`fumadocs-openapi` writes **generated MDX stubs into the content tree** (`generateFiles()` output: pages containing `<APIPage>`/`<OpenAPIPage>` with `_openapi` frontmatter), plus `lib/openapi.ts` (`createOpenAPI`) and a generate script. Treat these exactly like Mintlify endpoint stubs: **delete the generated pages**, point `openapi: { enabled: true, sources: [{ spec }] }` at the spec (vendor it locally), add a `navigation.tabs` entry for the reference route, and remove `fumadocs-openapi`, `lib/openapi.ts`, and the generate script. Keep hand-written conceptual pages (intro/auth) under the reference route.

## i18n

A `loader({ i18n })` setup (locale-suffixed files or locale dirs) → Blume `i18n: { defaultLocale, locales: [{ code, label }] }`. Locale **directories** match Blume's `dir` parser as-is; locale **file suffixes** (`page.cn.mdx`) need restructuring into locale folders. Report whichever transform you apply.

## Package.json & teardown

Repoint scripts (`dev`→`blume dev`, `build`→`blume build`, `start`→`blume preview`), remove the `fumadocs-*` deps and the host framework's deps (`next`, `react-router`, `@tanstack/*`…), add `blume`. Safe to delete after harvesting (see above for what to read first): `source.config.*`, `mdx-components.tsx`, the app/route dir, and host-framework config (`next.config.*`, `next-env.d.ts`, the `next` tsconfig plugin — or the React Router/TanStack equivalents).

## Dropped — report these

Folder `description` and `collapsible: false`; reversed rest (`z...a`) ordering; the extract (`...folder`) flatten semantics; deep-folder sidebar links; frontmatter `full`; `<DynamicCodeBlock>`/`<InlineTOC>`; custom Shiki transformers; any icon with no Lucide equivalent after casing conversion.
