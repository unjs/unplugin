<script setup lang="ts">
import { data as repositoryData } from '../data/repository.data'

const repos = [...repositoryData].sort((a, b) => {
  return b.stargazers.totalCount - a.stargazers.totalCount
})
</script>

<template>
  <div flex="~ wrap" gap-3 items-center>
    <a
      v-for="(item, index) in repos" :key="index"
      w-20rem h-42 px-4 py-3 cursor-pointer
      border="1 solid $vp-c-divider" rounded-md
      important-transition-all duration-400
      hover="shadow-md bg-$vp-c-bg-soft"
      :href="`/showcase/${item.name}`"
      flex="~ col"
      justify-between
    >
      <div flex items-center gap-2>
        <img :src="item.owner?.avatarUrl" rounded-full w-4 h-4 alt="">
        <span dark="text-gray-400" text-gray-500 text-16px>{{ item.owner.login }}/</span>
      </div>
      <div font-semibold dark="text-gray-200" text-gray-900 text-16px>
        {{ item.name }}
      </div>
      <div text-gray-500 dark="text-gray-400" flex-auto mt-2 text-14px>
        <span line-clamp-2>
          {{ item.description }}
        </span>
      </div>
      <div flex gap-5>
        <div flex items-center gap-1>
          <div
            w-3 h-3 rounded-full :style="{
              'background-color': item.primaryLanguage.color,
            }"
          />
          <div text="14px gray-500" dark="text-gray-400">{{ item.primaryLanguage.name }}</div>
        </div>
        <div flex items-center gap-1 text="14px gray-500" dark="text-gray-400">
          <i class="i-radix-icons-star" />
          <div>{{ (item.stargazers.totalCount).toLocaleString() }}</div>
        </div>
        <div flex items-center gap-1 text="14px gray-500" dark="text-gray-400">
          <i class="i-lucide-git-fork" />
          <div>{{ (item.forkCount).toLocaleString() }}</div>
        </div>
      </div>
    </a>
  </div>
</template>

<style scoped>
a {
  cursor: pointer;
  text-decoration: none!important;
}
</style>
