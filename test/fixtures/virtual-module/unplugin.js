const { createUnplugin } = require('unplugin')

module.exports = createUnplugin(() => {
  return {
    name: 'virtual-module-fixture',
    resolveId(id) {
      return id.startsWith('virtual/') ? `/__${id}` : null
    },
    loadInclude(id) {
      return id.startsWith('/__virtual/')
    },
    load(id) {
      if (id === '/__virtual/1')
        return 'export default "VIRTUAL:ONE"'

      else if (id === '/__virtual/2')
        return 'export default "VIRTUAL:TWO"'

      else
        throw new Error(`Unexpected id: ${id}`)
    },
  }
})
