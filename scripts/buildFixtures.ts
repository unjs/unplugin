/* eslint-disable no-console */
import { resolve, join } from 'path'
import { execSync } from 'child_process'
import fs from 'fs-extra'

async function run () {
  const dir = resolve(__dirname, '../test/fixtures')
  const fixtures = (await fs.readdir(dir)).map(i => resolve(dir, i))

  for (const f of fixtures) {
    if (fs.existsSync(join(f, 'dist'))) {
      await fs.remove(join(f, 'dist'))
    }
    console.log('\n====[Vite]====\n')
    execSync('npx vite build', { cwd: f, stdio: 'inherit' })
    console.log('\n====[Rollup]====\n')
    execSync('npx rollup -c', { cwd: f, stdio: 'inherit' })
    console.log('\n====[Webpack]====\n')
    execSync('npx webpack', { cwd: f, stdio: 'inherit' })
  }
}

run()
