<script setup lang="ts">
defineProps<{
  owner: string
  name: string
  stars: number
  forks: number
}>()
</script>

<template>
  <div flex gap-3 items-center justify-end>
    <div class="flex items-center text-gray-500 dark:text-gray-300 cursor-default">
      <i class="i-heroicons-star-solid" />
      <span ml-1>
        {{ stars.toLocaleString() }}
      </span>
    </div>

    <div class="flex items-center text-gray-500 dark:text-gray-300 cursor-default">
      <i class="i-lucide-git-fork" />
      <span ml-1>
        {{ forks.toLocaleString() }}
      </span>
    </div>

    <a target="_blank" :href="`https://github.com/${owner}/${name}`">
      <div class="flex text-gray-400" hover="text-gray-900" dark:hover="text-gray-200">
        <i class="i-radix-icons-github-logo" />
      </div>
    </a>

    <a target="_blank" :href="`https://www.npmjs.com/package/${name}`">
      <div class="flex text-gray-400" hover="text-#cc3534">
        <i class="i-simple-icons-npm " />
      </div>
    </a>
  </div>
</template>
