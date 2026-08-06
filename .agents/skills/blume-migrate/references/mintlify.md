# Mintlify → Blume

The deepest migration. Mintlify declares its **entire navigation in `docs.json`**; Blume derives navigation from the filesystem. The bulk of the work is reshaping content into folders + tabs and translating config, callouts, and icons.

## Detect

- `docs.json` (current) or `mint.json` (legacy) at the repo root — the config file.
- A `mintlify` dependency / `mintlify dev` script.
- Content is `.mdx` under the repo root (Mintlify has no `content.root` — pages live at the top level), with a `/snippets` folder and image dirs like `/images`.

Read `docs.json` first; it drives everything.

## Config: `docs.json`/`mint.json` → `blume.config.ts`

Resolve `$ref` includes first (Mintlify splits config across files). Map only what's set:

| Mintlify | Blume | Notes |
| --- | --- | --- |
| `name` / `title` | `title` |  |
| `description` | `description` |  |
| `logo` (string or `{ light, dark, href }`) | `logo` (string, or `{ image: { light, dark, alt }, text, href }`) | Mintlify's `light`/`dark` nest under Blume's `image`; ensure files land in `public/`. **If the SVG is local and monochrome** (a solid black or white mark), rewrite its `fill`/`stroke` to `currentColor` and collapse `{ light, dark }` to the string shorthand `logo: "/logo.svg"` — one file that inherits the theme text color and flips with light/dark automatically. If the logo is a **wordmark** (brand name baked in), set `text: ""` so it doesn't render twice beside `title` |
| `favicon` (string **or `{ light, dark }`**) | **drop the field** — copy **one** file into `public/` under the conventional name (`favicon.svg`/`icon.png`) | Blume auto-detects by filename; there is **no** favicon config field, and **no** light/dark favicon — a `{ light, dark }` source collapses to one; report the loss |
| `colors.primary` + `colors.light` | `theme.accent` (`{ light, dark }`) | accent is now **per-mode**: `accent: { light: <colors.primary>, dark: <colors.light> }`. If Mintlify sets only `primary`, collapse to the string shorthand `accent: "<colors.primary>"` (applies to both modes) |
| `colors.dark` | `theme.action` |  |
| `appearance.default` | `theme.mode` (`light`/`dark`/`system`) |  |
| `appearance.strict` | **drop** | `theme.strict` was removed — writing it is a config error |
| `background.color.{light,dark}` | `theme.background` (`{ light, dark }`) | one field now: `background: { light: …, dark: … }` (a bare string applies to both) |
| `background.image` | `theme.backgroundImage` (`{ light, dark }`) | same per-mode shape as `background` |
| `background.decoration` | **drop** | no Blume equivalent |
| `fonts.family` / `fonts.{heading,body}.family` | `theme.fonts.{display,body}` | a curated slug (kebab-case, e.g. `space-grotesk`) maps directly; any other Google family maps to the object form `{ name: "Family Name" }`; a self-hosted font (`fonts.*.src` URLs) maps to `{ name, variants: [{ src, weight }] }` after downloading the files into the project |
| `banner` | `banner` (`{ content, dismissible, id, link }`) | **only** those keys — drop `banner.color`/`banner.type` |
| `styling.latex: true` | **drop the field** — block math `$$…$$` renders in `.mdx` with no config | there is **no** `markdown.math` field; inline `$…$` is **not** supported — convert inline math to `$$…$$` or drop it (report) |
| `styling.codeblocks.theme` | `markdown.codeBlocks.theme` (`{ light, dark }`) |  |
| `search.prompt` | **drop** | no equivalent |
| `seo.metatags` | **drop** | no equivalent; use per-page `seo` frontmatter |
| `seo.indexing: "all"` | `search.indexing.includeHiddenPages: true` |  |
| `variables` (`{{name}}`) | **inline into content** | Blume has no runtime `{{var}}` substitution — replace each `{{name}}` with its value in the pages |
| `integrations.posthog` (`{ apiKey, apiHost }`) | `analytics.posthog` (`{ key, host }`) | preserve the host verbatim (e.g. `us.posthog.com` — Blume's default is `us.i.posthog.com`) |
| `integrations` (GA, Plausible, Fathom, …) | `analytics.scripts` / `analytics.vercel` | one `scripts[]` entry per provider (`{ src, strategy, attributes }`); no first-class mapping beyond PostHog/Vercel |
| `contextual` (`["copy","chatgpt","claude",…]`) | **mostly free** | Copy-as-Markdown and Open-in-chat are default page actions; `mcp` needs `ai.mcp.enabled` + server output (report as a follow-up) |
| `redirects` | `redirects: [{ from, to }]` | static only — see below |
| `navigation.languages` | `i18n` | see i18n below |

A minimal result is often just `defineConfig({ title, logo, theme: { accent } })`.

## Icons: FontAwesome → Lucide (required)

Mintlify defaults to **FontAwesome**; Blume is **Lucide-only**. Convert every icon reference — frontmatter `icon`, nav-group `icon`, `<Icon>`, `<Card icon>` — to the closest Lucide name. Discard Mintlify's `iconType` (solid/regular/brands) entirely.

**Automate the frontmatter pass — don't hand-edit it.** `scripts/mintlify-codemod.mjs` (in this skill, zero-dependency) remaps every **frontmatter** `icon:` using the table below, drops brand/no-equivalent icons, and — in the same pass — drops/renames unsupported frontmatter keys (see [Frontmatter](#frontmatter)). It's deterministic and idempotent, and reports what it changed per file plus what it couldn't (unknown icons, OpenAPI-stub flags):

```bash
# <skill> = this skill's directory (the one containing SKILL.md); dry run first (report only), then apply:
node <skill>/scripts/mintlify-codemod.mjs <content-dir>
node <skill>/scripts/mintlify-codemod.mjs --write <content-dir>
```

The codemod touches **only frontmatter**. Icons in MDX **body** (`<Icon icon="…">`, `<Card icon="…">`, nav-group icons in `docs.json`) it does not see — convert those by hand using the same table. Common mappings:

| FontAwesome | Lucide |  | FontAwesome | Lucide |
| --- | --- | --- | --- | --- |
| `bolt` | `zap` |  | `gear`/`cog` | `settings` |
| `circle-info`/`info` | `info` |  | `wand-magic-sparkles`/`magic` | `sparkles` |
| `house` | `house` |  | `magnifying-glass` | `search` |
| `gauge`/`gauge-high` | `gauge` |  | `puzzle-piece` | `puzzle` |
| `envelope` | `mail` |  | `file-lines` | `file-text` |
| `pen-to-square` | `square-pen` |  | `trash-can` | `trash-2` |
| `xmark`/`times` | `x` |  | `circle-check` | `circle-check` |
| `triangle-exclamation` | `triangle-alert` |  | `circle-exclamation` | `circle-alert` |
| `arrow-right-from-bracket` | `log-out` |  | `right-to-bracket` | `log-in` |
| `location-dot`/`map-marker` | `map-pin` |  | `comments` | `messages-square` |
| `cube` | `box` |  | `cubes`/`boxes` | `boxes` |
| `layer-group` | `layers` |  | `diagram-project`/`sitemap` | `workflow`/`network` |
| `chart-line` | `chart-line` |  | `chart-simple`/`chart-column` | `chart-column` |
| `flask` | `flask-conical` |  | `robot` | `bot` |
| `screwdriver-wrench`/`toolbox` | `wrench` |  | `circle-question`/`question` | `circle-help` |
| `life-ring` | `life-buoy` |  | `shield-halved` | `shield` |
| `rocket`/`book`/`book-open`/`code`/`terminal`/`key`/`lock`/`user`/`users`/`database`/`server`/`cloud`/`bell`/`calendar`/`star`/`heart`/`tag`/`folder`/`globe`/`link`/`download`/`upload`/`check`/`copy`/`play`/`filter` | _(same name — verify)_ |

**Rules:** verify each Lucide name exists at [lucide.dev/icons](https://lucide.dev/icons) before writing it. **Brand icons** (`fa6-brands:*` — github, discord, x, slack, linkedin…) mostly have **no** Lucide equivalent: for GitHub use the `github` config (renders the header repo link); for other socials, drop the icon and report it (or add via a Footer override after `blume eject`). Where no Lucide counterpart exists, **drop the icon and report it** — an unknown icon name is a build error.

## Navigation: `docs.json` `navigation` → filesystem + tabs

Mintlify's `navigation` object (`tabs`/`anchors`/`dropdowns`/`products`/`versions`/`languages`/`groups`/`pages`) is fully config-declared. **Prefer restructuring content into folders**, not porting the config verbatim:

- **`groups`** (`{ group, pages: [...] }`) → a folder per group. The `group` name → the folder's humanized name or a `meta.ts` `title`. Nested groups → nested folders. `expanded: false` → `meta.ts` `collapsed: true` (inverted). `tag` → the folder/page `sidebar.badge`. **Folder metadata is a `meta.ts` module** (`export default defineMeta({ title, icon, order, collapsed, pages })`), a TypeScript file — **not** JSON. Blume does not read a `meta.json`, so any folder-level config you carry over from the source (or hand-write to preserve a group's label/order/collapse) must be authored as `meta.ts`. (Render mode — flat/group/page — is **not** a `meta.ts` field; it's the global `navigation.sidebar.display` in `blume.config.ts`.)
- **Config-only nested groups don't exist on disk — you must materialize them, or they flatten silently.** A nested `{ group, pages }` almost never has a matching subfolder: its pages sit **flat in the parent directory** (e.g. `platform/analytics/getting-started.mdx`, `…/quick-reference.mdx`) and the grouping lives **only** in the `docs.json` `pages` array. If you leave the files where they are, filesystem-derived nav sees one flat folder and the inner group vanishes — Mintlify's `Analytics → Reference → {…}` becomes a flat `Analytics → {…}`. To preserve it you must **either** move those pages into a real subfolder (`platform/analytics/reference/`, with a `meta.ts` for the label/`collapsed`), **or** declare the shape in an explicit `navigation.sidebar`. Walk **every** `pages` array recursively and treat any nested `group` object as a folder-move to plan, not files already in place. When inventorying the nav (workflow step 2), record the config nesting depth separately from the on-disk depth — they diverge exactly here.
- **This is the canonical case for `navigation.sidebar` over folders.** Materializing a purely-presentational nested group as a subfolder changes URLs (`/platform/analytics/getting-started` → `/platform/analytics/reference/getting-started`) for no reason other than a visual grouping, forcing a `redirects` entry per page. When you want to keep the nesting **and** the URLs, an explicit `navigation.sidebar` group (`{ label, items }`) is the better trade — it nests the existing routes without moving any file. Pick per group; don't reflexively flatten.
- **`pages`** entries are page refs (paths without extension) → files at the corresponding path. An entry that's `"GET /path"` is an OpenAPI endpoint stub → **delete it** (Blume generates these; see OpenAPI).
- **`tabs`** (top-level `navigation.tabs`, e.g. `App` / `API` / `API reference`) → Blume's **header tabs** `navigation.tabs` (`{ label, path, icon? }`). **Keep them as tabs — do not flatten them into `navigation.sidebar` groups or sections.** Flattening is the easy translation error: it collapses the site's top-level structure into one global sidebar and loses the header tab bar entirely. A Mintlify top-level tab is a header tab; map it to one. Put each tab's pages in **one folder** and point the tab's `path` at it — the tab then scopes the sidebar automatically (under the tab's `path`, the sidebar shows only that folder). **Blume resolves the active tab by URL prefix** (the tab whose `path` is the longest prefix of the current route), so every page in a tab must live under that tab's single `path`. Mintlify tabs freely mix pages from any folder / arbitrary routes; Blume tabs scope by prefix, so a tab that pulls in routes from all over is **not portable as-is**. You have two choices, per tab:
  - **Move the pages under one prefix** so they share the tab's `path` (a route change → add a `redirects` entry for each moved page). This preserves the exact tab grouping.
  - **Accept the closest shape** — assign each shared/cross-cutting page to one tab's folder and link to it from the others — when moving routes isn't worth the churn.

  Call this trade out explicitly in the migration report; don't silently pick one. **The scoping is bidirectional:** on the root/landing route Blume _hides_ every tab folder and lists only untabbed top-level pages — so a Mintlify home whose single sidebar showed everything becomes a lean root list plus one sidebar per tab. That's automatic; don't try to exclude tab folders from the root by hand.

- **`dropdowns`/`products`/`versions`** → `navigation.selectors` (`{ kind, label, items: [{ label, path, icon?, description?, tag? }] }`). Use `kind` `dropdown`/`product`/`version` accordingly.
- **`anchors` / `navigation.global.anchors` / `navbar.links`** (persistent header links — Blog, Changelog, Community, Contact/Support) → **`navigation.featured`** (`{ label, href, icon? }`). These pin to the **top of the sidebar, above every section, on every route** (not tab-scoped) — the right home for Mintlify's always-visible utility links. An external `href` opens in a new tab; an internal one (`/contact`) is build-time validated against your pages. Convert the FontAwesome `icon` to Lucide as usual. (This replaces the old "drop and report" for anchors.) The `navbar.primary` **CTA button** has no featured equivalent — see Dropped.
- **`languages`** → `i18n`, not a selector (see below).
- Only fall back to an explicit `navigation.sidebar` for a shape the filesystem genuinely can't express.

This reshaping **changes URLs** — a page moved from `getting-started/quickstart` into the API tab's folder becomes `/api/…`, an `index` promotion drops a segment, etc. Record each old→new path and add a `redirects` entry for it (see below); otherwise every existing link and bookmark 404s.

## Content & component transforms

Rewrite each page's MDX:

- **Callouts → directives** (directives are **MDX-only** — Mintlify content is already `.mdx`, so this just works; never rename a page to `.md`): `<Note>`→`:::note`, `<Tip>`→`:::tip`, `<Warning>`→`:::warning`, `<Info>`→`:::info`, `<Check>`→`:::success`, `<Danger>`/`<Error>`→`:::danger`. `<Callout type="x">` maps by type (`caution`→warning, `check`→success). A `title` attr → `:::type[Title]`. Drop `icon`/color props.
- **Accordions — container/item inversion!** Mintlify nests `<Accordion title="…">` inside `<AccordionGroup>`. Blume inverts: `<AccordionGroup>`→`<Accordion>` (container), and each Mintlify `<Accordion title="…">`→`<AccordionItem title="…">` (item).
- **`<RequestExample>`/`<ResponseExample>`** → `<CodeGroup>` (titled-fence tabs).
- **`<Tabs>` → `<Tabs inline>`.** Mintlify renders tabs **borderless** — a strip on a full-width rule with the content flowing beneath as prose — while Blume's `<Tabs>` defaults to a bordered box. Add `inline` to each `<Tabs>` to preserve Mintlify's appearance; every child `<Tab title="…">` is unchanged. Don't add `param` — Mintlify tabs switch in place and don't deep-link to the URL, so plain `inline` is the faithful mapping.
- **These pass through — Blume ships them natively:** `<Columns>`/`<Column>`, `<Expandable>`, `<Tooltip>`, `<Frame>`, `<Panel>`, `<Card>`/`<CardGroup>`, `<Tab>`, `<Steps>`/`<Step>`. Keep them as-is.
- **API fields → `TypeTable`.** Blume does **not** ship `<ParamField>`/`<ResponseField>`/`<RequestField>`. Convert a cluster of fields into one `<TypeTable>` (rows keyed by field name, each `{ type, required?, default?, description }`). For a fully spec'd API, prefer deleting the hand-written fields and using the [OpenAPI reference](#openapi) instead.
- **`<Update>`** (a Mintlify changelog entry) has no component form → convert to a `type: changelog` page, or use the `github-releases` source.
- **Snippets are inlined, not imported.** Blume has no `/snippets` import mechanism. For each `import X from "/snippets/x.mdx"` + `<X prop="v" />`, inline the snippet's body (substituting `{prop}` placeholders), then delete the import and the `/snippets` file. Named string imports (`import { foo } from "/snippets/vars.mdx"`) → inline the value at each `{foo}`.

## Frontmatter

Mintlify page frontmatter → Blume's strict schema. **`scripts/mintlify-codemod.mjs --write` does the mechanical rows automatically** (rename, drop, icon-remap) and flags the judgment rows (`openapi`/`asyncapi`/`api`) for you — see [Icons](#icons-fontawesome--lucide-required) for the invocation. The table is both the mapping reference and a description of exactly what the codemod does:

| Mintlify | Blume | Codemod |
| --- | --- | --- |
| `title` / `description` | pass through | — |
| `sidebarTitle` | `sidebar.label` | renames |
| `icon` | remapped to a Lucide name in place (top-level `icon` is valid Blume frontmatter; keep it there) | remaps |
| `tag` | `sidebar.badge` | renames |
| `canonical` | `seo.canonical` | renames |
| `og:image` | `seo.image` | renames |
| `hidden: true` | valid top-level in Blume — **kept as-is**; add `noindex: true` yourself if the page must also leave the search index | left (do by hand) |
| `openapi`/`asyncapi`/`api` | usually an endpoint stub → **delete the page** (Blume generates operation pages); else `type: api` | **flags** for review — never auto-deletes a page |
| `mode`, `public`, `rss`, `groups`, `keywords`, `hideApiMarker`, `hideFooterPagination`, `iconType` | **drop** (report) | drops |

The codemod leaves the source key in place and reports a conflict rather than clobbering data when a rename target already exists (e.g. a page already has `sidebar.label`) or the value is too structured to move safely — resolve those by hand. Remove any duplicate H1 in the body — `title` renders the H1. (The codemod only edits frontmatter; it never touches the body.)

## OpenAPI

Top-level `openapi`, `api.openapi`, or a per-group/per-tab `openapi` → `openapi: { enabled: true, sources: [{ spec, label?, route? }] }`. A Mintlify `{ source, directory }` object: `directory` → the source's `route`. **Delete every per-endpoint stub page** (frontmatter `openapi: "GET /path"` or a `"GET /path"` nav entry) — Blume's native renderer generates one real page per operation. **Add a `navigation.tabs` entry pointing at the reference `route` yourself** (Mintlify's API tab maps to it); the reference does not create a header tab automatically.

- **Vendor the spec.** Mintlify usually points at a spec **URL**. Copying that straight into `spec:` makes every build fetch it at build time — a single point of failure in CI/offline/behind a proxy, and a failed fetch silently drops the reference (leaving the tab pointing at a route that 404s). Prefer downloading it into the repo (`curl … -o openapi/<name>.json`) and pointing `spec` at that local path. If you keep the URL, report the dependency and consider a `prebuild` refresh-with-fallback.
- **Fix endpoint links.** Blume operation routes are `<route>/<slugified-tag>/<slugified-operationId>` (tag `Models` + id `listModels` → `/api-reference/models/listmodels`) — this differs from Mintlify's endpoint URLs, so **rewrite every inbound link to an operation**. `blume validate` resolves operation pages like any other route and flags the ones you miss.
- **Keep the "Introduction" page.** Mintlify commonly has a written intro/auth page in an "Introduction" group beside the "Endpoints" (openapi) group in the same tab. Keep it: a normal content page placed under the openapi `route` (e.g. `<root>/api-reference/introduction.mdx`) merges into the reference tab's sidebar alongside the generated operations. Delete only the per-endpoint stubs, not the conceptual pages.

## Assets

Mintlify serves every top-level dir (e.g. `/images`) at the site root. Blume serves `public/` at the site root. **Move root asset dirs into `public/`** (`mv images public/images`) — every `/images/...` reference still resolves, unchanged. Move loose root files (`logo.png`, `favicon.png`) under `public/` too.

## i18n

`navigation.languages` (≥2) → `i18n: { defaultLocale, locales: [{ code, label }] }`. The `default: true` language → `defaultLocale`. Translated content already lives in ISO-code directories, which match Blume's `dir` parser — no file moves. Remove any language selector; language switching is handled by i18n.

## Dropped — report these

- **`navbar.primary`** (the prominent header **CTA button**, e.g. "Get Started"/"Sign Up") → no button equivalent; re-add via `navigation.tabs`, a `navigation.featured` link, or a Header override. (Plain `navbar.links` and `anchors` map to `navigation.featured` — see Navigation above, not here.)
- **`footer.socials`** → suggest the `github` config, or a Footer override.
- **Per-language banners** (`navigation.languages[].banner`) → no equivalent.
- **Dynamic redirects** (`:slug*`/`:id` params) → can't be static path-to-path; move to host rules (`_redirects`, `vercel.json`).
- **`<Update>`** changelog components, `iconType`, `background.decoration`, `search.prompt`, `seo.metatags`.
