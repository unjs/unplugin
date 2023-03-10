import { join, resolve } from 'path'
import { execSync } from 'child_process'
import fs from 'fs-extra'
import c from 'picocolors'

async function run() {
  const dir = resolve(__dirname, '../test/fixtures')
  let fixtures = await fs.readdir(dir)

  if (process.argv[2])
    fixtures = fixtures.filter(i => i.includes(process.argv[2]))

  for (const name of fixtures) {
    const path = join(dir, name)
    if (fs.existsSync(join(path, 'dist')))
      await fs.remove(join(path, 'dist'))

    console.log(c.yellow(c.inverse(c.bold('\n  Vite  '))), name, '\n')
    execSync('npx vite --version', { cwd: path, stdio: 'inherit' })
    execSync('npx vite build', { cwd: path, stdio: 'inherit' })

    console.log(c.red(c.inverse(c.bold('\n  Rollup  '))), name, '\n')
    execSync('npx rollup --version', { cwd: path, stdio: 'inherit' })
    execSync('npx rollup --bundleConfigAsCjs -c', { cwd: path, stdio: 'inherit' })

    console.log(c.blue(c.inverse(c.bold('\n  Webpack  '))), name, '\n')
    execSync('npx webpack --version', { cwd: path, stdio: 'inherit' })
    execSync('npx webpack', { cwd: path, stdio: 'inherit' })

    console.log(c.yellow(c.inverse(c.bold('\n  Esbuild  '))), name, '\n')
    execSync('npx esbuild --version', { cwd: path, stdio: 'inherit' })
    execSync('node esbuild.config.js', { cwd: path, stdio: 'inherit' })

    if (name !== 'virtual-module') {
      console.log(c.cyan(c.inverse(c.bold('\n  Rspack  '))), name, '\n')
      execSync('npx @rspack/cli --version', { cwd: path, stdio: 'inherit' })
      execSync('npx @rspack/cli', { cwd: path, stdio: 'inherit' })
    }
  }
}

run()
