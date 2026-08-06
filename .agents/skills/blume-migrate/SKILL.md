---
name: blume-migrate
description: Migrate an existing documentation site (Mintlify, Docusaurus, Fumadocs, Nextra, Starlight, or any docs framework) to Blume, the markdown-first docs framework on Astro. Translate the source config to blume.config.ts, restructure content into Blume's filesystem-derived navigation, rewrite JSX callouts to directives, convert icons to Lucide, and inline snippets. Use when the user asks to migrate/convert/port a docs repo to Blume, or when the repo has a docs.json/mint.json, docusaurus.config.*, meta.json with fumadocs, _meta.* with nextra, or an astro.config.* with starlight().
---

# Migrate to Blume

Blume is a **markdown-first** documentation framework on Astro/Vite. You drop Markdown/MDX into a folder and get navigation, search, theming, Open Graph images, and a component library with no app boilerplate — **the framework is the template**. There is no starter to clone; the only thing a project owns is its content and a `blume.config.ts`.

Your job is to convert a source docs repo into an **idiomatic** Blume project — not a 1:1 transliteration. Read this file, detect the source framework, open the matching `references/<framework>.md` for the exact mappings, and work the loop below. Report everything you drop or approximate.

Throughout this skill (including the `references/` files), **`<skill>` means the absolute path of the directory containing this SKILL.md** — resolve it from wherever you read this file (e.g. `node_modules/blume/skills/blume-migrate` or `.claude/skills/blume-migrate`). It is a placeholder to substitute, never a literal path.

## Migration philosophy

- **Target idiomatic Blume, not a mechanical port.** Prefer filesystem-derived navigation over an exhaustive explicit `navigation.sidebar`. Prefer `:::` directives over JSX callouts. Prefer Blume defaults over restating them in config.
- **Every field has a default; `{}` is a valid config.** Map only what the source _declares_. If the source uses a framework default, don't write it.
- **Drop chrome that has no Blume equivalent — and say so.** Navbar CTAs, footer columns, custom theming, dynamic redirects, and unmappable icons get reported to the user, not silently discarded or faked.
- **Convert, don't preserve.** Blume's page frontmatter schema is **strict** — unknown keys are build errors. A source-only frontmatter key must be mapped to a Blume key or removed (and reported), never left to "maybe validate."

## Migration workflow

1. **Detect the source framework** and read its reference file:
   - `docs.json` / `mint.json` → **Mintlify** (`references/mintlify.md`) — the deepest, config-declared nav.
   - `docusaurus.config.*` → **Docusaurus** (`references/docusaurus.md`).
   - `meta.json` + `fumadocs-*` deps (content under `content/docs/`) → **Fumadocs** (`references/fumadocs.md`).
   - `_meta.{js,ts,json}` + `nextra` deps → **Nextra** (`references/nextra.md`).
   - `astro.config.*` calling `starlight({…})` → **Starlight** (`references/starlight.md`).
   - Anything else → apply this file's mental model directly; there's no framework-specific reference, so inventory by hand.
   - **Also note the host repo, independent of source framework:** a pnpm/Turbo workspace, a non-`docs/` content layout, or a Vercel deploy each need integration steps (`content.root` scoping, `minimumReleaseAge`, lockfile, `vercel.json`, an Astro/Vite patch) — all in `references/monorepo.md`. Read it whenever the target isn't a bare single-package docs folder.
2. **Inventory the repo** before changing anything: the config file(s), the content tree, the nav definition, snippets/partials/includes, static assets, OpenAPI/AsyncAPI specs, redirects, i18n locales, custom components, and icon usage. Note what's declared vs. defaulted.
3. **Write `blume.config.ts`** with `defineConfig` from `blume`. Map only declared fields (see the reference's mapping table); rely on defaults everywhere else. A minimal result is `defineConfig({ title: "…" })`.
4. **Restructure content.** Choose `content.root` (default `docs`) — **detect where `.md`/`.mdx` actually live, don't assume a `docs/` folder.** Many repos keep content directly under an app dir (`apps/docs/api/`, `.../getting-started/`) with no `docs/` subfolder; when so, set `content.root` to that dir and scope `content.include` to the real content folders rather than leaving a bare `content.root: "."` that scans everything (see `references/monorepo.md` §1). Order with numeric prefixes (`01-intro.mdx`), group without a URL segment via `(group)/` folders, and add a `meta.ts` (`defineMeta`) only where filesystem order isn't enough. **A source that already declares per-folder navigation in a sidecar file — Fumadocs `meta.json`, Nextra `_meta.*` — _is_ that case: convert each one to a `meta.ts`, carrying over its title/icon/order/collapse, rather than dropping it and hoping filenames reproduce the intent. Filesystem inference is the fallback for folders that declare no per-folder nav, never a reason to discard one that does.** Reach for an explicit `navigation.sidebar` only when the source nav genuinely can't be expressed by files. **Reshaping into folder-per-tab moves URLs** — track every old→new path as you go; you'll turn them into `redirects` in step 5.
5. **Rewrite pages.** Map frontmatter to Blume's strict schema; convert callout JSX to `:::` directives — **directives (and math/mermaid/package-install fences) are MDX-only, so rename any `.md` page that needs them to `.mdx`**; rename components; inline snippets/partials (Blume has no import-based includes); fix asset paths; **rewrite internal links** to their new routes (including OpenAPI operation links — see the OpenAPI section, their slugs differ from most sources); **add a `redirects` entry for every route you moved** in step 4; **convert every icon name to Lucide** (Blume is Lucide-only — no FontAwesome/Tabler). Remove any duplicated H1 in the body (`title` renders the H1; bodies start at `##`). **If the source has a hand-maintained changelog and the repo is open source on GitHub, offer to swap it for the `github-releases` source** (see "Changelogs" below) rather than porting the entries. For **Mintlify**, run the bundled codemod first — `node <skill>/scripts/mintlify-codemod.mjs --write <content-dir>` deterministically remaps icons and drops/renames unsupported frontmatter keys, and reports the rest (unknown icons, OpenAPI-stub flags) for you to finish by hand (see `references/mintlify.md`).
6. **Adopt `package.json`.** Repoint `dev`/`build`/`start` → `blume dev`/`blume build`/`blume preview`, remove the old framework's deps, add `blume`. A config-only source (e.g. a bare Mintlify `docs.json`) has no manifest — scaffold one. **In a pnpm workspace:** if `pnpm-workspace.yaml`/`.npmrc` sets `minimumReleaseAge`, add **only** `blume` to `minimumReleaseAgeExclude` (don't disable the guard) so the just-published version installs. **Always regenerate the lockfile in the same change:** after editing deps run a plain `pnpm install` (from the workspace root) and commit `pnpm-lock.yaml` alongside `package.json` — CI/Vercel use `--frozen-lockfile`, so a stale lockfile fails the build before it starts. **If the repo uses (or the user wants) [Ultracite](https://www.ultracite.ai) for formatting:** its oxfmt formatter mangles the `:::` directives you just wrote unless you ship the bundled `assets/oxfmt@0.55.0.patch` and register it under `patchedDependencies` — see `references/monorepo.md` §6. See `references/monorepo.md` §2–3.
7. **Wire up the host repo & deploy (non-trivial repos).** For a monorepo on Vercel, emit the root-aware install/build recipe and `apps/docs/vercel.json`, and tell the user the two settings you can't commit (Vercel Root Directory, Node 22). If the workspace pins Vite and `blume build` crashes inside Astro/Vite, apply the pnpm-patch workaround. All copy-pasteable in `references/monorepo.md` §4–5.
8. **Verify.** Run `blume build --strict` (frontmatter schema, duplicate routes, config — **without `--strict` a build exits 0 despite content errors**, silently dropping invalid pages) and `blume validate --strict` (internal links, heading anchors, assets — the link checker lives in `validate`, not `build`), fix diagnostics, then `blume dev` for a visual pass. End with a written summary of what was migrated, dropped, and approximated — **and every repo-specific edit you made** (pnpm-workspace, vercel.json, config globs) with the reason, plus any manual step left to the user (the Astro patch, Vercel dashboard settings).

## The Blume mental model

The single biggest shift for most sources — especially Mintlify — is that **navigation is derived from the filesystem**, not declared in config.

### Navigation is the file tree

- **Folders become groups, files become pages.** A page's sidebar label is its frontmatter `title`; a group's label is the humanized folder name.
- **Ordering resolves highest-priority-first:** an explicit `navigation.sidebar` (replaces the whole tree) → a folder's `meta.ts` `pages` array → a page's frontmatter `sidebar.order` → the filesystem (`index` first, then numeric filename prefix like `01-`, then alphabetical).
- **`meta.ts` refines one folder** (`defineMeta({ title, icon, order, collapsed, pages })`). The `pages` array lists children by slug (numeric prefix and parentheses stripped); children you omit fall back to their own `sidebar.order`, then filesystem order (`index` still sorts first) — so a partial `pages` list is safe, but list every child when the source declared a complete order.
- **Sidebar render mode is global, not per-folder.** `navigation.sidebar.display` in `blume.config.ts` is `"flat"` (default), `"group"` (collapsible), or `"page"` (drill-in sub-panel) and applies to **every** group at once. (It used to live on each folder's `meta.ts` as `display`; that field was **removed** — writing it in a `meta.ts` is now a build error. Set it once in config instead.) An explicit `navigation.sidebar` item may still override its own group's `display`.
- **An explicit `navigation.sidebar` replaces filesystem generation entirely.** Use it only for a nav shape files can't express. Its items are a page route string, a group (`{ label, items }`), or a link (`{ label, href }`).
- **Config-declared nesting has no on-disk counterpart — materialize it or it flattens silently.** When a source (Mintlify `groups`, Nextra `_meta`, a Docusaurus sidebar…) declares a nested group, its pages usually sit **flat in one folder** and the grouping lives only in config. Filesystem-derived nav sees the flat folder and drops the inner group. To keep the nesting you must **either** move those pages into a real subfolder (`meta.ts` for label/`collapsed`) — which changes their URLs, so add `redirects` — **or** declare the group in an explicit `navigation.sidebar`, which nests the existing routes without moving a file. Walk config `pages`/nav arrays **recursively** during inventory and record where config nesting depth exceeds on-disk depth; that gap is exactly what gets lost.

### Tabs and selectors

- **`navigation.tabs`** (`{ label, path, icon? }`) render top-of-header sections and **scope the sidebar by route** — the folder at a tab's `path` becomes the section, so this needs no config beyond the tabs themselves; structure content as **one folder per tab**. **A source's top-level tabs (Mintlify `navigation.tabs`, a top-level product/section switcher) map to these header tabs — keep them as tabs; don't flatten them into a single global `navigation.sidebar`.** Blume picks the active tab by **URL prefix** (longest tab `path` that prefixes the route), so every page in a tab must live under that tab's single `path`; a source tab that mixes arbitrary routes isn't portable as-is — either move its pages under one prefix (route change → add `redirects`) or accept the closest shape, and say which in the report (details in `references/mintlify.md`). The filtering runs both ways: on a route **under** a tab's `path`, the sidebar shows **only** that tab's folder (a tab also highlights when the current route is under it); on a **root or untabbed** route (or a tab whose `path` is `/`), the tab folders are **hidden** and the sidebar shows only the loose pages that belong to no tab (full tree as a fallback, so it's never blank). Consequence for migrations: once you add tabs, the landing sidebar automatically drops the sectioned content — that's intended, not lost pages; don't hand-build excludes for it.
- **`navigation.selectors`** (`{ kind, label, items: [{ label, path, icon?, description?, tag? }] }`, `kind` = `dropdown`/`product`/`version`/`language`) partition a whole site (products, versions) via a header dropdown keyed on the current route.
- **`navigation.featured`** (`{ label, href, icon? }`) pins links to the **top of the sidebar, above every section** — a blog, changelog, or support page that should always be one click away. These are the **exception to tab scoping**: unlike the generated tree, featured links show on **every** route and breakpoint. `href` points anywhere — an external URL opens in a new tab, an internal route (`/contact`) is validated against your pages at build time. `icon` is a Lucide name (or image path/URL/inline SVG), as everywhere else. This is the home for a source's always-visible header/utility links (Mintlify anchors, Blog/Contact links) — see `references/mintlify.md`.

### Routes and pathing

- A route is the content path relative to `content.root`, with **numeric prefixes stripped** (`01-intro.mdx` → `/intro`) and **`(group)/` folders adding no segment**. An `index` file maps to its folder's route. Frontmatter `slug` overrides the generated route.

### `blume.config.ts` shape

`defineConfig({...})` — every field optional, all with defaults:

- **Site:** `title`, `description`, `logo` (string SVG, or `{ image: string | { light, dark, alt }, text, href }`), `banner` (`{ content, link, dismissible, id }` — no color/type). A logo renders beside `title` in the header, so a **wordmark logo doubles the brand** ("Acme Acme") — set `text: ""` to render the mark alone. **Prefer the string form over `{ light, dark }`:** if you have the logo SVG locally and it's monochrome (solid black or white), rewrite its `fill`/`stroke` to `currentColor` and use `logo: "/logo.svg"` — it then inherits the theme's text color and adapts to light/dark automatically, so you don't need separate light/dark files.
- **`theme`:** `accent` (a color string for both modes, or `{ light, dark }` per mode), `action` (color), `mode` (`light`/`dark`/`system`), `radius`, `fonts` (`{ body, display, mono }` — each a curated Google-font slug, a `{ name, provider?, weights? }` object for any Google/Fontsource/Bunny/Fontshare family, or `{ name, variants: [{ src, weight?, style? }] }` for local font files), `background` and `backgroundImage` (each a string, or `{ light, dark }` per mode). The old `accentDark`/`backgroundDark`/`backgroundImageDark` fields were **merged into these per-mode objects** — a bare string still applies to both modes, so only reach for `{ light, dark }` when the two modes differ. There is **no** `theme.strict` and **no** `theme.css` config field — custom CSS goes in a project-root **`theme.css` file** (auto-picked-up), and a source's "strict appearance" flags drop.
- **`content`:** `root` (default `"docs"`, relative to the project dir where `blume` runs), `include`/`exclude` (arrays of globs **relative to `content.root`**; defaults `["**/*.{md,mdx}"]` / `["**/_*", "**/.*"]`), `sources` (staged sources: `filesystem`, `github-releases`, `notion`, `sanity`, `mdx-remote`, `custom` — OpenAPI is **not** one of these; it's the top-level `openapi` field), `pages` (custom `.astro` dir), `defaultType`. When docs sit directly under the project dir (no `docs/` subfolder), set `root` there and **scope `include` to the real content folders** instead of scanning everything — `references/monorepo.md` §1.
- **`basePath`** (top-level): a site-wide mount point (e.g. `"/docs"`) prepended to **every** route while staying invisible to the sidebar (no wrapper group). This is the right target for a source that served all docs under a prefix (Docusaurus `routeBasePath`, a Fumadocs `baseUrl` of `/docs`) — distinct from a per-source `prefix` (which adds a nav group) and from `deployment.base` (host subdirectory).
- **`navigation`:** `tabs`, `selectors`, `featured` (links pinned above the sidebar on every route), `sidebar` (`{ display, items }` — `display` is the global render mode above; `items` is an explicit tree), `repo`. **Avoid an explicit `navigation.sidebar` unless you have to** — lean on the filesystem-derived sidebar. It only works when the file tree roughly matches the intended sidebar layout, so reshape folders to match first; reach for `sidebar.items` only for a shape files genuinely can't express (see "Config-declared nesting" above).
- **`search`** (Orama default, Pagefind opt-in), **`ai`** (llms.txt, Ask AI, the MCP server), **`openapi`**, **`redirects`**, **`seo`**, **`markdown`**, **`analytics`**, **`deployment`**, **`i18n`**, **`toc`**, **`lastModified`**, **`github`**.
- **Don't set `deployment.site`.** Blume auto-fills it: the dev server's `localhost` URL in dev, and the deployment URL (`VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL`) on Vercel. Hardcoding it in `blume.config.ts` overrides that auto-detection and pins the wrong absolute URL (canonical links, sitemap, OG, llms.txt) everywhere but the one host you typed — so leave it unset even when a source config had a `url`/`site` field. (Sitemap still generates in production because the deploy URL is present there.)
- **Favicon is a filename convention, not config.** Drop `icon`/`favicon.{svg,png,ico}` (and `apple-icon.png`) in the project root or `public/` — Blume auto-detects it. There is **no** `favicon` config field. A source favicon given as `{ light, dark }` **collapses to one** — pick a single file and report the loss.

The schema is exported from `blume/schema`; the full field reference is in the `docs/configuration/` directory of the installed `blume` package (see "Full documentation" below for how to locate it).

### Icons are Lucide, period

Blume resolves **bare kebab-case [Lucide](https://lucide.dev) names** everywhere an icon is accepted — frontmatter `icon`, `sidebar.icon`, `meta.ts` `icon`, `navigation.tabs`/`selectors` icons, and `Card`/`Step`/`Icon`/etc. props. There is **no** FontAwesome or Tabler support and **no** `iconType` prop. Names must be **kebab-case** (`book-open`, not `BookOpen`) — a PascalCase React-component name (common in Fumadocs/lucide-react sources) does not resolve and renders nothing. When migrating a source that uses another icon set (Mintlify defaults to FontAwesome), **map each name to its closest Lucide equivalent**; where none exists, drop the icon and report it. Verify a name exists at [lucide.dev/icons](https://lucide.dev/icons) before writing it.

### Page frontmatter (strict — unknown keys are build errors)

```yaml
---
title: Install # renders as the page H1 — remove any duplicate H1 in the body
description: Install Blume and scaffold your first project.
type: doc # doc (default) | blog | changelog | api
icon: download # a Lucide name
sidebar:
  label: Install # overrides title in the sidebar
  order: 2
  icon: download
  badge: New
  hidden: false
seo:
  title: …
  description: …
  image: /og/install.png
  canonical: https://…
  noindex: false
search:
  exclude: false
  tags: [api]
slug: install # override the generated route
draft: false
lastModified: 2026-06-20 # pin the "last updated" date
---
```

Also valid: `date`/`authors` (blog/changelog feeds), `changelog` (changelog metadata), `deprecated`, `hidden`, `noindex`.

### Authoring features (no imports needed in `.mdx`)

- **The rich features are MDX-only.** Directives, `package-install`, mermaid, and math are wired into the MDX processor; in a plain `.md` file a `:::note` stays **literal text** — and the build stays green. **Rename any `.md` file that uses (or should use) these to `.mdx` during migration.** This bites hardest on Docusaurus/Starlight sources, whose `.md` content is full of `:::` admonitions. Plain Markdown (headings, tables, fenced code with titles/highlighting) is fine in `.md`.
- **Callouts as directives:** `:::note`, `:::tip`, `:::warning`, `:::danger`, `:::info`, `:::success`, with an optional title in brackets: `:::warning[Heads up]`. Aliases `caution`→warning, `error`→danger, `important`→note, `warn`→warning.
- **No-import MDX components:** `Callout`, `Card`/`CardGroup`, `Columns`/`Column`, `Steps`/`Step`, `Tabs`/`Tab`, `Accordion`/`AccordionItem`, `Expandable`, `FileTree`, `Tree`/`Tree.Folder`/`Tree.File`, `CodeGroup`, `Frame`, `Panel`, `Tooltip`, `Tile`, `Badge`, `Icon`, `TypeTable`/`AutoTypeTable`, `Color`, `YouTube`, `Visibility`, `GithubInfo`, `Component`, `CodeBlock`, `Diff`, `Prompt`, `Math`. (**Not** shipped — convert away: `<Warning>` → the `:::warning` directive, and the `ParamField`/`ResponseField`/`RequestField` field family → `TypeTable` rows or the OpenAPI reference. See the reference files for targets.)
- **Fenced-code superpowers:** ` ```package-install ` → package-manager tabs; ` ```mermaid ` → a rendered diagram; code-block titles (` ```ts server.ts `), line numbers (`lineNumbers`), and highlighting (`{1,4-5}`, `// [!code ++]`).
- **Math:** block math `$$…$$` renders in `.mdx` with **no config** (there is no `markdown.math` field). Inline `$…$` is **not** supported — a bare `$` stays literal text; convert inline math to display math or drop it (report).

### OpenAPI

`openapi: { enabled: true, sources: [{ spec, label?, route? }] }` generates **one real page per operation** — with routing, sidebar, search, and OG images for free. **The reference does not get a header tab automatically** — add a `navigation.tabs` entry pointing at the reference's `route` (reference routes are valid tab targets) or the API reference is unreachable from the header. **Never hand-migrate generated API-reference pages** (per-endpoint stub pages in the source): delete them and point `openapi.sources` at the spec. (`renderer: "scalar"` keeps the Scalar embed instead; AsyncAPI uses the same embed.)

- **Vendor the spec by default.** A remote `spec:` URL makes every build depend on fetching it at build time — a single point of failure in CI, offline, or behind a proxy, and a failed fetch skips the whole reference. Prefer committing the spec into the repo (`openapi/<name>.json`) and pointing `spec` at the local path; if you keep the URL, say so and consider a `prebuild` step that refreshes the local copy with a fallback.
- **Operation routes have their own slug scheme** — `<route>/<slugified-tag>/<slugified-operationId>` (e.g. tag `Models`, id `listModels` → `/api-reference/models/listmodels`). This rarely matches the source's endpoint links (Mintlify/others kebab-case differently), so **rewrite every inbound link to an operation**. `blume validate` resolves operation pages like any other route, so it catches the ones you miss.
- **Keep hand-written conceptual pages.** Sources often pair a written "Introduction/Authentication" page with the endpoint group in the same tab. A normal content page placed under the openapi `route` merges into the reference tab's sidebar — so keep those (auth, errors, rate limits) and delete only the per-endpoint stubs.

### Changelogs

If the source ships a **hand-maintained changelog** (a `changelog.mdx`, a folder of dated entries, Mintlify `<Update>` blocks) **and the project is open source on GitHub**, offer to replace it with the **`github-releases`** content source — release notes become the changelog automatically, with no files to maintain. It's an offer, not an automatic rewrite: some teams keep a curated changelog that doesn't map 1:1 to GitHub releases, so confirm the release notes are the source of truth before deleting their pages.

Add it under `content.sources` alongside the filesystem source:

```ts
content: {
  sources: [
    { include: ["docs/**/*.mdx"], root: ".", type: "filesystem" },
    {
      owner: "haydenbleasel",
      repo: "ultracite",
      prefix: "changelog",
      type: "github-releases",
    },
  ],
},
```

- Each release materializes as a `type: changelog` page under `/<prefix>/` (`prefix: "changelog"` → `/changelog/…`); omit `prefix` to mount at the root.
- Optional fields: `limit` (cap materialized releases, newest-first, default 100), `prereleases` (include prereleases), `drafts` (include drafts — needs a token with repo write access), `pollInterval` (dev polling seconds; omit to freeze for the session).
- A **private** repo reads a token from `GITHUB_TOKEN`; it is never inlined in config. A public repo needs no token.
- **Delete the old changelog pages** once the source is wired (and add `redirects` from their old routes to the new `/<prefix>/…` slugs). Pin a header/sidebar link with `navigation.featured` if the source had one.

### Redirects are static

A `redirects: [{ from, to, status? }]` array **in `blume.config.ts`** maps old URLs when you restructure routes — Blume serves these itself, so any reorganization that moves a page (folder-per-tab, materialized nested groups, renamed slugs, index promotion) is fixed by adding an entry there; no host config needed. **Restructuring is the main source of these:** every page you moved in step 4 (folder-per-tab, renamed slugs, index promotion) needs an entry, or old URLs 404. `status` defaults to **301 (permanent — browsers cache it indefinitely)**; that's correct for genuine moves, but never use 301/308 for redirects you might reverse. Dynamic/wildcard patterns (`:slug*`) can't be modeled as static path-to-path; move those to host-level config (`_redirects`, `vercel.json`) and report them.

## Verification & reporting

1. Run **`blume build --strict`** — it validates the frontmatter schema, duplicate routes, and config, and `--strict` makes diagnostics fail the build (without it, `blume build` **exits 0 despite content errors** and silently drops invalid pages). Then run **`blume validate --strict`** — links, heading anchors, and assets live here, not in `build` (add `--external` to also check outbound HTTP links). OpenAPI operation pages are real routes to `validate`, so dead links to them are caught too. Iterate until both are clean.
2. Run `blume dev` and review the site visually — nav structure, tabs, theme, rendered components.
3. **Write a migration summary** covering: what was migrated (config, N pages, nav, OpenAPI), what was **dropped** (navbar CTAs, footers, custom theming, dynamic redirects, unmappable icons, unsupported components), and suggested follow-ups (`blume eject` for full control, `blume add` to vendor a component for customization).

## Full documentation

The mapping details live in `references/`: one file per source framework (`mintlify.md`, `docusaurus.md`, `fumadocs.md`, `nextra.md`, `starlight.md`), plus **`monorepo.md`** for host-repo integration (content-layout detection, pnpm `minimumReleaseAge`, frozen-lockfile regeneration, the Vercel monorepo recipe, and the Astro/Vite patch). The Mintlify icon + frontmatter pass is automated by **`scripts/mintlify-codemod.mjs`** (zero-dependency, deterministic, idempotent; `--write` to apply). The authoritative Blume docs are bundled in the installed package's **`docs/` directory** — not necessarily at the repository root: in a workspace monorepo (pnpm especially) the package lives in the depending workspace's `node_modules` (e.g. `apps/docs/node_modules/blume/docs`); `node -e "console.log(require.resolve('blume/package.json'))"` run from the depending package prints the exact location. (In a repo checkout of Blume itself, the docs source is `apps/docs/content/docs`.) The most relevant pages:

- `configuration/index.mdx` — every `blume.config.ts` field.
- `content/navigation.mdx` — the sidebar/tabs/selectors model.
- `content/meta.mdx` — `meta.ts` and display modes.
- `content/syntax.mdx` — directives, code features, math.
- `content/components.mdx` — the component library and APIs.
- `reference/frontmatter.mdx` — the strict page schema.
