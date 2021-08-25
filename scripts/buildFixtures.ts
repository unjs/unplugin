/* eslint-disable no-console */
import { resolve, join } from 'path'
import { execSync } from 'child_process'
import fs from 'fs-extra'
import c from 'chalk'

async function run () {
  const dir = resolve(__dirname, '../test/fixtures')
  let fixtures = await fs.readdir(dir)

  if (process.argv[2]) {
    fixtures = fixtures.filter(i => i.includes(process.argv[2]))
  }

  for (const name of fixtures) {
    const path = join(dir, name)
    if (fs.existsSync(join(path, 'dist'))) {
      await fs.remove(join(path, 'dist'))
    }
    console.log(c.yellow.inverse.bold`\n  Vite  `, name, '\n')
    execSync('npx vite build', { cwd: path, stdio: 'inherit' })
    console.log(c.red.inverse.bold`\n  Rollup  `, name, '\n')
    execSync('npx rollup -c', { cwd: path, stdio: 'inherit' })
    console.log(c.blue.inverse.bold`\n  Webpack  `, name, '\n')
    execSync('npx webpack', { cwd: path, stdio: 'inherit' })
  }
}

run()
