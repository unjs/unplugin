import type { PluginOption } from 'vite'
import { basename } from 'node:path'
import { repositoryMeta } from '../data/meta'

const repos = repositoryMeta.map(({ name }) => `${name}`)

export function MarkdownTransform(): PluginOption {
  // eslint-disable-next-line regexp/no-super-linear-backtracking
  const MARKDOWN_LINK_RE = /(?<link>\[.*?\]\((?<url>.*?)\)|<img.*?src="(?<url2>.*?)".*?>)/g
  const GH_RAW_URL = 'https://raw.githubusercontent.com'
  const GH_URL = 'https://github.com/unplugin'
  const images = ['png', 'jpg', 'jpeg', 'gif', 'svg'].map(ext => `.${ext}`)
  return {
    name: 'unplugin-md-transform',
    enforce: 'pre',
    async transform(code, id) {
      // only transform markdown on meta files
      if (!repos.includes(basename(id, '.md')))
        return null

      // https://github.com/unplugin/unplugin-vue-components/blob/main/README.md?plain=1#L66
      // Manual add line break
      code = code.replaceAll('<br>', '<br> \n')

      // https://github.com/unplugin/unplugin-icons/blob/main/README.md?plain=1#L425
      code = code.replaceAll(' < ', ' &lt; ').replaceAll(' > ', ' &gt; ')

      // replace markdown img link
      // code reference: https://github.com/unjs/ungh/blob/main/utils/markdown.ts
      const { name, owner, defaultBranch } = repositoryMeta.find(({ name }) => name === basename(id, '.md'))!
      const _defaultBranch = defaultBranch || 'main'
      code = code.replaceAll(MARKDOWN_LINK_RE, (match, _, url: string | undefined, url2: string) => {
        const path = url || url2
        // If path is already a URL, return the match
        if (path.startsWith('http') || path.startsWith('https'))
          return match

        // handle images and links differently
        return match.includes('<img') || images.some(ext => match.includes(ext))
          ? match.replace(path, `${GH_RAW_URL}/${owner}/${name}/${_defaultBranch}/${path.replace(/^\.\//, '')}`)
          : match.replace(path, `${GH_URL}/${name}/tree/${_defaultBranch}/${path.replace(/^\.\//, '')}`)
      })

      let useCode = code
      let idx = 0

      while (true) {
        const detailIdx = useCode.indexOf('<details>', idx)
        if (detailIdx === -1)
          break

        const summaryIdx = useCode.indexOf('<summary>', idx + 10)
        if (summaryIdx === -1)
          break

        const endSummaryIdx = useCode.indexOf('</summary>', summaryIdx + 10)
        if (endSummaryIdx === -1)
          break

        const title = useCode.slice(summaryIdx + 9, endSummaryIdx)
          .trim()
          .replaceAll('<br>', '')
          .replaceAll('<br/>', '')
          .replaceAll('<br />', '')

        const endDetailIdx = useCode.indexOf('</details>', endSummaryIdx + 11)
        if (endDetailIdx === -1)
          break

        const detailBody = useCode.slice(endSummaryIdx + 10, endDetailIdx)
          .trim()
          .replaceAll('<br>', '')
          .replaceAll('<br/>', '')
          .replaceAll('<br />', '')

        let rest = useCode.slice(endDetailIdx + 11).trim()
        // additional <br> in some readme packages between details
        if (rest.startsWith('<br>'))
          rest = rest.slice(4)
        if (rest.startsWith('<br/>'))
          rest = rest.slice(5)
        if (rest.startsWith('<br />'))
          rest = rest.slice(6)

        useCode = `${useCode.slice(0, detailIdx)}\n::: details ${title}\n\n${detailBody}\n:::\n`
        idx = useCode.length
        useCode += rest
      }

      return useCode
    },
  }
}
