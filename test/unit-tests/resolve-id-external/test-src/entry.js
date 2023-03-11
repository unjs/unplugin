import external from 'external-module'
import internal from './internal-module.js'

// just some random code to use the imports
process.stdout.write(JSON.stringify({
  internal,
  external,
}))
