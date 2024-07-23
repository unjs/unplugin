import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import Components from 'unplugin-vue-components/vite'
import Unocss from 'unocss/vite'
import Icons from 'unplugin-icons/vite'
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
  ],
})
