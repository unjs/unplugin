const { createUnplugin } = require('unplugin')
const MagicString = require('magic-string')

module.exports = createUnplugin((options) => {
  return {
    name: 'transform-fixture',
    transformInclude (id) {
      return id.match(/[/\\]target\.js$/)
    },
    transform (code, id) {
      const s = new MagicString(code)
      const index = code.indexOf('__UNPLUGIN__')
      if (index === -1) {
        return null
      }

      s.overwrite(index, index + '__UNPLUGIN__'.length, `[Injected ${options.msg}]`)
      return {
        code: s.toString(),
        map: s.generateMap({
          source: id,
          includeContent: true
        })
      }
    }
  }
})
