import MarkdownItGitHubAlerts from 'markdown-it-github-alerts'
import { defineConfig } from 'vitepress'

import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { groupIconMdPlugin } from 'vitepress-plugin-group-icons'
import { repositoryMeta } from './data/meta'
import { description, ogImage, title } from './constance'

import vite from './vite.config'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title,
  description,
  lastUpdated: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Showcase', link: '/showcase/', activeMatch: '/showcase/' },
    ],
    search: {
      provider: 'local',
    },
    logo: {
      light: '/logo_light.svg',
      dark: '/logo_dark.svg',
    },

    sidebar: {
      '/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/' },
            // { text: 'Why Unplugin', link: '/guide/why' },
            { text: 'Plugin Conventions', link: '/guide/plugin-conventions' },
          ],
        },
        {
          text: 'Showcase',
          link: '/showcase/',
          items: [
            {
              text: 'Overview',
              link: '/showcase/',
            },
            ...repositoryMeta.map(repo => (
              {
                text: repo.name,
                link: `/showcase/${repo.name}`,
              }
            )),
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/unjs/unplugin' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright (c) 2021-PRESENT UnJS Team',
    },
  },
  head: [
    ['meta', { name: 'theme-color', content: '#ffffff' }],
    ['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'author', content: 'Nuxt Contrib' }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: ogImage }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' }],
  ],
  markdown: {
    config: (md: any) => {
      md.use(MarkdownItGitHubAlerts)
      md.use(groupIconMdPlugin)
    },
    codeTransformers: [
      transformerTwoslash(),
    ],
  },
  ignoreDeadLinks: true,
  vite: vite as any,
})
