import { named, proxiedDefault } from './proxy-export'

process.stdout.write(JSON.stringify({ named, proxiedDefault }))
