# Starlight → Blume

Starlight is an Astro integration configured via `starlight({…})` in `astro.config.*`, with content in `src/content/docs`. Both are Astro, so this is a natural fit — content can mostly stay in place, with one big caveat: **most Starlight content is `.md`, and Blume's `:::` directives are MDX-only** (see Asides below).

## Detect

- `astro.config.{mjs,mts,ts,js,cjs}` importing and calling **`starlight({…})`** (`import starlight from "@astrojs/starlight"`).
- Content under **`src/content/docs/`**; a `src/content.config.ts` (current) or `src/content/config.ts` (pre-Astro-5).
- `@astrojs/starlight` dep.

Keep content where it is — set `content.root: "src/content/docs"`.

## Config: `starlight({…})` → `blume.config.ts`

**Harvest the surrounding `astro.config.*` too, not just the `starlight()` call:** top-level Astro `redirects` → Blume `redirects`; `site` → leave unset (Blume auto-detects); other integrations → report.

| Starlight option | Blume |
| --- | --- |
| `title` | `title` (if per-locale/computed, set manually) |
| `description` | `description` |
| `logo` (`{ src }` or `{ light, dark, alt }`) | `logo` — move the referenced file into `public/` |
| `logo.replacesTitle` | `logo: { text: "" }` (renders the mark alone) |
| `favicon` | copy the file into `public/` (drop the config field — Blume auto-detects) |
| `social` (array of `{ label, icon, href }`; pre-0.33 legacy: `{ github: url }` object) | derive **`github: { owner, repo }`** from the GitHub entry; other socials drop (report) |
| `editLink.baseUrl` (`…/edit/<branch>/<subdir?>`) | `github: { owner, repo, branch }` — **and any repo sub-path after the branch → `github.dir`** (a docs-in-subfolder repo breaks every edit link without it) |
| `sidebar` (array) | filesystem nav / `navigation.sidebar` (see below) |
| `tableOfContents` (`false` or `{ minHeadingLevel, maxHeadingLevel }`) | `toc` — identical shape, 1:1 |
| `markdown.headingLinks: false` | `markdown.headingAnchors: false` |
| `expressiveCode.themes` | `markdown.codeBlocks.theme: { light, dark }` — EC assigns by theme _type_, so match each theme by its darkness, not by array position |
| `expressiveCode.styleOverrides` | drop → restyle via a root `theme.css` file |
| `head` | **drop and report** (there is no `seo.metatags`); analytics `<script>` entries → the `analytics` config |
| `lastUpdated: true` | `lastModified: true` |
| `customCss` | drop → move into a root **`theme.css`** file (auto-picked-up; not a config field) |
| `components` (overrides) | Blume's layout slots via `defineComponents({ layout: { Header, Search, Sidebar, TableOfContents, Footer, … } })` — a near-1:1 map; reach for `blume eject` only beyond those |
| `plugins` | **map, don't blanket-drop** — see Plugins below |
| `pagination: false`, `pagefind`/Pagefind options, `titleDelimiter`, `credits`, `disable404Route`, `routeMiddleware` | drop (report) |
| `locales` / `defaultLocale` | `i18n` (see below) |

## Navigation: `sidebar`

Starlight's `sidebar` array → prefer letting Blume generate from the filesystem; use `navigation.sidebar` only for shapes files can't express:

- `{ label, autogenerate: { directory: "d" } }` → **structure the folder and rely on filesystem nav** (label → the folder's `meta.ts` `title`). Do **not** map it to a sidebar item with `root:` — in an explicit Blume sidebar that renders a single page link, not the directory's children.
- string `"guides/intro"` → `"/guides/intro"`; `{ label?, slug }` → `/<slug>`.
- `{ label, items: [...] }` → `{ label, items: [...] }` (recursive) — or better, a real folder.
- `{ label?, link }` → `{ label, href: link }`.
- `badge` (string or `{ text, variant }`) → `badge` (text only; variant drops). `collapsed` (bool) → `collapsed`. Item `attrs` and `translations` → drop (report).

## Frontmatter

| Starlight | Blume |
| --- | --- |
| `title` / `description` / `draft` / `slug` | pass through |
| `sidebar.{label,order,hidden}` | pass through |
| `sidebar.badge` | `sidebar.badge` (text only) |
| `sidebar.attrs` | **remove** (strict schema — build error if left) |
| `pagefind: false` | `search.exclude: true` |
| `lastUpdated` (date/string) | `lastModified` |
| `lastUpdated: false` (boolean) | **remove** (Blume's `lastModified` takes a date; a boolean is a build error) |
| `prev` / `next` (booleans or labels) | **drop** (report — no per-page pagination toggle; `hideFooterPagination` does not exist) |
| `template: splash` / `hero` | **no equivalent** — rebuild as a custom `.astro` page under `content.pages`; a `hero` on a normal page drops (report) |
| `banner`, `tableOfContents`, `editUrl`, `head` | drop (report) |

## Asides → directives (and the `.md` trap)

Starlight's primary callout syntax is the `:::note`/`:::tip`/`:::caution`/`:::danger` directive **in plain `.md` files**. The directive names map perfectly (Blume aliases `caution`→warning; `error`→danger) and `[Title]` syntax carries over — **but Blume only parses directives in `.mdx`**. In a `.md` file, `:::note` renders as literal text and the build stays green. So: **rename every `.md` file that contains asides (or math, or mermaid/package-install fences) to `.mdx`** — for a typical Starlight repo that's most of the content; renaming everything to `.mdx` is usually simpler and safe.

- `<Aside type="…" title="…">` (the component form) → the same directives; bare `<Aside>` → `:::note`.
- An aside custom icon (`:::tip{icon="heart"}`) → drop the attr (report).

## Components

- **Renames:** `<CardGrid>` → `<CardGroup>`; `<LinkCard>` → `<Card>` (its `description` prop drops — fold into the body); `<TabItem label="…">` → `<Tab title="…">`. `<Tabs>` and `<Card>` stay; a `<Tabs syncKey="…">` → strip the prop (Blume tabs sync by default).
- **`<Badge>` needs conversion, not pass-through:** Starlight puts content in a `text` prop and uses variants `note`/`tip`/`caution`/`danger`/`success`/`default` with sizes `small`/`medium`/`large`. Blume's `<Badge>` renders **children** with variants `default`/`accent`/`success`/`warning`/`danger` and sizes `xs`/`sm`/`md`/`lg`. Move `text` into the children; remap variant (`note`→`default`, `tip`→`accent`, `caution`→`warning`, `danger`→`danger`, `success`→`success`) and size (`small`→`sm`, `medium`→`md`, `large`→`lg`).
- **Convert yourself:** `<Steps>` → Blume `<Steps>`/`<Step>`; `<FileTree>` → Blume `<FileTree>`; `<Code code={…}>` → a fenced code block; `<LinkButton>` → a Markdown link or `<Card>`.
- Strip `import … from "@astrojs/starlight/*"` and `astro:assets` lines.

## Code blocks: Expressive Code meta → Blume

Starlight content is full of Expressive Code fence meta; Blume understands some of it and **promotes unknown bare tokens into the code-block title**, so unconverted meta produces garbage headers. Convert per fence:

- `title="file.js"` → works as-is (or use the space-title shorthand). Line ranges `{2-3}` → work as-is.
- `ins=`/`del=` line marks → `// [!code ++]` / `// [!code --]` comments; `mark=` → `{ranges}` or `// [!code highlight]`.
- `showLineNumbers` → `lineNumbers`.
- **Drop:** `frame="terminal"`, `collapse=`, `wrap`, `"string"` and `/regex/` text markers (report if they carried meaning).
- ` ```diff lang="js" ` → a normal ` ```js ` fence with `[!code ++]`/`[!code --]` markers.

## Plugins — map, don't drop

- `starlight-openapi` → Blume's native `openapi.sources` (delete any generated pages; add the `navigation.tabs` entry).
- `starlight-blog` → `type: blog` pages.
- `starlight-versions` → `navigation.selectors` with `kind: "version"`.
- `starlight-image-zoom` → delete (Blume zooms content images by default).
- `starlight-links-validator` → delete (`blume validate` covers it).
- Anything else → report.

## Assets

Starlight co-locates images in `src/assets/` with **relative** references (`../../assets/foo.png`) or `astro:assets` imports; Blume serves `public/` at the site root with absolute URLs. Move `src/assets/*` into `public/`, rewrite relative image paths and `~/`/`@/` aliases to absolute `/…` URLs, and replace `<Image>` imports with Markdown images (or `<Frame>`).

## i18n

Starlight has **two** layouts:

- **`root` locale** (default language at `src/content/docs/`, others in `fr/`, `de/`… subdirs) → matches Blume's `dir` parser as-is: `i18n: { defaultLocale, locales: [{ code, label }] }`, no file moves.
- **No `root` locale** (every language in a subdir, including the default — `en/…`) → Blume expects the default locale **at the content root**, so move the default locale's files up one level. Starlight served them at `/en/…`, so add a `redirects` entry per page.

Don't restate Blume defaults (`hideDefaultLocalePrefix: true`, `parser: "dir"` are already the defaults). Starlight's untranslated-page fallback matches Blume's `fallbackLocale` default.

## Teardown

Remove `@astrojs/starlight` (and plugin deps) from deps, delete the Starlight bits of `astro.config.*` **after harvesting redirects**, delete `src/content.config.ts` / `src/content/config.ts`, repoint scripts to the Blume CLI, add `blume`. A `src/content/docs/404.md` has no direct Blume equivalent — report it (Blume ships its own 404).

## Dropped — report these

Non-GitHub socials, badge variants, sidebar/item `attrs` + `translations`, `customCss` beyond `theme.css`, `head` entries, `routeMiddleware`, splash/hero pages (rebuild as custom pages), aside custom icons, EC frames/collapse/text markers, prev/next toggles, unmapped plugins, any `<Icon>` name with no Lucide equivalent.
