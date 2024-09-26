import { fileURLToPath } from 'node:url'
import Unocss from 'unocss/vite'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { groupIconVitePlugin, localIconLoader } from 'vitepress-plugin-group-icons'
import { MarkdownTransform } from './plugins/markdownTransform'

export default defineConfig({
  plugins: [
    MarkdownTransform(),
    Components({
      include: [/\.vue/, /\.md/],
      dirs: '.vitepress/components',
      dts: '.vitepress/components.d.ts',
    }),
    Unocss(fileURLToPath(new URL('./uno.config.ts', import.meta.url))),
    Icons(),
    groupIconVitePlugin({
      customIcon: {
        farm: localIconLoader(import.meta.url, './assets/farm.svg'),
        rolldown: localIconLoader(import.meta.url, './assets/rolldown.svg'),
        rspack: localIconLoader(import.meta.url, './assets/rspack.svg'),
      },
    }),
  ],
})
