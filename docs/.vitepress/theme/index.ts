// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { EnhanceAppContext } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import CustomLayout from './CustomLayout.vue'

import '@shikijs/vitepress-twoslash/style.css'
import 'uno.css'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(CustomLayout)
  },
  enhanceApp({ app }: EnhanceAppContext) {
    app.use(TwoslashFloatingVue)
  },
}
