/* eslint-disable no-console */
/* eslint-disable antfu/no-top-level-await */

import process from 'node:process'
import alchemy from 'alchemy'
import { Website } from 'alchemy/cloudflare'
import { GitHubComment } from 'alchemy/github'
import { CloudflareStateStore } from 'alchemy/state'

const app = await alchemy('orpc-content', {
  stateStore: scope => new CloudflareStateStore(scope),
})

const website = await Website('website', {
  build: {
    command: 'pnpm run build',
  },
  assets: './.vitepress/dist',
  ...(app.stage === 'prod' && {
    domains: ['orpc.dev'],
  }),
})

console.log(`✅ Deployed to: ${website.url}`)

if (process.env.PULL_REQUEST) {
  await GitHubComment('pr-preview-comment', {
    owner: 'unnoq',
    repository: 'orpc',
    issueNumber: Number(process.env.PULL_REQUEST),
    body: `## 🚀 Preview Deployed

Your changes have been deployed to a preview environment:

**🌐 Website:** ${website.url}

Built from commit ${process.env.GITHUB_SHA?.slice(0, 7) ?? 'unknown'}

---
<sub>🤖 This comment updates automatically with each push.</sub>`,
  })
}

await app.finalize()
