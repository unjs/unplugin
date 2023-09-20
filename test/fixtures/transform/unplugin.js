const MagicString = require('magic-string')
const { createUnplugin } = require('unplugin')

module.exports = createUnplugin((options, meta) => {
  return [
    {
      name: 'transform-fixture-pre',
      resolveId(id) {
        // Rollup doesn't know how to import module with query string so we ignore the module
        if (id.includes('?query-param=query-value') && meta.framework === 'rollup') {
          return {
            id,
            external: true,
          }
        }
      },
      transformInclude(id) {
        return id.match(/[/\\]target\.js$/) || id.includes('?query-param=query-value')
      },
      transform(code, id) {
        const s = new MagicString(code)
        const index = code.indexOf('__UNPLUGIN__')
        if (index === -1)
          return null

        const injectedCode = `[Injected ${options.msg}]`
        if (id.includes(injectedCode))
          throw new Error('File was already transformed')

        s.overwrite(index, index + '__UNPLUGIN__'.length, injectedCode)
        return {
          code: s.toString(),
          map: s.generateMap({
            source: id,
            includeContent: true,
          }),
        }
      },
    },
    {
      name: 'transform-fixture-post',
      transformInclude(id) {
        return id.match(/[/\\]target\.js$/) || id.includes('?query-param=query-value')
      },
      transform(code, id) {
        if (!code.includes('Injected'))
          return null

        const s = new MagicString(code)
        s.replace(
          'Injected',
          'Injected Post',
        )

        return {
          code: s.toString(),
          map: s.generateMap({
            source: id,
            includeContent: true,
          }),
        }
      },
    },
  ]
})
