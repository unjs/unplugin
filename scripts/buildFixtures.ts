import { execSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import process from 'node:process'
import c from 'ansis'
import fs from 'fs-extra'

async function run() {
  const dir = resolve(__dirname, '../test/fixtures')
  let fixtures = await fs.readdir(dir)

  if (process.argv[2])
    fixtures = fixtures.filter(i => i.includes(process.argv[2]))

  for (const name of fixtures) {
    const path = join(dir, name)
    if (fs.existsSync(join(path, 'dist')))
      await fs.remove(join(path, 'dist'))

    console.log(c.yellow.inverse.bold`\n  Vite  `, name, '\n')
    execSync('npx vite --version', { cwd: path, stdio: 'inherit' })
    execSync('npx vite build', { cwd: path, stdio: 'inherit' })

    console.log(c.red.inverse.bold`\n  Rollup  `, name, '\n')
    execSync('npx rollup --version', { cwd: path, stdio: 'inherit' })
    execSync('npx rollup --bundleConfigAsCjs -c', { cwd: path, stdio: 'inherit' })

    console.log(c.blue.inverse.bold`\n  Webpack  `, name, '\n')
    execSync('npx webpack --version', { cwd: path, stdio: 'inherit' })
    execSync('npx webpack', { cwd: path, stdio: 'inherit' })

    console.log(c.yellow.inverse.bold`\n  Esbuild  `, name, '\n')
    execSync('npx esbuild --version', { cwd: path, stdio: 'inherit' })
    execSync('node esbuild.config.js', { cwd: path, stdio: 'inherit' })

    console.log(c.cyan.inverse.bold`\n  Rspack  `, name, '\n')
    execSync('npx rspack --version', { cwd: path, stdio: 'inherit' })
    execSync('npx rspack', { cwd: path, stdio: 'inherit' })

    console.log(c.magenta.inverse.bold`\n  Farm  `, name, '\n')
    execSync('npx farm --version', { cwd: path, stdio: 'inherit' })
    execSync('npx farm build', { cwd: path, stdio: 'inherit' })
  }
}

run()
