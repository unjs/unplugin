const fs = require('fs')
const MagicString = require('magic-string')
const { createUnplugin } = require('unplugin')

const targetFileReg = /(?:\/|\\)msg\.js$/
module.exports = createUnplugin((options) => {
  return {
    name: 'load-called-before-transform',
    loadInclude(id) {
      return targetFileReg.test(id)
    },
    buildStart() {
    },
    resolveId() {
    },
    load(id) {
      const code = fs.readFileSync(id, { encoding: 'utf-8' })
      const str = new MagicString(code)
      const _index = code.indexOf('msg')
      const loadInjectedCode = 'msg -> through the load hook -> __unplugin__'
      str.overwrite(_index, _index + 'msg'.length, loadInjectedCode)
      return str.toString()
    },
    transformInclude(id) {
      return targetFileReg.test(id)
    },
    transform(code, id) {
      const s = new MagicString(code)
      const index = code.indexOf('__unplugin__')
      if (index === -1)
        return null
      const injectedCode = `transform-[Injected ${options.msg}]`

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
    watchChange() {
    },
    buildEnd() {
    },
    writeBundle() {
    },
  }
})
