<script setup lang="ts">
import type { CreatorPlatform, CreatorTone, CreatorGoal, Industry, Scene, CreatorConstraints } from '~/types/creator'
import { cn } from '~/lib/utils'
import { Check, ChevronDown, LoaderCircle, Zap } from 'lucide-vue-next'
import type { PromptTemplate } from '~/types/creator'
import UiButton from '~/components/ui/button/index.vue'
import UiBadge from '~/components/ui/badge/index.vue'
import UiInput from '~/components/ui/input/index.vue'

const props = defineProps<{
  platform: CreatorPlatform
  industry?: Industry
  scene?: Scene
  tones: Array<{ value: CreatorTone, label: string, desc: string, emoji: string }>
  templates: PromptTemplate[]
  constraints: CreatorConstraints
  selectedTone: CreatorTone
  goals: Array<{ value: CreatorGoal, label: string, desc: string, emoji: string }>
  selectedGoal: CreatorGoal
  recommended?: { platform: CreatorPlatform, tone: CreatorTone, goal: CreatorGoal, confidence: number, sampleSize: number } | null
  preferenceLearningEnabled?: boolean
  isLoading?: boolean
}>()

const emit = defineEmits<{
  'update:tone': [value: CreatorTone]
  'update:goal': [value: CreatorGoal]
  'update:constraints': [value: CreatorConstraints]
  'update:preferenceLearningEnabled': [value: boolean]
  'reset:preferences': []
  'apply:recommended': []
  generate: [customPrompt?: string]
  back: []
}>()

const showAdvanced = ref(false)

function patchConstraint(key: keyof CreatorConstraints, value: string) {
  emit('update:constraints', {
    ...props.constraints,
    [key]: value,
  })
}

// 触觉反馈
function triggerHaptic() {
  if (navigator.vibrate) {
    navigator.vibrate(10)
  }
}
</script>

<template>
  <section class="flex min-h-[100dvh] flex-col px-[20px] pb-[32px] pt-[72px]">
    <!-- 场景信息 -->
    <div class="mb-[28px] rounded-[18px] border border-zinc-200/60 bg-white p-[16px] shadow-soft animate-[fadeInUp_0.4s_ease-out]">
      <div class="flex items-center gap-[10px]">
        <span class="text-[24px]">{{ industry?.icon }}</span>
        <div>
          <p class="text-[15px] font-medium leading-[20px] text-zinc-950 tracking-tight">
            {{ scene?.name }}
          </p>
          <p class="mt-[2px] text-[13px] leading-[18px] text-zinc-400 font-light">
            {{ platform === 'xiaohongshu' ? '📕 小红书' : '🎵 抖音' }} · {{ industry?.name }}
          </p>
        </div>
      </div>
      <p class="mt-[12px] text-[14px] leading-[22px] text-zinc-600 font-light">
        {{ scene?.topic }}
      </p>
    </div>

    <div
      class="mb-[16px] rounded-[14px] border border-zinc-200/70 bg-zinc-50/80 p-[12px] animate-[fadeInUp_0.3s_ease-out]"
    >
      <div class="flex items-center justify-between gap-[8px]">
        <p class="text-[12px] font-medium text-zinc-600">偏好学习</p>
        <button
          type="button"
          class="rounded-full border px-[8px] py-[3px] text-[11px] transition-colors"
          :class="preferenceLearningEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-300 bg-white text-zinc-600'"
          @click="emit('update:preferenceLearningEnabled', !preferenceLearningEnabled)"
        >
          {{ preferenceLearningEnabled ? '已开启' : '已关闭' }}
        </button>
      </div>
      <p class="mt-[6px] text-[12px] text-zinc-500">
        基于你最近的创作历史自动推荐平台/语气/目标，可随时关闭。
      </p>
      <button
        type="button"
        class="mt-[6px] rounded-full border border-zinc-300 bg-white px-[10px] py-[5px] text-[12px] text-zinc-700 transition-colors hover:bg-zinc-100"
        @click="emit('reset:preferences')"
      >
        重置学习记录
      </button>
    </div>

    <div
      v-if="recommended && preferenceLearningEnabled"
      class="mb-[16px] rounded-[14px] border border-zinc-200/70 bg-zinc-50/80 p-[12px] animate-[fadeInUp_0.3s_ease-out]"
    >
      <p class="text-[12px] text-zinc-500">
        根据你的历史偏好推荐：{{ recommended.platform === 'xiaohongshu' ? '小红书' : '抖音' }} /
        {{ tones.find(t => t.value === recommended.tone)?.label || recommended.tone }} /
        {{ goals.find(g => g.value === recommended.goal)?.label || recommended.goal }}
      </p>
      <p class="mt-[4px] text-[11px] text-zinc-400">来源：最近 {{ recommended.sampleSize }} 条记录（已按质量与时效加权）</p>
      <button
        type="button"
        class="mt-[8px] rounded-full border border-zinc-300 bg-white px-[10px] py-[5px] text-[12px] text-zinc-700 transition-colors hover:bg-zinc-100"
        @click="emit('apply:recommended')"
      >
        一键应用推荐（匹配度 {{ recommended.confidence }}%）
      </button>
    </div>

    <!-- 风格选择 -->
    <div class="mb-[24px]">
      <p class="mb-[12px] text-[13px] font-medium text-zinc-400 uppercase tracking-wider">
        选择文案风格
      </p>
      <div class="flex flex-col gap-[10px]">
        <button
          v-for="(t, index) in tones"
          :key="t.value"
          type="button"
          :class="cn(
            'native-press flex items-center gap-[14px] rounded-[16px] border p-[16px] text-left transition-all duration-300',
            'animate-[fadeInUp_0.4s_ease-out_both]',
            selectedTone === t.value
              ? 'border-zinc-950 bg-zinc-950 text-white shadow-elevated'
              : 'border-zinc-200/60 bg-white text-zinc-900 hover:border-zinc-300 hover:shadow-soft',
          )"
          :style="{ animationDelay: `${index * 80}ms` }"
          @click="emit('update:tone', t.value); triggerHaptic()"
        >
          <span class="text-[28px]">{{ t.emoji }}</span>
          <div class="flex-1">
            <p class="text-[15px] font-medium leading-[22px] tracking-tight">
              {{ t.label }}
            </p>
            <p :class="cn(
              'mt-[4px] text-[13px] leading-[18px] font-light',
              selectedTone === t.value ? 'text-white/70' : 'text-zinc-400',
            )">
              {{ t.desc }}
            </p>
          </div>
          <div
            :class="cn(
              'size-[20px] rounded-full border-2 transition-all duration-200',
              selectedTone === t.value
                ? 'border-white bg-white scale-100'
                : 'border-zinc-200 bg-transparent scale-90',
            )"
          >
            <Check v-if="selectedTone === t.value" class="size-full p-[3px] text-zinc-950" :stroke-width="3" />
          </div>
        </button>
      </div>
    </div>

    <!-- 目标选择 -->
    <div class="mb-[24px]">
      <p class="mb-[12px] text-[13px] font-medium text-zinc-400 uppercase tracking-wider">
        创作目标
      </p>
      <div class="grid grid-cols-2 gap-[10px]">
        <button
          v-for="goal in goals"
          :key="goal.value"
          type="button"
          :class="cn(
            'native-press rounded-[14px] border p-[12px] text-left transition-all duration-300',
            selectedGoal === goal.value
              ? 'border-zinc-900 bg-zinc-900 text-white shadow-soft'
              : 'border-zinc-200/70 bg-white text-zinc-900 hover:border-zinc-300',
          )"
          @click="emit('update:goal', goal.value); triggerHaptic()"
        >
          <div class="flex items-center gap-[6px]">
            <span class="text-[16px]">{{ goal.emoji }}</span>
            <p class="text-[13px] font-medium">{{ goal.label }}</p>
          </div>
          <p :class="cn('mt-[4px] text-[11px] leading-[16px]', selectedGoal === goal.value ? 'text-white/70' : 'text-zinc-500')">
            {{ goal.desc }}
          </p>
        </button>
      </div>
    </div>

    <!-- 模板快捷入口 -->
    <div class="mb-[14px] flex flex-wrap gap-[8px] animate-[fadeInUp_0.4s_ease-out_0.3s_both]">
      <button
        v-for="template in templates"
        :key="template.id"
        type="button"
        class="native-press rounded-full border border-zinc-200/60 bg-white px-[12px] py-[6px] text-[12px] text-zinc-500 font-light transition-all duration-200 hover:border-zinc-300 hover:text-zinc-700"
        @click="emit('generate', template.prompt); triggerHaptic()"
      >
        {{ template.name }}
      </button>
    </div>

    <div class="mb-[18px] animate-[fadeInUp_0.4s_ease-out_0.35s_both]">
      <button
        type="button"
        class="native-press flex w-full items-center justify-between rounded-[14px] border border-zinc-200/70 bg-white px-[12px] py-[10px] text-left"
        @click="showAdvanced = !showAdvanced"
      >
        <div>
          <p class="text-[13px] font-medium text-zinc-800">高级创作约束</p>
          <p class="mt-[2px] text-[12px] text-zinc-500">关键词 / 禁用词 / 品牌口吻 / 目标受众</p>
        </div>
        <ChevronDown :class="cn('size-[16px] text-zinc-400 transition-transform', showAdvanced ? 'rotate-180' : '')" />
      </button>
      <div v-if="showAdvanced" class="mt-[10px] rounded-[14px] border border-zinc-200/70 bg-white p-[12px]">
        <div class="grid grid-cols-1 gap-[10px]">
          <div>
            <p class="mb-[6px] text-[12px] text-zinc-500">关键词（逗号分隔）</p>
            <UiInput
              :model-value="constraints.keywords"
              placeholder="如：真实测评,平价,新手友好"
              @update:model-value="patchConstraint('keywords', String($event || ''))"
            />
          </div>
          <div>
            <p class="mb-[6px] text-[12px] text-zinc-500">禁用词（逗号分隔）</p>
            <UiInput
              :model-value="constraints.bannedWords"
              placeholder="如：绝对有效,保证瘦,闭眼入"
              @update:model-value="patchConstraint('bannedWords', String($event || ''))"
            />
          </div>
          <div>
            <p class="mb-[6px] text-[12px] text-zinc-500">品牌口吻</p>
            <UiInput
              :model-value="constraints.brandVoice"
              placeholder="如：专业但亲切，像资深顾问分享"
              @update:model-value="patchConstraint('brandVoice', String($event || ''))"
            />
          </div>
          <div>
            <p class="mb-[6px] text-[12px] text-zinc-500">目标受众</p>
            <UiInput
              :model-value="constraints.audience"
              placeholder="如：23-30岁一线城市上班族女生"
              @update:model-value="patchConstraint('audience', String($event || ''))"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 生成按钮 -->
    <div class="mt-auto pb-safe-bottom animate-[fadeInUp_0.4s_ease-out_0.4s_both]">
      <UiButton
        size="lg"
        :disabled="isLoading"
        class="w-full h-[52px] text-[16px]"
        @click="emit('generate', undefined); triggerHaptic()"
      >
        <LoaderCircle v-if="isLoading" class="mr-[8px] size-[18px] animate-spin" />
        <Zap v-else class="mr-[8px] size-[18px]" />
        {{ isLoading ? '生成中...' : '一键生成爆款文案' }}
      </UiButton>
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
