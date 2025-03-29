import type { EnhanceAppContext } from 'vitepress'
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import Theme from 'vitepress/theme'
import { h } from 'vue'
import AsideSponsors from './components/AsideSponsors.vue'
import Banner from './components/Banner.vue'

import 'virtual:group-icons.css'
import '@shikijs/vitepress-twoslash/style.css'
import './custom.css'

export default {
  extends: Theme,
  enhanceApp({ app }: EnhanceAppContext) {
    app.use(TwoslashFloatingVue)
  },
  Layout() {
    return h(Theme.Layout, null, {
      'aside-outline-after': () => h(AsideSponsors),
      'layout-top': () => h(Banner),
    })
  },
}
