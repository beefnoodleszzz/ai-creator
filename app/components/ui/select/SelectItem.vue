<script setup lang="ts">
import { cn } from '~/lib/utils'
import { SelectItem, SelectItemIndicator, SelectItemText } from 'radix-vue'
import { Check } from 'lucide-vue-next'

const props = defineProps<{
  value: string
  class?: string
  disabled?: boolean
}>()
</script>

<template>
  <SelectItem
    :value="value"
    :disabled="disabled"
    :class="cn(
      'relative flex w-full cursor-default select-none items-center rounded-[8px] py-[8px] pl-[28px] pr-[8px] text-[14px] text-zinc-900 outline-none',
      'transition-colors duration-150',
      'focus:bg-zinc-100 focus:text-zinc-900',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      props.class,
    )"
  >
    <span class="absolute left-[8px] flex size-[16px] items-center justify-center">
      <SelectItemIndicator>
        <Check class="size-[14px] text-zinc-600" />
      </SelectItemIndicator>
    </span>
    <SelectItemText>
      <slot />
    </SelectItemText>
  </SelectItem>
</template>
