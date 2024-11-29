import Unocss from 'unocss/vite'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { groupIconVitePlugin, localIconLoader } from 'vitepress-plugin-group-icons'
import { MarkdownTransform } from './.vitepress/plugins/markdownTransform'

export default defineConfig({
  plugins: [
    MarkdownTransform(),
    Components({
      include: [/\.vue/, /\.md/],
      dirs: '.vitepress/components',
      dts: '.vitepress/components.d.ts',
    }),
    // @ts-expect-error mismatch vite version
    Unocss(),
    Icons(),
    groupIconVitePlugin({
      customIcon: {
        farm: localIconLoader(import.meta.url, '.vitepress/assets/farm.svg'),
        rolldown: localIconLoader(import.meta.url, '.vitepress/assets/rolldown.svg'),
        rspack: localIconLoader(import.meta.url, '.vitepress/assets/rspack.svg'),
      },
    }),
  ],
})
