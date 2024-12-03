import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface Repository {
  name: string
  stargazers: {
    totalCount: number
  }
  owner: {
    avatarUrl: string
    login: string
  }
  description: string
  url: string
  isTemplate: boolean
  primaryLanguage: {
    name: string
    color: string
  }
  forkCount: number
  object: {
    text: string
  }
}

declare const data: Repository[]
export { data }

export default {
  watch: ['./repository.json'],
  load() {
    const fileContent = readFileSync(resolve(fileURLToPath(import.meta.url), '../repository.json'), 'utf-8')
    return JSON.parse(fileContent)
  },
}
