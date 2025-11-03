import type { Repository } from './repository.data.ts'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { env } from 'node:process'
import { fileURLToPath } from 'node:url'
import { consola } from 'consola'
import { $fetch } from 'ofetch'
import { repositoryMeta } from './meta.ts'
import 'dotenv/config'

const GITHUB_TOKEN = env.GITHUB_TOKEN

const gql = `#graphql
query repositoryQuery($owner: String!, $name: String!, $readme: String!) {
  repository(owner: $owner, name: $name) {
    name
    stargazers {
      totalCount
    }
    owner {
      avatarUrl
      login
    }
    description
    primaryLanguage {
      name
      color
    }
    forkCount
    object(expression: $readme) {
      ... on Blob {
        text
      }
    }
  }
}`

if (!GITHUB_TOKEN) {
  consola.error('GITHUB_TOKEN is missing, please refer to https://github.com/unjs/unplugin/blob/main/docs/README.md#development')
  process.exit(1)
}

const fetchs = repositoryMeta.map((repository) => {
  return fetchRepo({
    name: repository.name,
    owner: repository.owner,
    readme: repository.defaultBranch ? `${repository.defaultBranch}:README.md` : 'main:README.md',
  })
})

Promise.allSettled(fetchs).then((res) => {
  const repoMeta = res?.map((item) => {
    if (item.status === 'fulfilled') {
      return {
        name: item.value?.name,
        stargazers: item.value?.stargazers,
        owner: item.value?.owner,
        description: item.value?.description,
        url: item.value?.url,
        isTemplate: item.value?.isTemplate,
        primaryLanguage: item.value?.primaryLanguage,
        forkCount: item.value?.forkCount,
      }
    }

    return null
  })?.filter(item => item && item.name)

  writeFileSync(
    join(dirname(fileURLToPath(import.meta.url)), './repository.json'),
    JSON.stringify(repoMeta, null, 2),
  )
  consola.success('[repository.json] generate success!')
  consola.success('All files generate done!')
}).catch((error) => {
  consola.error(error)
})

async function fetchRepo(meta: {
  owner: string
  name: string
  readme?: string
}) {
  const { owner, name, readme } = meta

  const _readme = readme || 'main:README.md'
  try {
    const results = await $fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
      },
      body: JSON.stringify({
        query: gql,
        variables: {
          owner,
          name,
          readme: _readme,
        },
      }),
    })

    const repositoryInfo = results.data.repository as Repository

    const markdownFrontmatter = `---
title: ${repositoryInfo.name}
owner: ${repositoryInfo.owner.login}
name: ${repositoryInfo.name}
stars: ${repositoryInfo.stargazers.totalCount}
forks: ${repositoryInfo.forkCount}
outline: deep
---

<RepoInfo :owner="$frontmatter.owner" :name="$frontmatter.name" :stars="$frontmatter.stars" :forks="$frontmatter.forks" />

---

`

    writeFileSync(
      join(dirname(fileURLToPath(import.meta.url)), `../../showcase/${name}.md`),
      markdownFrontmatter + repositoryInfo.object.text,
    )
    consola.success(`[${name}.md]: generate success`)
    return repositoryInfo
  }
  catch (error) {
    consola.error(`[${name}.md]: generate failed: ${error}`)
  }
}
