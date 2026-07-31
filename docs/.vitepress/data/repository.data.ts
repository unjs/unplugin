import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
    const fileContent = readFileSync(resolve(import.meta.dirname, '../repository.json'), 'utf-8')
    return JSON.parse(fileContent)
  },
}
