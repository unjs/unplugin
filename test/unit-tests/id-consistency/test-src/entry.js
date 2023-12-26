import * as path from 'path'

// test external modules
import { named, proxiedDefault } from './proxy-export'

// just some random code to use the imports
process.stdout.write(JSON.stringify({
  named,
  proxiedDefault,
  path: path.join(__dirname, __filename),
}))
