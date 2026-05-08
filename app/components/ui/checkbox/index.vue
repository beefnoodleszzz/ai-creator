<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'

interface Props {
  modelValue?: boolean
  disabled?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const checkboxClass = computed(() => cn(
  'peer h-[18px] w-[18px] shrink-0 rounded-[5px] border border-zinc-300',
  'transition-all duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 data-[state=checked]:text-white',
  props.class,
))
</script>

<template>
  <button
    type="button"
    role="checkbox"
    :aria-checked="modelValue"
    :data-state="modelValue ? 'checked' : 'unchecked'"
    :disabled="disabled"
    :class="checkboxClass"
    @click="emit('update:modelValue', !modelValue)"
  >
    <svg
      v-if="modelValue"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-[12px] mx-auto"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </button>
</template>
