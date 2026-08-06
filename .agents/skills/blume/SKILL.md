---
name: blume
description: Build and maintain documentation sites with Blume, the markdown-first docs framework on Astro and Vite. Use when working in a project that depends on `blume`, when scaffolding or configuring a docs site, writing Markdown/MDX content, tuning navigation/search/theming/SEO/AI features, running the `blume` CLI (init, dev, build, eject), or editing `blume.config.ts` and `meta.ts` files.
---

# Blume

Blume is an open-source, **markdown-first** documentation framework built on Astro and Vite. Drop Markdown or MDX into a folder, run `blume dev`, and get a production-grade docs site — navigation, search, theming, Open Graph images, and a rich component library — with no app boilerplate to write or maintain.

The core idea: **the framework _is_ the template.** There's no starter to clone and no project to own before you've written a word. The only thing you touch is your content. When you outgrow the defaults, you add configuration one file at a time — and you can `blume eject` to a plain Astro project the day you want full control.

## What makes it different

- **Fast by default** — Static HTML on Astro/Vite. The core theme ships no client framework JS so pages score well on Core Web Vitals out of the box. You opt into server features only when you need them.
- **AI-ready out of the box** — Emits `llms.txt`/`llms-full.txt`, serves any page's raw Markdown by appending `.md` to its URL, offers **Copy as Markdown** and **Open in chat** on every page, and can host an optional **Ask AI** assistant or an **MCP server** so coding agents read your docs directly.
- **Zero configuration — even the template** — A folder of docs is a complete project. Navigation is inferred from files, search works in dev and production with no hosted service, and theming is a handful of tokens.
- **Type-safe to the core** — `blume.config.ts` and every `meta.ts` are real TypeScript, validated by a schema and authored with `defineConfig` and `defineMeta`. Your editor autocompletes options and catches mistakes before a build.

## Quickstart

Blume needs **Node.js 22.12 or newer**. From an empty or existing project:

```bash
npm i blume      # install the package
blume init       # scaffold: docs/index.mdx + blume.config.ts
blume dev        # dev server with hot reload
blume build      # static HTML to dist/, with a local search index
```

Blume works with any package manager and never requires you to set up Astro or Tailwind yourself.

### Writing a page

Every page is Markdown or MDX with a little frontmatter. The `title` and `description` render as the page heading and intro automatically; built-in components (callouts, cards, tabs, steps, and more) need **no imports**.

```mdx
---
title: Introduction
description: Welcome to my docs.
---

Welcome! Use **Markdown** and built-in components — no imports required:

:::note
Blume ships callouts, cards, tabs, steps, and more.
:::
```

Navigation, search, and page metadata are inferred from your files as you add them.

## What's included

- **Components** — callouts, cards, steps, tabs, accordions, badges, file trees, and parameter tables, usable in MDX with no imports.
- **Local search** — Orama in dev and production; Pagefind is one flag away for large sites. No hosted index.
- **AI** — `llms.txt`, raw Markdown URLs, Copy as Markdown, Open in chat, an Ask AI assistant, and an MCP server endpoint served by the docs site itself.
- **Navigation** — inferred from files, refined with `meta.ts` or config.
- **SEO** — metadata, Open Graph images, RSS feeds, and JSON-LD.
- **Customization** — component overrides, React islands, custom pages, theme tokens, and a source-component registry via `blume add`.
- **Eject** — `blume eject` produces a standalone Astro project that still uses the `blume` package.

## How it works

The Blume CLI discovers your content, builds a content graph, and generates a hidden Astro project under `.blume/` that it drives for dev and build. The generated runtime is an implementation detail — you write Markdown, Blume handles the rest — until you choose to eject and own it.

## Full documentation

This is a high-level overview. For complete, authoritative docs — configuration reference, every CLI command and flag, component APIs, content authoring, navigation, search, SEO, AI features, theming, and deployment — read the `docs/` directory bundled inside the installed `blume` package.

**Locate the package first — it is not always at the repository root.** In a workspace monorepo (pnpm especially), `blume` is installed in the depending workspace's `node_modules` (e.g. `apps/docs/node_modules/blume/docs`), not the root. From the package that depends on `blume`, this prints the exact location:

```bash
node -e "console.log(require.resolve('blume/package.json'))"
```

The docs sit in `docs/` next to that `package.json`. Start with `docs/index.mdx` (Introduction) and `docs/01-quickstart.mdx`, then browse the `configuration/`, `content/`, `reference/`, and `advanced/` sections for specifics.
