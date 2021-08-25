const { createUnplugin } = require('unplugin')

module.exports = createUnplugin((options) => {
  return {
    name: 'transform-fixture',
    transformInclude (id) {
      return id.match(/[/\\]target\.js$/)
    },
    transform (code) {
      return code.replace('__UNPLUGIN__', `[Injected ${options.msg}]`)
    }
  }
})
