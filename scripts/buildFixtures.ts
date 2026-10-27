import { exec } from 'node:child_process'
import { readdir, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import c from 'ansis'

const execAsync = promisify(exec)
const isBun = !!process.versions.bun

interface Bundler {
  name: string
  command: string
  color: (text: string) => string
}

const bundlers: Bundler[] = isBun
  ? [
      { name: 'bun', command: 'bun bun.config.js', color: c.magentaBright.inverse.bold },
    ]
  : [
      { name: 'vite', command: 'npx vite build', color: c.yellow.inverse.bold },
      { name: 'rollup', command: 'npx rollup --bundleConfigAsCjs -c', color: c.red.inverse.bold },
      { name: 'webpack', command: 'npx webpack', color: c.blue.inverse.bold },
      { name: 'esbuild', command: 'node esbuild.config.js', color: c.yellow.inverse.bold },
      { name: 'rspack', command: 'npx rspack', color: c.cyan.inverse.bold },
      { name: 'rsbuild', command: 'npx rsbuild build', color: c.cyanBright.inverse.bold },
      { name: 'farm', command: 'npx farm build', color: c.magenta.inverse.bold },
    ]

const dir = resolve(import.meta.dirname, '../test/fixtures')
const [fixtureFilter, bundlerFilter] = process.argv.slice(2)

let fixtures = await readdir(dir)
if (fixtureFilter)
  fixtures = fixtures.filter(i => i.includes(fixtureFilter))

const selectedBundlers = bundlerFilter
  ? bundlers.filter(b => b.name.includes(bundlerFilter))
  : bundlers

let failed = false

for (const name of fixtures) {
  const path = join(dir, name)

  // Each bundler writes to its own dist/<bundler>, so one fixture's builds can run concurrently
  await Promise.all(selectedBundlers.map(async ({ name: bundler, command, color }) => {
    const title = `${color(`  ${bundler}  `)} ${name}`
    try {
      await rm(join(path, 'dist', bundler), { recursive: true, force: true })
      const { stdout, stderr } = await execAsync(command, { cwd: path })
      console.log(`\n${title}\n${stdout}${stderr}`)
    }
    catch (error) {
      failed = true
      const { stdout = '', stderr = '', message } = error as { stdout?: string, stderr?: string, message: string }
      console.error(`\n${title} ${c.red('FAILED')}\n${stdout}${stderr}${message}`)
    }
  }))
}

if (failed)
  process.exit(1)
