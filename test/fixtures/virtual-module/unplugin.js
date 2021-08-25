const { createUnplugin } = require('unplugin')

module.exports = createUnplugin(() => {
  return {
    name: 'virtual-module-fixture',
    resolveId (id) {
      return id.startsWith('virtual-') ? id : null
    },
    load (id) {
      if (id === 'virtual-1') {
        return 'export default "VIRTUAL:ONE"'
      }
      if (id === 'virtual-2') {
        return 'export default "VIRTUAL:TWO"'
      }
      return null
    }
  }
})
