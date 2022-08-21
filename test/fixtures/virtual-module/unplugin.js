const { createUnplugin } = require('unplugin')

module.exports = createUnplugin(() => {
  return {
    name: 'virtual-module-fixture',
    resolveId (id) {
      return id.startsWith('virtual/') ? id : null
    },
    loadInclude (id) {
      return id.startsWith('virtual/')
    },
    load (id) {
      if (id === 'virtual/1') {
        return 'export default "VIRTUAL:ONE"'
      } else if (id === 'virtual/2') {
        return 'export default "VIRTUAL:TWO"'
      } else {
        throw new Error(`Unexpected id: ${id}`)
      }
    }
  }
})
