<script setup lang="ts">
import type { CreatorPlatform } from '~/types/creator'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import { cn } from '~/lib/utils'
import UiCard from '~/components/ui/card/index.vue'

const emit = defineEmits<{
  select: [platform: CreatorPlatform]
}>()

const platforms = [
  {
    id: 'xiaohongshu' as const,
    name: '小红书',
    desc: '图文笔记',
    color: 'bg-red-500',
    icon: '📕',
    sample: [
      '标题偏“痛点+结果”并带轻 emoji，利于搜索与点击。',
      '正文强调真实体验与细节，段落短，留白多。',
    ],
  },
  {
    id: 'douyin' as const,
    name: '抖音',
    desc: '短视频脚本',
    color: 'bg-black',
    icon: '🎵',
    sample: [
      '开头 3 秒必须强钩子，先抢停留再讲信息。',
      '脚本按时间轴推进，口播更口语化、更有节奏。',
    ],
  },
]

const expandedPreview = ref<CreatorPlatform | null>(null)

function togglePreview(id: CreatorPlatform) {
  expandedPreview.value = expandedPreview.value === id ? null : id
}
</script>

<template>
  <section class="flex min-h-[100dvh] flex-col items-center justify-center px-[24px] pt-safe-top">
    <div class="w-full max-w-[400px]">
      <!-- Logo -->
      <div class="mb-[48px] text-center">
        <div class="mx-auto mb-[16px] flex size-[72px] items-center justify-center rounded-[24px] bg-zinc-950 text-white shadow-elevated">
          <span class="text-[28px] font-bold tracking-tight">AI</span>
        </div>
        <h1 class="text-[28px] font-medium leading-[36px] text-zinc-950 tracking-tight">
          AI 爆款文案
        </h1>
        <p class="mt-[8px] text-[15px] leading-[24px] text-zinc-400 font-light">
          选一个平台，AI帮你写
        </p>
      </div>

      <!-- 平台选择 - 交错入场动画 -->
      <div class="flex flex-col gap-[14px]">
        <UiCard
          v-for="(p, index) in platforms"
          :key="p.id"
          class="overflow-hidden border-zinc-200/60 animate-[fadeInUp_0.5s_ease-out_both]"
          :style="{ animationDelay: `${index * 100}ms` }"
        >
          <button
            type="button"
            class="native-press group flex w-full items-center gap-[16px] bg-white p-[20px] text-left transition-all duration-300 hover:border-zinc-300 hover:shadow-float"
            @click="emit('select', p.id)"
          >
            <span class="text-[40px]">{{ p.icon }}</span>
            <div class="flex-1">
              <p class="text-[17px] font-medium leading-[24px] text-zinc-950 tracking-tight">
                {{ p.name }}
              </p>
              <p class="mt-[4px] text-[13px] leading-[20px] text-zinc-400 font-light">
                {{ p.desc }}
              </p>
            </div>
            <ChevronRight class="size-[18px] text-zinc-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-zinc-500" />
          </button>
          <div class="border-t border-zinc-100 bg-zinc-50/70 px-[14px] py-[10px]">
            <button
              type="button"
              class="flex w-full items-center justify-between text-left text-[12px] text-zinc-600"
              @click="togglePreview(p.id)"
            >
              <span>查看写法示例</span>
              <ChevronDown :class="cn('size-[14px] transition-transform', expandedPreview === p.id ? 'rotate-180' : '')" />
            </button>
            <div v-if="expandedPreview === p.id" class="mt-[8px] space-y-[6px] text-[12px] leading-[18px] text-zinc-500">
              <p v-for="line in p.sample" :key="line">• {{ line }}</p>
            </div>
          </div>
        </UiCard>
      </div>
    </div>
  </section>
</template>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
