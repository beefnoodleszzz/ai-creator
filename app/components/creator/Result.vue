<script setup lang="ts">
import { ref, computed, watch, nextTick, toRef } from 'vue'
import {
  DrawerHandle,
  DrawerContent,
  DrawerDescription,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
  DrawerTitle,
  DrawerTrigger,
} from 'vaul-vue'
import type { CreatorPlatform, CreatorTone, CreatorStatus, Industry, Scene } from '~/types/creator'
import { cn } from '~/lib/utils'
import { Copy, PencilLine, RefreshCcw, Sparkles, Tag, MessageSquare, Image, FileText } from 'lucide-vue-next'
import UiButton from '~/components/ui/button/index.vue'
import UiBadge from '~/components/ui/badge/index.vue'
import UiCheckbox from '~/components/ui/checkbox/index.vue'

const props = defineProps<{
  platform: CreatorPlatform
  content: string
  status: CreatorStatus
  safetyLevel?: 'safe' | 'warn' | 'block'
  safetyTerm?: string
  industry?: Industry
  scene?: Scene
  tone: CreatorTone
  /** 生成耗时（毫秒） */
  duration?: number
  /** AI 质量评估 */
  aiQuality?: {
    overall: number
    hookStrength: number
    platformFit: number
    authenticity: number
    engagement: number
    suggestions: string[]
  } | null
}>()

const emit = defineEmits<{
  copy: []
  regenerate: []
  startOver: []
  back: []
  optimize: [prompt: string]
  copySection: [section: string, text: string]
}>()

const { renderMarkdown } = useMarkdown()
const { structured, hasStructure, displayBody } = useStructuredContent(toRef(props, 'content'))

const renderedContent = computed(() => renderMarkdown(displayBody.value))
const isLoading = computed(() => props.status === 'generating')
const isError = computed(() => props.status === 'error')
const publishWindows = computed(() => {
  return props.platform === 'xiaohongshu'
    ? ['工作日 12:00-13:30', '工作日 20:00-22:30', '周末 10:30-12:00']
    : ['工作日 18:30-21:30', '周末 11:00-13:00', '周末 19:00-22:00']
})
const detectedRiskTerms = computed(() => {
  const terms: string[] = []
  if (props.safetyTerm?.trim()) terms.push(props.safetyTerm.trim())
  const fallbackTerms = ['稳赚', '100%有效', '躺赚', '包过', '立刻暴富']
  fallbackTerms.forEach((term) => {
    if (displayBody.value.includes(term) && !terms.includes(term)) terms.push(term)
  })
  return terms
})
const platformRiskTips = computed(() => {
  if (props.platform === 'xiaohongshu') {
    return [
      '避免“绝对功效/保证结果”式表述，优先使用“个人体验”口吻。',
      '减少医疗化、功效夸大表达，建议补充使用场景与主观感受。',
    ]
  }
  return [
    '避免“秒见效/稳赚/包会”等强承诺词，降低诱导性和夸张程度。',
    '口播建议用“我自己的体验”替代“你一定会”，减少绝对化引导。',
  ]
})

const isDrawerOpen = ref(false)
const customPrompt = ref('')
const showCopyFlash = ref(false)
const pendingOptimize = ref<{ beforeLength: number, label: string } | null>(null)
const optimizeReport = ref('')
const rewriteScope = ref<'full' | 'intro' | 'middle' | 'ending'>('full')
const preserveParagraphs = ref(true)
const qualityDims = [
  { key: 'hookStrength', label: '钩子力', icon: '🎯' },
  { key: 'platformFit', label: '平台适配', icon: '📱' },
  { key: 'authenticity', label: '真实感', icon: '✍️' },
  { key: 'engagement', label: '互动潜力', icon: '💬' },
] as const

// 局部改写预设
const rewritePresets = [
  { id: 'hook', label: '改写开头', icon: '🎯', prompt: '只重写开头的钩子部分，让它更有吸引力，其他部分保持不变。' },
  { id: 'oral', label: '增强口语化', icon: '💬', prompt: '让文案更加口语化，加入更多语气词和日常表达，降低书面感。' },
  { id: 'soft-sell', label: '降低营销感', icon: '🍃', prompt: '降低文案的营销感和广告感，让它更像真实用户的分享而非推广。' },
  { id: 'emotion', label: '加强情绪', icon: '🔥', prompt: '加强文案的情绪感染力，让读者更有共鸣和代入感。' },
  { id: 'cta', label: '优化结尾CTA', icon: '📢', prompt: '只重写结尾部分，优化行动引导（CTA），让互动引导更自然不生硬。' },
  { id: 'shorter', label: '精简篇幅', icon: '✂️', prompt: '精简文案篇幅，去掉冗余内容，保留核心信息，让节奏更紧凑。' },
]
const shortVersion = computed(() => {
  const text = displayBody.value
    .replace(/\n{2,}/g, '\n')
    .split('\n')
    .map(v => v.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(' ')
  return text.slice(0, props.platform === 'douyin' ? 110 : 150).trim()
})

const publishPackText = computed(() => {
  const lines: string[] = []
  const title = structured.value.titles[0] || ''
  if (title) lines.push(`【标题】\n${title}`)
  if (structured.value.cover) lines.push(`【封面建议】\n${structured.value.cover}`)
  if (displayBody.value) lines.push(`【正文】\n${displayBody.value}`)
  if (structured.value.tags.length) {
    lines.push(`【标签】\n${structured.value.tags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ')}`)
  }
  if (structured.value.firstComments.length) {
    lines.push(`【首评建议】\n${structured.value.firstComments.join('\n')}`)
  }
  if (publishWindows.value.length) {
    lines.push(`【发布时间建议】\n${publishWindows.value.join(' / ')}`)
  }
  if (shortVersion.value) {
    lines.push(`【${props.platform === 'douyin' ? '短版口播稿' : '图文摘要版'}】\n${shortVersion.value}`)
  }
  return lines.join('\n\n').trim()
})

function applyPreset(preset: typeof rewritePresets[0]) {
  customPrompt.value = preset.prompt
}

function submitOptimization() {
  if (!customPrompt.value.trim()) return
  isDrawerOpen.value = false
  pendingOptimize.value = { beforeLength: props.content.length, label: '深度优化' }
  optimizeReport.value = ''
  emit('optimize', buildScopedPrompt(customPrompt.value))
}

// 质量维度分数获取器
function getDimScore(dim: string): number {
  if (!props.aiQuality) return 0
  return (props.aiQuality as Record<string, any>)[dim] ?? 0
}

const dimOptimizePrompts: Record<string, string> = {
  hookStrength: '请只优化开头钩子（前1-2句），提升抓眼度与停留率。保留原核心信息，不改后文结构。',
  platformFit: `请优化整篇文案的${props.platform === 'xiaohongshu' ? '小红书图文' : '抖音口播'}平台适配度，重点调整句式节奏与平台常见表达。`,
  authenticity: '请降低AI感，增强真实感和生活化细节：加入具体情境、口语表达和真实体验感，避免模板化措辞。',
  engagement: '请优化互动引导：结尾增加自然评论钩子与讨论问题，提升评论/收藏意愿，避免生硬求赞求关注。',
}

function runQuickOptimize(prompt: string) {
  if (!prompt.trim()) return
  pendingOptimize.value = { beforeLength: props.content.length, label: '一键优化' }
  optimizeReport.value = ''
  emit('optimize', buildScopedPrompt(prompt))
  triggerHaptic()
}

function optimizeDimension(dimKey: string) {
  const prompt = dimOptimizePrompts[dimKey]
  if (!prompt) return
  runQuickOptimize(prompt)
}

function normalizeSuggestionPrompt(suggestion: string) {
  return `请根据以下建议优化当前文案，并尽量保持原始主题与结构不变：${suggestion}`
}

function runSafetyRewrite() {
  const risky = detectedRiskTerms.value.length ? `命中词：${detectedRiskTerms.value.join('、')}。` : ''
  const platformRule = props.platform === 'xiaohongshu'
    ? '平台倾向：小红书图文。改写时强调真实体验、场景细节与主观感受，避免医疗化与功效保证。'
    : '平台倾向：抖音口播。改写时保留节奏感，但避免夸张承诺、收益承诺与强诱导互动。'
  const prompt = `请在不改变核心主题的前提下，对当前文案进行安全改写。${risky}${platformRule} 改写要求：避免绝对化承诺、避免夸大和诱导性表达、保留口语化和可读性，并输出可直接发布版本。`
  runQuickOptimize(prompt)
}

function buildScopedPrompt(basePrompt: string) {
  const scopeText = rewriteScope.value === 'intro'
    ? '只改写开头（前20%内容）'
    : rewriteScope.value === 'middle'
      ? '只改写中段（中间60%内容）'
      : rewriteScope.value === 'ending'
        ? '只改写结尾（后20%内容）'
        : '可改写全文'
  const preserveText = preserveParagraphs.value
    ? '未指定改写范围的段落请尽量保持原文不变。'
    : '可以根据需要重排段落结构。'
  return `${basePrompt}\n\n【改写范围控制】${scopeText}。${preserveText}`
}

// 自动滚动到底部
watch(() => props.content, async () => {
  await nextTick()
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: 'auto',
  })
})

// 复制某个区块
async function copySection(section: string, text: string) {
  if (!text) return
  await navigator.clipboard.writeText(text)
  emit('copySection', section, text)
  triggerHaptic()
}

// 复制全部结构化内容
async function copyAllStructured() {
  const text = publishPackText.value
  if (text) {
    await navigator.clipboard.writeText(text)
    emit('copySection', 'publish_pack', text)
    triggerHaptic()
  }
}

// 复制闪光效果
async function handleCopy() {
  emit('copy')
  showCopyFlash.value = true
  setTimeout(() => {
    showCopyFlash.value = false
  }, 600)
}

// 触觉反馈
function triggerHaptic() {
  if (navigator.vibrate) {
    navigator.vibrate(10)
  }
}

watch(() => props.status, (next) => {
  if (next !== 'finished' || !pendingOptimize.value) return
  const delta = props.content.length - pendingOptimize.value.beforeLength
  const deltaLabel = delta === 0 ? '字数基本不变' : delta > 0 ? `字数 +${delta}` : `字数 ${delta}`
  optimizeReport.value = `${pendingOptimize.value.label}已完成（${deltaLabel}）`
  pendingOptimize.value = null
})
</script>

<template>
  <section class="px-[20px] pb-[120px] pt-[72px]">
    <!-- 内容卡片 -->
    <div
      :class="cn(
        'relative rounded-[20px] p-[20px] transition-all duration-500',
        'shadow-[0_2px_20px_-4px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]',
        'hover:shadow-[0_4px_30px_-6px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)]',
        platform === 'douyin' ? 'bg-zinc-950 text-white shadow-[0_2px_30px_-4px_rgba(0,0,0,0.3)]' : 'bg-white',
      )"
    >
      <!-- AI 扫描光效 -->
      <div
        v-if="isLoading"
        class="absolute inset-x-0 top-0 h-[2px] overflow-hidden rounded-t-[20px]"
      >
        <div class="size-full animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />
      </div>

      <!-- 头部信息 -->
      <div class="mb-[16px] flex items-center justify-between">
        <div class="flex items-center gap-[8px]">
          <UiBadge :variant="platform === 'douyin' ? 'outline' : 'default'">
            {{ platform === 'xiaohongshu' ? '📕 小红书' : '🎵 抖音' }}
          </UiBadge>
          <UiBadge :variant="platform === 'douyin' ? 'outline' : 'secondary'">
            {{ scene?.name }}
          </UiBadge>
        </div>
        <span v-if="isLoading" class="flex items-center gap-[6px] text-[12px] text-zinc-400">
          <span class="size-[6px] rounded-full bg-green-500 animate-pulse" />
          生成中
        </span>
      </div>

      <!-- 内容区域 - 结构化成品包 -->
      <template v-if="content">
        <div
          v-if="safetyLevel === 'warn' || safetyLevel === 'block'"
          class="mb-[14px] rounded-[12px] border border-amber-200 bg-amber-50 p-[12px]"
        >
          <p class="text-[12px] font-medium text-amber-800">
            {{ safetyLevel === 'block' ? '高风险表达已拦截' : '检测到潜在风险表达' }}
          </p>
          <p v-if="detectedRiskTerms.length" class="mt-[4px] text-[12px] text-amber-700">
            命中词：{{ detectedRiskTerms.join('、') }}
          </p>
          <div class="mt-[6px] rounded-[10px] border border-amber-200/70 bg-white/70 p-[8px]">
            <p class="text-[11px] font-medium text-amber-800">
              {{ platform === 'xiaohongshu' ? '小红书风控提示' : '抖音风控提示' }}
            </p>
            <ul class="mt-[4px] flex flex-col gap-[2px]">
              <li
                v-for="tip in platformRiskTips"
                :key="tip"
                class="text-[11px] leading-[16px] text-amber-700"
              >
                • {{ tip }}
              </li>
            </ul>
          </div>
          <button
            type="button"
            class="mt-[8px] rounded-full border border-amber-300 bg-white px-[10px] py-[5px] text-[12px] text-amber-800 transition-colors hover:bg-amber-100"
            @click="runSafetyRewrite"
          >
            一键安全改写
          </button>
        </div>

        <!-- 标题备选 -->
        <div v-if="structured.titles.length" class="mb-[16px]">
          <div class="flex items-center gap-[6px] mb-[8px]">
            <FileText class="size-[13px] text-zinc-400" />
            <span class="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">标题备选</span>
          </div>
          <div
            v-for="(title, i) in structured.titles"
            :key="i"
            class="group/title relative rounded-[12px] p-[12px] mb-[8px] cursor-pointer transition-all duration-200"
            :class="[
              i === 0
                ? 'bg-zinc-950/[0.03] border border-zinc-950/10'
                : 'bg-zinc-50 border border-transparent hover:border-zinc-200',
              platform === 'douyin' && i === 0 ? 'bg-white/10 border-white/20' : '',
            ]"
            @click="copySection('title', title)"
          >
            <div class="flex items-start justify-between gap-[8px]">
              <p class="text-[14px] leading-[20px]" :class="i === 0 ? 'font-medium text-zinc-900' : 'text-zinc-600'">
                {{ title }}
              </p>
              <Copy class="size-[13px] text-zinc-300 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0 mt-[3px]" />
            </div>
            <span v-if="i === 0" class="absolute top-[8px] right-[8px] text-[10px] text-zinc-400">推荐</span>
          </div>
        </div>

        <!-- 封面建议 -->
        <div v-if="structured.cover" class="mb-[16px]">
          <div class="flex items-center gap-[6px] mb-[8px]">
            <Image class="size-[13px] text-zinc-400" />
            <span class="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">封面建议</span>
          </div>
          <div
            class="rounded-[12px] bg-zinc-50 border border-zinc-100 p-[12px] cursor-pointer transition-all hover:border-zinc-200"
            @click="copySection('cover', structured.cover)"
          >
            <p class="text-[13px] leading-[20px] text-zinc-600">{{ structured.cover }}</p>
          </div>
        </div>

        <!-- 抖音专属 META -->
        <div v-if="structured.meta && platform === 'douyin'" class="mb-[16px]">
          <div class="rounded-[12px] bg-zinc-900/5 border border-zinc-900/10 p-[12px]">
            <pre class="text-[13px] leading-[20px] text-zinc-600 whitespace-pre-wrap">{{ structured.meta }}</pre>
          </div>
        </div>

        <!-- 发布时段建议 -->
        <div class="mt-[16px]">
          <div class="flex items-center gap-[6px] mb-[8px]">
            <Sparkles class="size-[13px] text-zinc-400" />
            <span class="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">发布时间建议</span>
          </div>
          <div class="flex flex-wrap gap-[6px]">
            <button
              v-for="window in publishWindows"
              :key="window"
              type="button"
              class="rounded-full border border-zinc-200 bg-zinc-50 px-[10px] py-[4px] text-[12px] text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100"
              @click="copySection('publish_time', window)"
            >
              {{ window }}
            </button>
          </div>
        </div>

        <!-- 平台摘要版 -->
        <div v-if="shortVersion" class="mt-[16px]">
          <div class="flex items-center gap-[6px] mb-[8px]">
            <FileText class="size-[13px] text-zinc-400" />
            <span class="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
              {{ platform === 'douyin' ? '短版口播稿' : '图文摘要版' }}
            </span>
          </div>
          <div
            class="rounded-[12px] bg-zinc-50 border border-zinc-100 p-[12px] cursor-pointer transition-all hover:border-zinc-200"
            @click="copySection('short_version', shortVersion)"
          >
            <p class="text-[13px] leading-[20px] text-zinc-600">{{ shortVersion }}</p>
          </div>
        </div>

        <!-- 正文 -->
        <div v-if="displayBody">
          <div v-if="hasStructure" class="flex items-center gap-[6px] mb-[8px]">
            <FileText class="size-[13px] text-zinc-400" />
            <span class="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">正文</span>
          </div>
          <div
            :class="cn(
              'creator-markdown',
              'animate-[fadeInUp_0.3s_ease-out]',
              platform === 'douyin' ? 'creator-markdown-dark' : 'creator-markdown-light',
            )"
            v-html="renderedContent"
          />
        </div>

        <!-- 标签 -->
        <div v-if="structured.tags.length" class="mt-[16px]">
          <div class="flex items-center gap-[6px] mb-[8px]">
            <Tag class="size-[13px] text-zinc-400" />
            <span class="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">标签</span>
          </div>
          <div class="flex flex-wrap gap-[6px]">
            <span
              v-for="(tag, i) in structured.tags"
              :key="i"
              class="inline-flex items-center rounded-full px-[10px] py-[4px] text-[12px] cursor-pointer transition-all duration-200"
              :class="[
                platform === 'douyin'
                  ? 'bg-white/10 text-white/80 hover:bg-white/20'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
              ]"
              @click="copySection('tag', tag)"
            >
              {{ tag.startsWith('#') ? tag : `#${tag}` }}
            </span>
          </div>
          <button
            type="button"
            class="mt-[8px] text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors"
            @click="copySection('tags', structured.tags.map(t => t.startsWith('#') ? t : `#${t}`).join(' '))"
          >
            复制全部标签
          </button>
        </div>

        <!-- 首评建议 -->
        <div v-if="structured.firstComments.length" class="mt-[16px]">
          <div class="flex items-center gap-[6px] mb-[8px]">
            <MessageSquare class="size-[13px] text-zinc-400" />
            <span class="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">首评建议</span>
          </div>
          <div class="flex flex-col gap-[8px]">
            <div
              v-for="(comment, i) in structured.firstComments"
              :key="i"
              class="group/comment rounded-[12px] bg-zinc-50 border border-zinc-100 p-[10px] cursor-pointer transition-all hover:border-zinc-200"
              @click="copySection('comment', comment)"
            >
              <div class="flex items-start justify-between gap-[8px]">
                <p class="text-[13px] leading-[18px] text-zinc-600">{{ comment }}</p>
                <Copy class="size-[12px] text-zinc-300 opacity-0 group-hover/comment:opacity-100 transition-opacity shrink-0 mt-[2px]" />
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 加载骨架 -->
      <div v-else-if="isLoading" class="flex flex-col gap-[14px]">
        <div class="flex flex-col gap-[8px]">
          <div class="h-[14px] w-[60%] rounded-full bg-zinc-100 animate-[pulse_1.5s_ease-in-out_infinite]" />
          <div class="h-[14px] w-[90%] rounded-full bg-zinc-100/80 animate-[pulse_1.5s_ease-in-out_0.2s_infinite]" />
          <div class="h-[14px] w-[75%] rounded-full bg-zinc-100/60 animate-[pulse_1.5s_ease-in-out_0.4s_infinite]" />
        </div>
        <div class="mt-[8px] flex flex-col gap-[6px]">
          <div class="h-[14px] w-[85%] rounded-full bg-zinc-100/50 animate-[pulse_1.5s_ease-in-out_0.6s_infinite]" />
          <div class="h-[14px] w-[70%] rounded-full bg-zinc-100/40 animate-[pulse_1.5s_ease-in-out_0.8s_infinite]" />
        </div>
        <div class="mt-[4px] flex gap-[8px]">
          <div class="h-[24px] w-[60px] rounded-full bg-zinc-100/40 animate-[pulse_1.5s_ease-in-out_1s_infinite]" />
          <div class="h-[24px] w-[80px] rounded-full bg-zinc-100/30 animate-[pulse_1.5s_ease-in-out_1.2s_infinite]" />
        </div>
      </div>

      <!-- 光标 -->
      <span v-if="isLoading" class="ml-[2px] inline-block animate-blink text-[18px] leading-[28px] text-zinc-400">|</span>
    </div>

    <!-- 错误提示 -->
    <div v-if="isError" class="mt-[16px] rounded-[14px] bg-red-50/80 px-[16px] py-[14px] text-[14px] text-red-600 backdrop-blur-sm">
      生成失败，请重试
    </div>

    <!-- AI 质量评估 -->
    <div v-if="aiQuality && status === 'finished'" class="mt-[16px] animate-[fadeInUp_0.4s_ease-out_0.2s_both]">
      <div class="rounded-[16px] border border-zinc-100 bg-white p-[16px]">
        <!-- 综合评分 -->
        <div class="flex items-center justify-between mb-[12px]">
          <span class="text-[13px] font-medium text-zinc-500">AI 质量评估</span>
          <div class="flex items-center gap-[6px]">
            <span
              class="text-[20px] font-bold"
              :class="[
                aiQuality.overall >= 80 ? 'text-green-600' :
                aiQuality.overall >= 60 ? 'text-amber-600' : 'text-red-500'
              ]"
            >{{ aiQuality.overall }}</span>
            <span class="text-[12px] text-zinc-400">/100</span>
          </div>
        </div>

        <!-- 维度评分条 -->
        <div class="flex flex-col gap-[8px] mb-[12px]">
          <div
            v-for="dim in qualityDims"
            :key="dim.key"
            class="grid grid-cols-[16px_56px_1fr_28px_auto] items-center gap-[8px]"
          >
            <span class="text-[12px] w-[16px]">{{ dim.icon }}</span>
            <span class="text-[12px] text-zinc-500 w-[56px]">{{ dim.label }}</span>
            <div class="flex-1 h-[6px] rounded-full bg-zinc-100 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700 ease-out"
                :class="[
                  getDimScore(dim.key) >= 80 ? 'bg-green-500' :
                  getDimScore(dim.key) >= 60 ? 'bg-amber-500' : 'bg-red-400'
                ]"
                :style="{ width: `${getDimScore(dim.key)}%` }"
              />
            </div>
            <span class="text-[12px] text-zinc-400 w-[28px] text-right">{{ getDimScore(dim.key) }}</span>
            <button
              type="button"
              class="rounded-[8px] border border-zinc-200 px-[7px] py-[3px] text-[11px] text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
              @click="optimizeDimension(dim.key)"
            >
              优化
            </button>
          </div>
        </div>

        <!-- 改进建议 -->
        <div v-if="aiQuality.suggestions?.length" class="border-t border-zinc-100 pt-[12px]">
          <div class="mb-[8px] flex items-center justify-between gap-[8px]">
            <p class="text-[12px] font-medium text-zinc-500">💡 改进建议（点击可执行）</p>
            <button
              type="button"
              class="rounded-[8px] border border-zinc-200 px-[8px] py-[3px] text-[11px] text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
              @click="runQuickOptimize(`请综合以下建议优化当前文案：${aiQuality.suggestions.join('；')}`)"
            >
              一键全部优化
            </button>
          </div>
          <ul class="flex flex-col gap-[6px]">
            <button
              v-for="(suggestion, i) in aiQuality.suggestions"
              :key="i"
              type="button"
              class="rounded-[10px] border border-transparent px-[8px] py-[6px] text-left text-[13px] leading-[18px] text-zinc-600 transition-colors hover:border-zinc-200 hover:bg-zinc-50"
              @click="runQuickOptimize(normalizeSuggestionPrompt(suggestion))"
            >
              <span class="mr-[5px] text-zinc-300">•</span>{{ suggestion }}
            </button>
          </ul>
        </div>
      </div>
    </div>

    <p
      v-if="optimizeReport"
      class="mt-[12px] rounded-[12px] border border-emerald-200 bg-emerald-50 px-[12px] py-[9px] text-[12px] text-emerald-700"
    >
      {{ optimizeReport }}
    </p>

    <!-- 操作按钮 - 交错入场动画 -->
    <div v-if="status === 'finished'" class="mt-[20px] flex flex-col gap-[12px]">
      <!-- 结构化一键复制 -->
      <div v-if="hasStructure" class="animate-[fadeInUp_0.4s_ease-out]">
        <UiButton
          size="lg"
          class="relative w-full overflow-hidden"
          :class="{ 'animate-flash': showCopyFlash }"
          @click="copyAllStructured(); handleCopy(); triggerHaptic()"
        >
          <Copy class="mr-[8px] size-[16px]" />
          一键复制全部
        </UiButton>
      </div>
      <!-- 兼容旧模式 -->
      <div v-else class="animate-[fadeInUp_0.4s_ease-out]">
        <UiButton
          size="lg"
          class="relative w-full overflow-hidden"
          :class="{ 'animate-flash': showCopyFlash }"
          @click="handleCopy(); triggerHaptic()"
        >
          <Copy class="mr-[8px] size-[16px]" />
          复制文案
        </UiButton>
      </div>

      <div class="flex gap-[12px] animate-[fadeInUp_0.4s_ease-out_0.1s_both]">
        <DrawerRoot
          v-model:open="isDrawerOpen"
          :handle-only="true"
          :close-threshold="0.2"
          :scroll-lock-timeout="120"
        >
          <DrawerTrigger as-child>
            <UiButton variant="outline" size="lg" class="flex-1">
              <PencilLine class="mr-[8px] size-[16px]" />
              深度优化
            </UiButton>
          </DrawerTrigger>
          <DrawerPortal>
            <DrawerOverlay class="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
            <DrawerContent class="bg-white flex flex-col rounded-t-[24px] h-[75vh] mt-24 fixed bottom-0 left-0 right-0 max-w-[600px] mx-auto z-50 outline-none">
              <div class="px-[20px] pt-[12px] pb-[14px] bg-white rounded-t-[24px] border-b border-zinc-100">
                <DrawerHandle class="mx-auto mb-[14px] h-1.5 w-12 shrink-0 rounded-full bg-zinc-200" />
                <DrawerTitle class="font-semibold text-zinc-950 mb-[4px] text-[18px] tracking-tight">
                  深度优化
                </DrawerTitle>
                <DrawerDescription class="text-zinc-500 text-[14px] font-light">
                  选择快捷改写方向，或输入你的具体要求
                </DrawerDescription>
              </div>

              <div class="p-[20px] bg-white flex-1 flex flex-col overflow-y-auto">
                <!-- 快捷改写预设 -->
                <div class="grid grid-cols-2 gap-[8px] mb-[16px]">
                  <UiButton
                    v-for="preset in rewritePresets"
                    :key="preset.id"
                    variant="outline"
                    class="h-auto justify-start gap-[8px] rounded-[12px] px-[10px] py-[10px] text-left text-[13px] font-normal"
                    @click="applyPreset(preset)"
                  >
                    <span class="text-[16px]">{{ preset.icon }}</span>
                    <span>{{ preset.label }}</span>
                  </UiButton>
                </div>

                <div class="mb-[12px]">
                  <p class="mb-[6px] text-[12px] font-medium text-zinc-500">改写范围</p>
                  <div class="grid grid-cols-4 gap-[6px]">
                    <UiButton variant="outline" size="sm" class="h-[32px] rounded-[10px] px-[8px] text-[12px]" :class="rewriteScope === 'full' ? 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-900 hover:text-white' : ''" @click="rewriteScope = 'full'">全文</UiButton>
                    <UiButton variant="outline" size="sm" class="h-[32px] rounded-[10px] px-[8px] text-[12px]" :class="rewriteScope === 'intro' ? 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-900 hover:text-white' : ''" @click="rewriteScope = 'intro'">开头</UiButton>
                    <UiButton variant="outline" size="sm" class="h-[32px] rounded-[10px] px-[8px] text-[12px]" :class="rewriteScope === 'middle' ? 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-900 hover:text-white' : ''" @click="rewriteScope = 'middle'">中段</UiButton>
                    <UiButton variant="outline" size="sm" class="h-[32px] rounded-[10px] px-[8px] text-[12px]" :class="rewriteScope === 'ending' ? 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-900 hover:text-white' : ''" @click="rewriteScope = 'ending'">结尾</UiButton>
                  </div>
                  <label class="mt-[10px] inline-flex cursor-pointer items-center gap-[8px] rounded-[10px] px-[2px] py-[2px] text-[12px] text-zinc-600">
                    <UiCheckbox v-model="preserveParagraphs" class="cursor-pointer" />
                    保留未改写段落
                  </label>
                </div>

                <!-- 自定义输入 -->
                <textarea
                  v-model="customPrompt"
                  placeholder="输入你的优化要求..."
                  class="w-full flex-1 resize-none rounded-[16px] bg-zinc-50 p-[14px] text-[14px] outline-none placeholder:text-zinc-400 focus:bg-zinc-100 focus:ring-2 focus:ring-zinc-950/5 transition-all duration-200 min-h-[100px]"
                ></textarea>
                
                <UiButton
                  size="lg"
                  class="mt-[16px] w-full"
                  :disabled="!customPrompt.trim()"
                  @click="submitOptimization(); triggerHaptic()"
                >
                  <Sparkles class="mr-[8px] size-[16px]" />
                  重新生成
                </UiButton>
              </div>
            </DrawerContent>
          </DrawerPortal>
        </DrawerRoot>

        <UiButton
          variant="outline"
          size="lg"
          class="flex-1 animate-[fadeInUp_0.4s_ease-out_0.2s_both]"
          @click="emit('regenerate'); triggerHaptic()"
        >
          <RefreshCcw class="mr-[8px] size-[16px]" />
          再换一篇
        </UiButton>
      </div>

      <div class="mt-[4px] animate-[fadeInUp_0.4s_ease-out_0.3s_both]">
        <UiButton
          variant="outline"
          size="lg"
          class="w-full"
          @click="emit('startOver')"
        >
          重新开始
        </UiButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

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

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

@keyframes flash {
  0% {
    box-shadow: 0 0 0 0 rgba(24, 24, 27, 0.3);
  }
  50% {
    box-shadow: 0 0 20px 4px rgba(24, 24, 27, 0.15);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(24, 24, 27, 0);
  }
}

.animate-blink {
  animation: blink 1s ease-in-out infinite;
}

.animate-flash {
  animation: flash 0.6s ease-out;
}
</style>
