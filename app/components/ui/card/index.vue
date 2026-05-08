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
      'rounded-[16px] border border-zinc-200/60 bg-white shadow-sm',
      'transition-all duration-300',
      props.class,
    )"
  >
    <slot />
  </div>
</template>
