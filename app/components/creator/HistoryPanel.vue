<script setup lang="ts">
import type { HistoryItem } from '~/types/creator'
import { Clock3, Trash2, ArrowRight } from 'lucide-vue-next'
import UiCard from '~/components/ui/card/index.vue'

defineProps<{
  history: HistoryItem[]
}>()

const emit = defineEmits<{
  reuse: [item: HistoryItem]
  remove: [id: string]
}>()

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
</script>

<template>
  <section v-if="history.length" class="mt-[28px]">
    <div class="mb-[12px] flex items-center gap-[8px] text-zinc-400">
      <Clock3 class="size-[14px]" />
      <p class="text-[13px] font-medium uppercase tracking-wider">最近生成</p>
    </div>
    <div class="flex flex-col gap-[10px]">
      <div
        v-for="(item, index) in history.slice(0, 5)"
        :key="item.id"
        class="group animate-[fadeInUp_0.4s_ease-out_both]"
        :style="{ animationDelay: `${index * 60}ms` }"
      >
        <UiCard class="p-[14px] transition-all duration-300 hover:shadow-float">
          <button
            type="button"
            class="w-full text-left"
            @click="emit('reuse', item)"
          >
            <div class="flex items-start justify-between gap-[8px]">
              <div class="flex-1 min-w-0">
                <p class="line-clamp-1 text-[14px] font-medium leading-[20px] text-zinc-900 tracking-tight">
                  {{ item.sceneName || item.topic }}
                </p>
                <p class="mt-[6px] line-clamp-2 text-[13px] leading-[20px] text-zinc-400 font-light">
                  {{ item.content }}
                </p>
              </div>
              <ArrowRight class="size-[14px] text-zinc-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-zinc-500 mt-[4px] shrink-0" />
            </div>
            <p class="mt-[8px] text-[11px] text-zinc-300 font-light">
              {{ formatTime(item.createdAt) }} · {{ item.platform === 'xiaohongshu' ? '小红书' : '抖音' }}
            </p>
          </button>
          <button
            type="button"
            class="mt-[8px] inline-flex items-center gap-[4px] text-[12px] text-zinc-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            @click.stop="emit('remove', item.id)"
          >
            <Trash2 class="size-[12px]" />
            删除
          </button>
        </UiCard>
      </div>
    </div>
  </section>
</template>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
