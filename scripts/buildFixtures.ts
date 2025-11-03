import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readdir, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import process from 'node:process'
import c from 'ansis'

const isBun = !!process.versions.bun

const dir = resolve(import.meta.dirname, '../test/fixtures')
let fixtures = await readdir(dir)

if (process.argv[2])
  fixtures = fixtures.filter(i => i.includes(process.argv[2]))

for (const name of fixtures) {
  const path = join(dir, name)
  if (existsSync(join(path, 'dist')))
    await rm(join(path, 'dist')).catch(() => {})

  if (isBun) {
    console.log(c.magentaBright.inverse.bold`\n  Bun  `, name, '\n')
    execSync('bun --version', { cwd: path, stdio: 'inherit' })
    execSync('bun bun.config.js', { cwd: path, stdio: 'inherit' })
    continue // skip other builders in bun environment
  }

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
