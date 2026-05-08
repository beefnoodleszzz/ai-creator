<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  data: number[]
  color?: string
  height?: number
  strokeWidth?: number
  showArea?: boolean
}>()

const normalizedColor = computed(() => props.color || '#3b82f6')
const h = computed(() => props.height || 32)
const sw = computed(() => props.strokeWidth || 1.5)

const path = computed(() => {
  const d = props.data
  if (!d || d.length < 2) return ''
  
  const max = Math.max(...d)
  const min = Math.min(...d)
  const range = max - min || 1
  const width = 100
  const step = width / (d.length - 1)
  
  const points = d.map((val, i) => {
    const x = i * step
    const y = h.value - ((val - min) / range) * (h.value - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  
  return `M ${points.join(' L ')}`
})

const areaPath = computed(() => {
  if (!props.showArea || !path.value) return ''
  const width = 100
  return `${path.value} L ${width},${h.value} L 0,${h.value} Z`
})

const gradientId = computed(() => `sparkline-${Math.random().toString(36).slice(2, 8)}`)
</script>

<template>
  <svg
    v-if="data && data.length >= 2"
    :viewBox="`0 0 100 ${h}`"
    :height="h"
    class="w-full"
    preserveAspectRatio="none"
  >
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="normalizedColor" stop-opacity="0.2" />
        <stop offset="100%" :stop-color="normalizedColor" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path
      v-if="showArea && areaPath"
      :d="areaPath"
      :fill="`url(#${gradientId})`"
    />
    <path
      v-if="path"
      :d="path"
      fill="none"
      :stroke="normalizedColor"
      :stroke-width="sw"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
