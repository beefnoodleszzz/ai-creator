<script setup lang="ts">
import { cn } from '~/lib/utils'
import { SelectGroup, SelectLabel as RadixSelectLabel } from 'radix-vue'

const props = defineProps<{
  class?: string
  label?: string
}>()
</script>

<template>
  <SelectGroup :class="cn('p-[4px]', props.class)">
    <RadixSelectLabel v-if="label" class="px-[8px] py-[6px] text-[12px] font-medium text-zinc-400">
      {{ label }}
    </RadixSelectLabel>
    <slot />
  </SelectGroup>
</template>
