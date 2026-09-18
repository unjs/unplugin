const fs = require('node:fs')
const { resolve } = require('node:path')
const MagicString = require('magic-string')
const { createUnplugin } = require('unplugin')

const sourceId = 'hash-msg#raw'
const resolvedId = resolve(__dirname, 'src/msg#hash.js')

function assertUnescapedId(hook, id) {
  if (id.includes('\0') || id.includes('\u200B#'))
    throw new Error(`${hook} received escaped id: ${JSON.stringify(id)}`)
}

module.exports = createUnplugin(() => {
  return {
    name: 'hash-path-hooks',
    resolveId(id) {
      assertUnescapedId('resolveId', id)

      if (id === sourceId)
        return resolvedId

      if (id.includes('hash-msg'))
        throw new Error(`resolveId received unexpected id: ${JSON.stringify(id)}`)
    },
    loadInclude(id) {
      assertUnescapedId('loadInclude', id)

      // Return true so the test always exercises `load`.
      return true
    },
    load(id) {
      assertUnescapedId('load', id)

      const code = fs.readFileSync(id, 'utf-8')
      if (id !== resolvedId)
        return code

      const s = new MagicString(code)
      const index = code.indexOf('msg#hash')
      if (index === -1)
        throw new Error(`load expected token "msg#hash" in ${JSON.stringify(id)}`)

      s.overwrite(index, index + 'msg#hash'.length, 'msg -> through the load hook -> __unplugin__#hash')
      return s.toString()
    },
    transformInclude(id) {
      assertUnescapedId('transformInclude', id)

      // Return true so the test always exercises `transform`.
      return true
    },
    transform(code, id) {
      assertUnescapedId('transform', id)
      if (id !== resolvedId)
        return code

      const s = new MagicString(code)
      const index = code.indexOf('__unplugin__')
      if (index === -1)
        throw new Error(`transform expected token "__unplugin__" in ${JSON.stringify(id)}`)

      s.overwrite(index, index + '__unplugin__'.length, 'transform')
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
