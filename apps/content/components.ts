import { defineComponents } from 'blume'

// Statically parsed by Blume (never executed) — keep values literal.
export default defineComponents({
  mdx: {
    SponsorSlot: './sponsors/SponsorSlot.astro',
  },
  layout: {
    Sidebar: './components/blume/NavTree.astro',
    TableOfContents: './components/blume/TableOfContents.astro',
  },
})
