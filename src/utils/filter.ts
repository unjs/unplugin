import type { FilterExpression, TopLevelFilterExpression } from '@rolldown/pluginutils'
import type {
  Hook,
  TransformHookFilter as HookFilter,
  LoadHookFilter,
  ResolveIdHookFilter,
  StringFilter,
  StringOrRegExp,
} from '../types'
import { resolve } from 'node:path'
import picomatch from 'picomatch'
import { toArray } from './general'

const BACKSLASH_REGEX = /\\/g
function normalize(path: string): string {
  return path.replace(BACKSLASH_REGEX, '/')
}

const ABSOLUTE_PATH_REGEX = /^(?:\/|(?:[A-Z]:)?[/\\|])/i
function isAbsolute(path: string): boolean {
  return ABSOLUTE_PATH_REGEX.test(path)
}

export type PluginFilter = (input: string) => boolean
export type ResolveIdFilter = (id: string, importer?: string) => boolean
export type TransformHookFilter = (id: string, code: string) => boolean

interface NormalizedStringFilter {
  include?: StringOrRegExp[]
  exclude?: StringOrRegExp[]
}

// A project path like `Copy (1)` or `[id]` must stay literal when it becomes the base of a glob
const GLOB_METACHARS_REGEX = /[\\^$*+?.()|[\]{}]/g

function getMatcherString(glob: string, cwd: string) {
  if (glob.startsWith('**') || isAbsolute(glob))
    return normalize(glob)

  const base = normalize(resolve(cwd)).replace(GLOB_METACHARS_REGEX, '\\$&')
  return `${base}/${normalize(glob).replace(/^\.\//, '')}`
}

function patternToIdFilter(pattern: StringOrRegExp): PluginFilter {
  if (pattern instanceof RegExp) {
    return (id: string) => {
      const normalizedId = normalize(id)
      const result = pattern.test(normalizedId)
      pattern.lastIndex = 0
      return result
    }
  }
  const cwd = process.cwd()
  const glob = getMatcherString(pattern, cwd)
  const matcher = picomatch(glob, { dot: true })
  return (id: string) => {
    const normalizedId = normalize(id)
    return matcher(normalizedId)
  }
}

function patternToCodeFilter(pattern: StringOrRegExp): PluginFilter {
  if (pattern instanceof RegExp) {
    return (code: string) => {
      const result = pattern.test(code)
      pattern.lastIndex = 0
      return result
    }
  }
  return (code: string) => code.includes(pattern)
}

function createFilter(
  exclude: PluginFilter[] | undefined,
  include: PluginFilter[] | undefined,
): PluginFilter | undefined {
  if (!exclude && !include) {
    return
  }

  return (input) => {
    if (exclude?.some(filter => filter(input))) {
      return false
    }
    if (include?.some(filter => filter(input))) {
      return true
    }
    return !(include && include.length > 0)
  }
}

function normalizeFilter(filter: StringFilter): NormalizedStringFilter {
  if (typeof filter === 'string' || filter instanceof RegExp) {
    return {
      include: [filter],
    }
  }
  if (Array.isArray(filter)) {
    return {
      include: filter,
    }
  }
  return {
    exclude: filter.exclude
      ? toArray(filter.exclude)
      : undefined,
    include: filter.include
      ? toArray(filter.include)
      : undefined,
  }
}

function createIdFilter(filter: StringFilter | undefined): PluginFilter | undefined {
  if (!filter)
    return
  const { exclude, include } = normalizeFilter(filter)
  const excludeFilter = exclude?.map(patternToIdFilter)
  const includeFilter = include?.map(patternToIdFilter)
  return createFilter(excludeFilter, includeFilter)
}

function createCodeFilter(filter: StringFilter | undefined): PluginFilter | undefined {
  if (!filter)
    return
  const { exclude, include } = normalizeFilter(filter)
  const excludeFilter = exclude?.map(patternToCodeFilter)
  const includeFilter = include?.map(patternToCodeFilter)
  return createFilter(excludeFilter, includeFilter)
}

function createFilterForId(filter: StringFilter | undefined): PluginFilter | undefined {
  const filterFunction = createIdFilter(filter)
  return filterFunction
    ? id => !!filterFunction(id)
    : undefined
}

function createFilterForTransform(
  idFilterFunction: PluginFilter | undefined,
  codeFilter: StringFilter | undefined,
): TransformHookFilter | undefined {
  const codeFilterFunction = createCodeFilter(codeFilter)
  if (!idFilterFunction && !codeFilterFunction)
    return
  return (id, code) => {
    let fallback = true
    if (idFilterFunction) {
      fallback &&= idFilterFunction(id)
    }
    if (!fallback) {
      return false
    }

    if (codeFilterFunction) {
      fallback &&= codeFilterFunction(code)
    }
    return fallback
  }
}

interface FilterInput {
  id: string
  code?: string | undefined
  importer?: string | undefined
}
type CompiledFilter = (input: FilterInput) => boolean

const URL_POSTFIX_REGEX = /[?#].*$/
const QUERY_REGEX = /\?([^#]*)/

// Mirrors how Rolldown evaluates composable filters natively, which differs from
// `@rolldown/pluginutils`' `interpreter`: string ids are globs, regexes see `/` separators,
// and expressions whose input is unavailable in a hook don't match instead of throwing
function compileExpression(expr: FilterExpression, hook: 'resolveId' | 'load' | 'transform'): CompiledFilter {
  switch (expr.kind) {
    case 'and': {
      const args = expr.args.map(arg => compileExpression(arg, hook))
      return input => args.every(arg => arg(input))
    }
    case 'or': {
      const args = expr.args.map(arg => compileExpression(arg, hook))
      return input => args.some(arg => arg(input))
    }
    case 'not': {
      const arg = compileExpression(expr.expr, hook)
      return input => !arg(input)
    }
    case 'id':
    case 'importerId': {
      if (expr.kind === 'importerId' && hook !== 'resolveId')
        throw new Error(`[unplugin] The \`importerId\` filter can only be used with the \`resolveId\` hook, but it was used with the \`${hook}\` hook.`)
      if (expr.kind === 'id' && hook === 'resolveId' && typeof expr.pattern === 'string')
        throw new Error('[unplugin] A string `id` filter is not supported for the `resolveId` hook, because its `id` is the import specifier rather than a resolved path. Use a RegExp instead.')
      const match = patternToIdFilter(expr.pattern)
      const { cleanUrl } = expr.params
      const key = expr.kind === 'id'
        ? 'id'
        : 'importer'
      return (input) => {
        const value = input[key]
        return value !== undefined && match(cleanUrl
          ? value.replace(URL_POSTFIX_REGEX, '')
          : value)
      }
    }
    case 'code': {
      const match = patternToCodeFilter(expr.pattern)
      return input => input.code !== undefined && match(input.code)
    }
    case 'query': {
      const { key, pattern } = expr
      return (input) => {
        const params = new URLSearchParams(input.id.match(QUERY_REGEX)?.[1])
        if (typeof pattern === 'boolean')
          return params.has(key) === pattern
        const value = params.get(key)
        if (typeof pattern === 'string')
          return value === pattern
        const result = pattern.test(value ?? '')
        pattern.lastIndex = 0
        return result
      }
    }
    case 'moduleType':
      throw new Error('[unplugin] `moduleType` filter expressions are only supported by Rolldown.')
  }
}

function compileComposableFilter(exprs: TopLevelFilterExpression[], hook: 'resolveId' | 'load' | 'transform'): CompiledFilter {
  const compiled = exprs.map(expr => ({
    include: expr.kind === 'include',
    match: compileExpression(expr.expr, hook),
  }))
  const hasInclude = compiled.some(expr => expr.include)
  return (input) => {
    for (const { include, match } of compiled) {
      if (match(input))
        return include
    }
    return !hasInclude
  }
}

function hasCodeExpression(expr: TopLevelFilterExpression | FilterExpression): boolean {
  if ('args' in expr)
    return expr.args.some(hasCodeExpression)
  if ('expr' in expr)
    return hasCodeExpression(expr.expr)
  return expr.kind === 'code'
}

export function normalizeObjectHook<T extends (...args: any[]) => any>(
  name: 'resolveId',
  hook: Hook<T, ResolveIdHookFilter | TopLevelFilterExpression[]>,
): { handler: T, filter: ResolveIdFilter }
export function normalizeObjectHook<T extends (...args: any[]) => any>(
  name: 'load',
  hook: Hook<T, LoadHookFilter | TopLevelFilterExpression[]>,
): { handler: T, filter: PluginFilter }
export function normalizeObjectHook<T extends (...args: any[]) => any>(
  name: 'transform',
  hook: Hook<T, HookFilter | TopLevelFilterExpression[]>,
): { handler: T, filter: TransformHookFilter, idFilter: PluginFilter }
export function normalizeObjectHook<T extends (...args: any[]) => any>(
  name: 'resolveId' | 'load' | 'transform',
  hook: Hook<T, ResolveIdHookFilter | LoadHookFilter | HookFilter | TopLevelFilterExpression[]>,
): {
  handler: T
  filter: ResolveIdFilter | TransformHookFilter
  idFilter?: PluginFilter
} {
  const matchAll = () => true
  if (typeof hook === 'function')
    return { handler: hook, filter: matchAll, idFilter: matchAll }

  const { handler, filter: hookFilter } = hook

  if (Array.isArray(hookFilter)) {
    const filter = compileComposableFilter(hookFilter, name)
    if (name !== 'transform') {
      return {
        handler,
        filter: (id: string, importer?: string) => filter({ id, importer }),
      }
    }
    return {
      handler,
      filter: (id: string, code: string) => filter({ id, code }),
      // Without `code` expressions the filter only depends on the id
      idFilter: hookFilter.some(hasCodeExpression)
        ? matchAll
        : (id: string) => filter({ id }),
    }
  }

  if (name === 'resolveId' || name === 'load')
    return { handler, filter: createFilterForId(hookFilter?.id) || matchAll }

  const transformFilter = hookFilter as HookFilter | undefined
  const idFilter = createIdFilter(transformFilter?.id)
  return {
    handler,
    filter: createFilterForTransform(idFilter, transformFilter?.code) || matchAll,
    // The id part alone, so callers can skip reading a module's code when the id already rules it out
    idFilter: idFilter || matchAll,
  }
}
