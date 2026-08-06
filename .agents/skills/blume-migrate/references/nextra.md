# Nextra → Blume

Nextra (on Next.js) declares navigation and per-page labels in `_meta` files — and crucially, **a folder's title and its pages' sidebar labels live in the _parent_ `_meta`**. Reconciling that cross-file inheritance is the main task. Nextra 4 was a near-rewrite, so **fingerprint the generation first** — it decides where config lives, where content lives, and what the components are called.

## Detect & fingerprint the generation

- **`_meta.{js,mjs,cjs,ts,jsx,tsx,json}`** files — the strongest fingerprint (v4 also has a single-file `_meta.global.*` variant).
- **v2/v3 (Pages Router):** content in `pages/`, `_meta.json` (v2) or `_meta.{js,ts}` (v3), a `theme.config.{js,jsx,ts,tsx}`, components from `nextra-theme-docs` (v2) or `nextra/components` (v3).
- **v4 (App Router):** **no `theme.config`** — config lives as component props in `app/layout.{jsx,tsx}` (`<Layout>`, `<Navbar>`, `<Banner>`, `<Footer>`, `<Search>`). Content is either a **`content/`** directory (with a catch-all `app/[[...mdxPath]]/page.jsx` gateway) **or** Next page files: **`app/**/page.mdx`**.
- `nextra` + `next` deps; `next.config.*` wrapping `nextra({…})`.

**v4 app-directory repos need a restructure, not a `content.root`.** Pointing `content.root` at `app/` gives every route a trailing `/page` and scans `layout.jsx`/gateway files. Move each `app/foo/page.mdx` → `foo.mdx` (or `foo/index.mdx` when it has children), and exclude the non-MDX app files. The catch-all `page.jsx`, `mdx-components.*`, and `app/layout.*` are teardown artifacts — but **harvest `app/layout.*` first** (see Config).

## Config

None of it maps automatically — read the config surface for the generation by hand and reconstruct in `blume.config.ts`:

- **v2/v3 — `theme.config.*`:** `logo` (JSX — extract text/image) → `logo`; `project.link` → `github` (renders the header repo link); `docsRepositoryBase` → `github` (owner/repo/branch — and any trailing sub-path → `github.dir`); `banner.text`/`banner.key` → `banner.content`/`banner.id` (`dismissible` maps); `primaryHue`/`primarySaturation` → pick an equivalent `theme.accent` color; `footer` → drop (report); `faviconGlyph` → drop (Blume's favicon is a file convention); `useNextSeoProps`/head → per-page `seo` frontmatter or drop.
- **v4 — `app/layout.*` props:** the same facts moved: `<Navbar logo projectLink>`, `<Layout docsRepositoryBase editLink sidebar={{…}} toc={{…}}>`, `<Banner>`, `<Footer>`. Map them the same way; sidebar/TOC tuning mostly drops (Blume's `toc` config covers min/max heading levels).
- **`next.config.*`:** harvest **`redirects()`** — static entries become Blume `redirects: [{ from, to }]`; wildcard/dynamic ones move to host config (report). A `latex: true` flag means math is in play (see Math below). Then delete the file.
- Root `_meta` entries with **`type: "page"`** → `navigation.tabs` (`{ label, path }`, where `path` is `/` for `index`, else `/<slug>`). `type: "page"` only maps at the **root**.

## Navigation: `_meta` → `meta.ts` + frontmatter

**Every `_meta` file must be carried over — always convert it to `meta.ts` + frontmatter, never drop it in favor of filename inference.** `_meta` is Nextra's canonical nav source (ordering, labels, folder titles); the filesystem alone can't reproduce it.

For each `_meta` entry (`key` = slug, value = string title or `{ title, type, display, href, theme }`):

| Nextra `_meta` entry | Blume |
| --- | --- |
| ordinary page/folder (string or `{ title }`) | slug → parent `meta.ts` `pages` (ordering). A **page** title → that page's frontmatter `sidebar.label`. A **folder** title → that child folder's `meta.ts` `title` (title lives in the parent!). A JSX title → extract its text. |
| `display: "hidden"` | frontmatter `sidebar.hidden: true` |
| `type: "separator"` | drop → recreate as a `(Group)/` folder / `meta.ts` boundary if needed |
| `type: "menu"` (navbar dropdown) | drop → recreate via `navigation.selectors` if wanted |
| `href` (external link) | **`navigation.featured`** (`{ label, href, icon? }` — pinned above the sidebar on every route); only drop deep-nested ones (report) |
| `type: "page"` (subfolder, not root) | drop (only root → tabs) |
| `theme: { collapsed }` on a folder | `meta.ts` `collapsed` |
| `theme: { layout: "full" \| sidebar: false \| … }` | drop (report — no per-page layout switches) |
| `"*"` wildcard entry | apply its value as the default for unlisted siblings, then drop |

Write each folder's `meta.ts` with its `pages` order (from its own `_meta`) and its `title` (inherited from the parent's `_meta`). A v4 **`_meta.global.*`** file holds the whole tree in one place (folder entries carry `items`) — split it into per-folder `meta.ts` files with the same rules.

## Frontmatter & titles — synthesize, don't just pass through

Most Nextra pages have **no frontmatter**; the title falls back `_meta` title → `sidebarTitle` → `title` → **first body H1** → filename. Blume renders frontmatter `title` as the page H1, so for **every page**: set frontmatter `title` (from the `_meta` title, else the body H1, else a humanized filename), **remove the body H1**, and map `sidebarTitle` → `sidebar.label`. `asIndexPage: true` (v4 folder-index marker) → make the file the folder's `index.mdx` and drop the key. Drop any other non-schema key and report it.

## Components

- **Callouts:** `<Callout type="x">` → directive. Types: `default` (the prop default) → `:::note`, `info`→`:::info`, `warning`→`:::warning`, `error`→`:::danger`, `important` (v4) → `:::note`. Bare `<Callout>` → `:::note`. Drop `emoji` (there is no `title` prop to carry — Nextra callouts have none).
- **v2 flat names:** v2 exported `Tab` and `Card` (flat) from **`nextra-theme-docs`**; v3/v4 use `Tabs.Tab`/`Cards.Card` from `nextra/components`. Handle both: `<Cards>`/`<Cards.Card>`/`<Card>` → `<CardGroup>`/`<Card>`; `<Tabs items={[…]}>` + `<Tabs.Tab>`/`<Tab>` → `<Tabs>`/`<Tab title="…">` (move labels from the parent `items` onto each `<Tab>`). `Cards` `num` → `CardGroup` `cols`.
- **`<Steps>`:** Nextra's wraps **Markdown headings (h2–h6)**, one step per heading. Convert each heading to a `<Step title="…">` child (Blume `<Steps>`/`<Step>`) and delete the heading — this also keeps step titles out of the TOC, matching Nextra's behavior.
- **`<FileTree>`/`<FileTree.Folder>`/`<FileTree.File>`** → `<Tree>`/`<Tree.Folder>`/`<Tree.File>` (or a list-driven `<FileTree>`).
- **`<Bleed>`** (full-bleed) → no equivalent; drop the wrapper and report. **`<Table>`** → a plain Markdown table. **`<Banner>`** (v4, in layout) → the `banner` config.
- **GitHub alert blockquotes** (v4 renders them): `> [!NOTE]`/`[!TIP]`/`[!WARNING]`/`[!IMPORTANT]`/`[!CAUTION]` → `:::note`/`:::tip`/`:::warning`/`:::note`/`:::warning` directives — Blume renders them as plain blockquotes otherwise.
- **Strip or convert every import:** `nextra`, `nextra/*`, `nextra-theme-docs`, `nextra-theme-blog`, plus `next/image` (→ Markdown image or `<Frame>`), `next/link` (→ plain link), and local components (port or inline; report).

## Code fences

Nextra's fence meta differs from Blume's — rewrite it: `filename="app.js"` → a space-separated title (` ```js app.js `); `showLineNumbers` → `lineNumbers`; line highlighting `{1,4-5}` carries over unchanged; **drop** word-highlight `/word/`, `copy`/`copy=false`, and inline-code `{:lang}` suffixes. ` ```sh npm2yarn ` fences → ` ```package-install `.

## Math

Nextra enables math via `nextra({ latex: true })` (KaTeX or MathJax). In Blume, block math `$$…$$` renders in `.mdx` with **no config** (there is no `markdown.math` field). Convert Nextra's ` ```math ` fences → `$$…$$` blocks (they render as plain code blocks otherwise). Inline `$…$` is **not** supported — convert to display math or drop (report). MathJax-specific macros → report.

## i18n

- **v2/v3:** locale **file suffixes** (`index.en.mdx`, `index.zh.mdx`) + `i18n` in `next.config` → restructure into locale **folders** (default locale at the content root, others under `<code>/`), then `i18n: { defaultLocale, locales: [{ code, label }] }`.
- **v4:** `content/<lang>/` dirs already match Blume's `dir` parser — map the locale list, no file moves.

## Package.json & teardown

Repoint `dev`/`build`/`start` scripts to the Blume CLI; remove `next`/`nextra`/`nextra-theme-*` deps and add `blume`. Delete after harvesting: `next.config.*` (redirects first!), `theme.config.*` (v2/v3), `app/layout.*` + the catch-all gateway + `mdx-components.*` (v4).

## Dropped — report these

Footer content; `primaryHue`-style theming beyond an accent color; `faviconGlyph`; `_meta` separators, menus, `newWindow`; per-page `theme` layout switches; `<Bleed>`; MathJax macros; word-highlight/copy fence meta; any icon you can't reconstruct as a Lucide name.
