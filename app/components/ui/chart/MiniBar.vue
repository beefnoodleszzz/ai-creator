<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  max: number
  color?: string
  height?: number
  showLabel?: boolean
  label?: string
}>()

const percentage = computed(() => {
  if (props.max <= 0) return 0
  return Math.max(4, Math.round((props.value / props.max) * 100))
})

const barColor = computed(() => props.color || '#3b82f6')
const h = computed(() => props.height || 24)
</script>

<template>
  <div class="flex items-center gap-[8px]">
    <div
      class="flex-1 overflow-hidden rounded-full bg-zinc-100"
      :style="{ height: `${h}px` }"
    >
      <div
        class="h-full rounded-full transition-all duration-500 ease-out"
        :style="{
          width: `${percentage}%`,
          backgroundColor: barColor,
        }"
      />
    </div>
    <span v-if="showLabel" class="min-w-[32px] text-right text-[12px] tabular-nums text-zinc-500">
      {{ label || value }}
    </span>
  </div>
</template>
