import { defineConfig } from 'blume'

export default defineConfig({
  title: 'oRPC',
  description: 'Easy to build APIs that are end-to-end type-safe and adhere to OpenAPI standards',
  logo: '/logo.svg',
  content: {
    root: '.',
    include: [
      'index.mdx',
      'docs/**/*.{md,mdx}',
      'blog/**/*.{md,mdx}',
      'learn-and-contribute/**/*.{md,mdx}',
    ],
  },
  github: {
    owner: 'middleapi',
    repo: 'orpc',
    dir: 'apps/content',
  },
  lastModified: true,
  navigation: {
    sidebar: {
      display: 'group',
    },
    tabs: [
      { label: 'Docs', path: '/docs' },
      { label: 'Blog', path: '/blog' },
      { label: 'Learn & Contribute', path: '/learn-and-contribute' },
    ],
  },
  analytics: {
    posthog: {
      key: 'phc_YHeqjC9tR604AHH45kQi63fT4aBvpsS7zAaCxntBzZm',
    },
  },
  deployment: {
    site: 'https://orpc.dev',
  },
})
