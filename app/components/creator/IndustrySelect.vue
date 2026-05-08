<script setup lang="ts">
import type { CreatorPlatform, Industry, Scene } from '~/types/creator'
import { cn } from '~/lib/utils'
import { ChevronRight } from 'lucide-vue-next'
import UiBadge from '~/components/ui/badge/index.vue'
import UiCard from '~/components/ui/card/index.vue'

defineProps<{
  platform: CreatorPlatform
  industries: Industry[]
}>()

const emit = defineEmits<{
  select: [industry: Industry, scene: Scene]
  back: []
}>()

const expandedIndustry = ref<string | null>(null)

function toggleIndustry(id: string) {
  expandedIndustry.value = expandedIndustry.value === id ? null : id
}
</script>

<template>
  <section class="px-[20px] pb-[32px] pt-[72px]">
    <!-- 平台标识 -->
    <div class="mb-[24px] flex items-center gap-[8px] animate-[fadeInUp_0.4s_ease-out]">
      <UiBadge :variant="platform === 'xiaohongshu' ? 'destructive' : 'default'">
        {{ platform === 'xiaohongshu' ? '📕 小红书' : '🎵 抖音' }}
      </UiBadge>
      <span class="text-[13px] text-zinc-300">·</span>
      <span class="text-[13px] text-zinc-400 font-light">选择一个行业</span>
    </div>

    <!-- 行业列表 -->
    <div class="flex flex-col gap-[10px]">
      <div
        v-for="(industry, index) in industries"
        :key="industry.id"
        class="animate-[fadeInUp_0.4s_ease-out_both]"
        :style="{ animationDelay: `${index * 60}ms` }"
      >
        <UiCard class="overflow-hidden">
          <!-- 行业头部 -->
          <button
            type="button"
            class="native-press flex w-full items-center gap-[12px] p-[16px] text-left"
            @click="toggleIndustry(industry.id)"
          >
            <span class="text-[32px]">{{ industry.icon }}</span>
            <div class="flex-1">
              <p class="text-[15px] font-medium leading-[22px] text-zinc-950 tracking-tight">
                {{ industry.name }}
              </p>
              <p class="mt-[2px] text-[13px] leading-[18px] text-zinc-400 font-light">
                {{ industry.scenes.length }}个场景可选
              </p>
            </div>
            <ChevronRight
              :class="cn(
                'size-[18px] text-zinc-300 transition-transform duration-200',
                expandedIndustry === industry.id ? 'rotate-90' : '',
              )"
            />
          </button>

          <!-- 场景列表 -->
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="max-h-0 opacity-0"
            enter-to-class="max-h-[400px] opacity-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="max-h-[400px] opacity-100"
            leave-to-class="max-h-0 opacity-0"
          >
            <div v-if="expandedIndustry === industry.id" class="overflow-hidden border-t border-zinc-100">
              <div class="p-[12px]">
                <button
                  v-for="scene in industry.scenes"
                  :key="scene.id"
                  type="button"
                  class="native-press flex w-full items-center justify-between rounded-[12px] p-[12px] text-left transition-all duration-200 hover:bg-zinc-50/80"
                  @click="emit('select', industry, scene)"
                >
                  <div>
                    <p class="text-[15px] font-medium leading-[20px] text-zinc-900 tracking-tight">
                      {{ scene.name }}
                    </p>
                    <p class="mt-[4px] text-[13px] leading-[18px] text-zinc-400 font-light">
                      {{ scene.description }}
                    </p>
                  </div>
                  <ChevronRight class="size-[16px] text-zinc-300" />
                </button>
              </div>
            </div>
          </Transition>
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
