<script setup lang="ts">
import { cn } from '~/lib/utils'
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectViewport,
  SelectIcon,
} from 'radix-vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  class?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <SelectRoot :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <SelectTrigger
      :class="cn(
        'flex h-[36px] w-full items-center justify-between rounded-[10px] border border-zinc-200/80 bg-white px-[12px] py-[8px]',
        'text-[14px] text-zinc-900 placeholder:text-zinc-400',
        'transition-all duration-200',
        'focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-950/5',
        'disabled:cursor-not-allowed disabled:opacity-50',
        '[&>span]:truncate',
        props.class,
      )"
    >
      <SelectValue :placeholder="placeholder" />
      <SelectIcon as-child>
        <ChevronDown class="size-[14px] text-zinc-400 shrink-0" />
      </SelectIcon>
    </SelectTrigger>
    <SelectContent
      class="relative z-50 min-w-[8rem] overflow-hidden rounded-[12px] border border-zinc-200/80 bg-white p-[4px] shadow-elevated data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      position="popper"
      :side-offset="4"
    >
      <SelectViewport>
        <slot />
      </SelectViewport>
    </SelectContent>
  </SelectRoot>
</template>
