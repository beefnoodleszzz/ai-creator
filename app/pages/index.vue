<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { CreatorPlatform, CreatorTone, CreatorGoal, CreatorStep, Industry, Scene, CreatorStatus, HistoryItem, CreatorConstraints } from '~/types/creator'
import { industries, tones, goals, promptTemplates, defaultCreatorConstraints } from '~/types/creator'
import { parseStructuredContent } from '~/composables/useStructuredContent'

const router = useRouter()
const step = ref<CreatorStep>('platform')
const platform = ref<CreatorPlatform>('xiaohongshu')
const selectedIndustry = ref<Industry>()
const selectedScene = ref<Scene>()
const tone = ref<CreatorTone>('viral')
const goal = ref<CreatorGoal>('growth')
const constraints = ref<CreatorConstraints>(defaultCreatorConstraints())
const status = ref<CreatorStatus>('idle')
const content = ref('')
const altContent = ref('')
const altGenerating = ref(false)
const isScrolled = ref(false)
const activeController = ref<AbortController | null>(null)
const aiQuality = ref<{ overall: number, hookStrength: number, platformFit: number, authenticity: number, engagement: number, suggestions: string[] } | null>(null)
const { history, load, add, syncFromCloud } = useCreatorHistory()
const { enabled: preferenceLearningEnabled, loadEnabled, setEnabled, resetLearnedPreferences, inferPreferredCombo } = useCreatorPreferences()
const { track } = useAnalytics()
const { ensureDeviceId } = useDeviceId()
const { user, authHeaders, loadToken, refreshMe } = useAuth()
const safetyLevel = ref<'safe' | 'warn' | 'block'>('safe')
const safetyTerm = ref('')
let sessionHeartbeat: number | undefined

const isLoading = computed(() => status.value === 'generating')
const recommendedCombo = computed(() => inferPreferredCombo(history.value))

function selectPlatform(p: CreatorPlatform) {
  platform.value = p
  step.value = 'industry'
}

function selectScene(industry: Industry, scene: Scene) {
  selectedIndustry.value = industry
  selectedScene.value = scene
  step.value = 'tone'
}

async function generate(customPrompt?: string, strategy: 'stable' | 'viral' = 'stable') {
  if (!selectedScene.value) return

  track('generate_start', { platform: platform.value, tone: tone.value, customPrompt: Boolean(customPrompt) })
  activeController.value?.abort()
  const controller = new AbortController()
  activeController.value = controller

  step.value = 'result'
  status.value = 'generating'
  content.value = ''
  altContent.value = ''
  altGenerating.value = false
  safetyTerm.value = ''

  try {
    const basePayload = {
      platform: platform.value,
      tone: tone.value,
      topic: selectedScene.value.topic,
      industry: selectedIndustry.value?.id,
      scene: selectedScene.value.name,
      goal: goal.value,
      keywords: constraints.value.keywords,
      bannedWords: constraints.value.bannedWords,
      brandVoice: constraints.value.brandVoice,
      audience: constraints.value.audience,
    }

    const strategyPrompt = strategy === 'viral'
      ? '请输出“爆点版”策略：强化冲突感、反差感与记忆点，但保持真实，不夸张承诺。'
      : '请输出“稳妥版”策略：强调稳定可发、表达克制、信息清晰。'
    const mergedPrompt = customPrompt?.trim()
      ? `${customPrompt.trim()}\n\n【版本策略】${strategyPrompt}`
      : strategyPrompt

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...basePayload, customPrompt: mergedPrompt }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorCode = response.headers.get('X-Error-Code')
        || (response.status === 429 ? 'E_RATE_LIMIT' : response.status >= 500 ? 'E_UPSTREAM' : 'E_BAD_REQUEST')
      const message = errorCode === 'E_RATE_LIMIT'
        ? '请求过于频繁，请稍后重试'
        : errorCode === 'E_SAFETY_BLOCK'
          ? '请求包含高风险内容，已被拦截'
          : '生成失败'
      const err = new Error(message) as Error & { code?: string }
      err.code = errorCode
      throw err
    }
    safetyLevel.value = (response.headers.get('X-Safety-Level') as 'safe' | 'warn' | 'block' | null) || 'safe'
    safetyTerm.value = response.headers.get('X-Safety-Term') || ''

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      content.value = await response.text()
      status.value = 'finished'
      return
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })
      content.value += text
    }

    if (!customPrompt?.trim() && strategy === 'stable') {
      altGenerating.value = true
      requestAlternateVersion({
        ...basePayload,
        customPrompt: '请基于同一主题再给一个“爆点版”，强调冲突感与记忆点，但保持真实、不夸张承诺。输出格式必须与系统要求完全一致。',
      }).finally(() => {
        altGenerating.value = false
      })
    }

    status.value = 'finished'
    let qualityScore = 0
    let qualityStructure = 0
    let qualityPublishability = 0
    let qualityRepetition = 0
    aiQuality.value = null
    try {
      const qualityResponse = await fetch('/api/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.value, platform: platform.value, useAI: true }),
      })
      if (qualityResponse.ok) {
        const result = await qualityResponse.json() as {
          score?: { overall?: number, structure?: number, publishability?: number, repetition?: number }
          aiScore?: { overall: number, hookStrength: number, platformFit: number, authenticity: number, engagement: number, suggestions: string[] }
        }
        qualityScore = result.score?.overall || 0
        qualityStructure = result.score?.structure || 0
        qualityPublishability = result.score?.publishability || 0
        qualityRepetition = result.score?.repetition || 0
        if (result.aiScore) {
          aiQuality.value = result.aiScore
          // 用 AI 评分覆盖 overall
          qualityScore = result.aiScore.overall || qualityScore
        }
      }
    } catch {
      qualityScore = 0
    }

    await add({
      platform: platform.value,
      tone: tone.value,
      goal: goal.value,
      safetyLevel: safetyLevel.value,
      qualityScore,
      qualityStructure,
      qualityPublishability,
      qualityRepetition,
      industryName: selectedIndustry.value?.name,
      sceneName: selectedScene.value?.name,
      topic: selectedScene.value.topic,
      content: content.value.slice(0, 8000),
      structured: parseStructuredContent(content.value),
    }, ensureDeviceId(), user.value ? authHeaders() : undefined)
    track('generate_success', { platform: platform.value, tone: tone.value, goal: goal.value, contentLength: content.value.length, qualityScore, safetyLevel: safetyLevel.value })
    if (safetyLevel.value === 'warn') {
      toast.warning('检测到潜在风险表述，已打标记录')
    }
    toast.success('文案生成完成')
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return
    }
    status.value = 'error'
    track('generate_error', {
      platform: platform.value,
      tone: tone.value,
      goal: goal.value,
      error: error?.message || 'unknown',
      errorCode: error?.code || 'E_UNKNOWN',
    })
    toast.error(error.message || '生成失败')
  } finally {
    if (activeController.value === controller) {
      activeController.value = null
    }
  }
}

function handleResultRegenerate(strategy?: 'stable' | 'viral') {
  generate(undefined, strategy || 'stable')
}

function handleResultOptimize(payload: { prompt: string, strategy: 'stable' | 'viral' }) {
  generate(payload.prompt, payload.strategy)
}

async function requestAlternateVersion(payload: Record<string, unknown>) {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) return

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    if (!reader) {
      altContent.value = await response.text()
      return
    }
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
    }
    altContent.value = buffer.trim()
  } catch {
    altContent.value = ''
  }
}

function goBack() {
  if (step.value === 'result') {
    step.value = 'tone'
    status.value = 'idle'
    content.value = ''
    altContent.value = ''
  } else if (step.value === 'tone') {
    step.value = 'industry'
  } else if (step.value === 'industry') {
    step.value = 'platform'
    selectedIndustry.value = undefined
    selectedScene.value = undefined
  }
}

function startOver() {
  step.value = 'platform'
  goal.value = 'growth'
  selectedIndustry.value = undefined
  selectedScene.value = undefined
  status.value = 'idle'
  content.value = ''
  altContent.value = ''
}

function applyRecommendedCombo() {
  if (!recommendedCombo.value) return
  platform.value = recommendedCombo.value.platform
  tone.value = recommendedCombo.value.tone
  goal.value = recommendedCombo.value.goal
  toast.success('已应用历史偏好推荐')
}

function handleTogglePreferenceLearning(next: boolean) {
  setEnabled(next)
  toast.success(next ? '已开启偏好学习' : '已关闭偏好学习')
}

function handleResetPreferenceLearning() {
  resetLearnedPreferences()
  toast.success('已重置偏好学习记录')
}

function handleUpdateConstraints(next: CreatorConstraints) {
  constraints.value = next
}

async function copyContent() {
  if (!content.value) return
  await navigator.clipboard.writeText(content.value)
  toast.success('已复制到剪贴板')
}

function handleCopySection(section: string, text: string) {
  const labels: Record<string, string> = {
    title: '标题',
    cover: '封面建议',
    tag: '标签',
    tags: '全部标签',
    comment: '首评',
    publish_time: '发布时间建议',
    short_version: '摘要版文案',
    publish_pack: '发布成品包',
    ab_test_plan: 'A/B发布计划',
  }
  toast.success(`已复制${labels[section] || section}`)
}

function handleScroll() {
  isScrolled.value = window.scrollY > 10
}

// 检查是否有复用的历史记录
function checkReuseHistory() {
  const raw = sessionStorage.getItem('reuse-history')
  if (raw) {
    sessionStorage.removeItem('reuse-history')
    try {
      const item = JSON.parse(raw) as HistoryItem
      const industry = industries.find(i => i.name === item.industryName)
      const scene = industry?.scenes.find(s => s.name === item.sceneName)
      if (industry && scene) {
        platform.value = item.platform
        tone.value = item.tone
        goal.value = item.goal || 'growth'
        selectedIndustry.value = industry
        selectedScene.value = scene
        step.value = 'tone'
      }
    } catch {}
  }
}

onMounted(() => {
  loadEnabled()
  load()
  loadToken()
  refreshMe().finally(() => {
    if (user.value) {
      syncFromCloud(undefined, authHeaders())
    } else {
      syncFromCloud(ensureDeviceId())
    }
  })
  sessionHeartbeat = window.setInterval(() => {
    refreshMe()
  }, 5 * 60_000)
  window.addEventListener('scroll', handleScroll, { passive: true })
  checkReuseHistory()
})

watch(step, value => {
  track('step_change', { step: value, goal: goal.value })
})

onBeforeUnmount(() => {
  activeController.value?.abort()
  if (sessionHeartbeat) window.clearInterval(sessionHeartbeat)
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <main class="min-h-[100dvh] bg-gradient-subtle text-zinc-950">
    <div class="mx-auto min-h-[100dvh] w-full max-w-[600px]">
      <!-- 顶部导航 -->
      <CreatorNavbar
        :elevated="isScrolled"
        :step="step"
        @back="goBack"
      />

      <!-- 步骤1：选择平台 -->
      <CreatorPlatformSelect
        v-if="step === 'platform'"
        @select="selectPlatform"
      />

      <!-- 步骤2：选择行业和场景 -->
      <CreatorIndustrySelect
        v-else-if="step === 'industry'"
        :platform="platform"
        :industries="industries"
        @select="selectScene"
        @back="goBack"
      />

      <!-- 步骤3：选择风格 -->
      <CreatorToneSelect
        v-else-if="step === 'tone'"
        :platform="platform"
        :industry="selectedIndustry"
        :scene="selectedScene"
        :tones="tones"
        :goals="goals"
        :recommended="recommendedCombo"
        :preference-learning-enabled="preferenceLearningEnabled"
        :templates="promptTemplates"
        :selected-tone="tone"
        :selected-goal="goal"
        :constraints="constraints"
        :is-loading="isLoading"
        @update:tone="tone = $event"
        @update:goal="goal = $event"
        @update:constraints="handleUpdateConstraints"
        @update:preference-learning-enabled="handleTogglePreferenceLearning"
        @reset:preferences="handleResetPreferenceLearning"
        @apply:recommended="applyRecommendedCombo"
        @generate="generate"
        @back="goBack"
      />

      <!-- 步骤4：展示结果 -->
      <CreatorResult
        v-else-if="step === 'result'"
        :platform="platform"
        :content="content"
        :alternate-content="altContent"
        :alternate-generating="altGenerating"
        :status="status"
        :safety-level="safetyLevel"
        :safety-term="safetyTerm"
        :industry="selectedIndustry"
        :scene="selectedScene"
        :tone="tone"
        :ai-quality="aiQuality"
        @copy="copyContent"
        @copy-section="handleCopySection"
        @regenerate="handleResultRegenerate"
        @optimize="handleResultOptimize"
        @start-over="startOver"
        @back="goBack"
      />
    </div>
  </main>
</template>
