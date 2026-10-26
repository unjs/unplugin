import type { RepositoryMeta } from './meta.ts'
import type { Repository } from './repository.data.ts'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { env } from 'node:process'
import { consola } from 'consola'
import { $fetch } from 'ofetch'
import { repositoryMeta } from './meta.ts'

const { GITHUB_TOKEN } = env
if (!GITHUB_TOKEN) {
  consola.error('GITHUB_TOKEN is missing, please refer to https://github.com/unjs/unplugin/blob/main/docs/README.md#development')
  process.exit(1)
}

const gql = `#graphql
query repositoryQuery() {
  ${repositoryMeta.map(repository => buildRepoQuery(repository)).join('\n  ')}
}`

// eslint-disable-next-line antfu/no-top-level-await
const resp = await $fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
  },
  body: JSON.stringify({ query: gql }),
})

const data = resp.data as Record<string, Repository>
for (const [key, repo] of Object.entries(data)) {
  const meta = repositoryMeta.find(meta => getRepoId(meta) === key)
  if (!meta) {
    throw new Error(`Repository meta not found for ${key}`)
  }
  writeReadme(repo, meta)
}

writeFileSync(
  path.resolve(import.meta.dirname, 'repository.json'),
  JSON.stringify(Object.values(data).sort(
    (a, b) => b.stargazers.totalCount - a.stargazers.totalCount,
  ), null, 2),
)

consola.success('All files generate done!')

function getRepoId({ owner, name }: RepositoryMeta) {
  return `repo_${owner.replaceAll('-', '_')}_${name.replaceAll('-', '_')}`
}

function buildRepoQuery(
  meta: RepositoryMeta,
) {
  const id = getRepoId(meta)
  const readme = `${meta.branch || 'main'}:README.md`
  return `${id}: repository(owner: ${JSON.stringify(meta.owner)}, name: ${JSON.stringify(meta.name)}) {
    name
    stargazers { totalCount }
    owner { avatarUrl login }
    description
    primaryLanguage { name color }
    forkCount
    object(expression: "${readme}") { ... on Blob { text } }
  }`
}

function writeReadme(repo: Repository, meta: RepositoryMeta) {
  const markdownFrontmatter = `---
title: ${repo.name}
owner: ${repo.owner.login}
name: ${repo.name}
stars: ${repo.stargazers.totalCount}
forks: ${repo.forkCount}
outline: deep
---

<RepoInfo :owner="$frontmatter.owner" :name="$frontmatter.name" :stars="$frontmatter.stars" :forks="$frontmatter.forks" />

---

`

  writeFileSync(
    path.resolve(import.meta.dirname, `../../showcase/${meta.name}.md`),
    markdownFrontmatter + repo.object.text,
  )
  consola.success(`[${meta.name}.md]: generate success`)
}
