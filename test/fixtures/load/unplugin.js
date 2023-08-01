const MagicString = require('magic-string')
const { createUnplugin } = require('unplugin')

const virtualPath = 'virtual/1'

function getVirtualId(id) {
  // 规定虚拟模块需要返回 "\0"
  return `\0${id}`
}

module.exports = createUnplugin((options) => {
  return {
    name: 'load-called-before-transform',
    resolveId(id) {
      if (id === virtualPath)
        return getVirtualId(id)
    },
    loadInclude(id) {
      return id === getVirtualId(virtualPath)
    },
    load() {
      return 'export default "load:VIRTUAL:ONE__unplugin__"'
    },
    // transformInclude(id) {
    //   return id === getVirtualId(virtualPath)
    // },
    transform(code, id) {
      const s = new MagicString(code)
      const index = code.indexOf('__unplugin__')
      if (index === -1)
        return null

      const injectedCode = `->transform-[Injected ${options.msg}]`

      if (code.includes(injectedCode))
        throw new Error('File was already transformed')

      s.overwrite(index, index + '__unplugin__'.length, injectedCode)
      return {
        code: s.toString(),
        map: s.generateMap({
          source: id,
          includeContent: true,
        }),
      }
    },
  }
})
