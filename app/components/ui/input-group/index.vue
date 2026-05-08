<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'

interface Props {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <div
    :class="cn(
      'flex h-[36px] items-center rounded-[10px] border border-zinc-200/80 bg-white px-[12px]',
      'text-[14px] text-zinc-900',
      'transition-all duration-200',
      'focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-950/5',
      props.class,
    )"
  >
    <slot />
  </div>
</template>
