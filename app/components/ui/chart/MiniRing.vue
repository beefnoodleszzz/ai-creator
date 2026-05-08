<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string
  showLabel?: boolean
}>()

const max = computed(() => props.max || 100)
const size = computed(() => props.size || 40)
const sw = computed(() => props.strokeWidth || 3)
const percentage = computed(() => Math.min(100, (props.value / max.value) * 100))

const radius = computed(() => (size.value - sw.value) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => circumference.value * (1 - percentage.value / 100))

const strokeColor = computed(() => props.color || '#3b82f6')
const bgStroke = computed(() => props.bgColor || '#e5e7eb')

const center = computed(() => size.value / 2)
</script>

<template>
  <div class="relative inline-flex items-center justify-center">
    <svg :width="size" :height="size" class="-rotate-90">
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke="bgStroke"
        :stroke-width="sw"
        fill="none"
      />
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke="strokeColor"
        :stroke-width="sw"
        fill="none"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        class="transition-all duration-700 ease-out"
      />
    </svg>
    <span v-if="showLabel" class="absolute text-[11px] font-medium tabular-nums text-zinc-700">
      {{ Math.round(percentage) }}%
    </span>
  </div>
</template>
