<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ArrowLeft, Copy, RefreshCcw, Trash2, Star } from 'lucide-vue-next'
import type { HistoryItem } from '~/types/creator'
import { tones } from '~/types/creator'
import UiButton from '~/components/ui/button/index.vue'
import UiBadge from '~/components/ui/badge/index.vue'
import UiCard from '~/components/ui/card/index.vue'

const router = useRouter()
const route = useRoute()
const { history, remove, load, syncFromCloud } = useCreatorHistory()
const { user, authHeaders, loadToken, refreshMe } = useAuth()
const { ensureDeviceId } = useDeviceId()
const { renderMarkdown } = useMarkdown()

const item = ref<HistoryItem | null>(null)
const loading = ref(true)
const notFound = ref(false)
const favoriteIds = ref<string[]>([])
const FAVORITES_KEY = 'ai_creator_history_favorites_v1'

async function resolveItem() {
  loading.value = true
  notFound.value = false
  item.value = null
  loadFavorites()

  load()
  loadToken()
  await refreshMe()
  if (user.value) {
    await syncFromCloud(undefined, authHeaders())
  } else {
    await syncFromCloud(ensureDeviceId())
  }

  const id = route.params.id as string
  const found = history.value.find(h => h.id === id)
  if (found) {
    item.value = found
  } else {
    notFound.value = true
  }
  loading.value = false
}

watch(() => route.params.id, resolveItem, { immediate: true })

const renderedContent = computed(() => {
  if (!item.value?.content) return ''
  return renderMarkdown(item.value.content)
})

const toneLabel = computed(() => {
  if (!item.value) return ''
  return tones.find(t => t.value === item.value?.tone)?.label || item.value.tone
})

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

async function handleCopy() {
  if (!item.value?.content) return
  await navigator.clipboard.writeText(item.value.content)
  toast.success('已复制到剪贴板')
  triggerHaptic()
}

async function handleDelete() {
  if (!item.value) return
  await remove(item.value.id, ensureDeviceId(), user.value ? authHeaders() : undefined)
  toast.success('已删除')
  router.back()
}

function handleReuse() {
  if (!item.value) return
  sessionStorage.setItem('reuse-history', JSON.stringify(item.value))
  router.push('/')
}

function loadFavorites() {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as string[]
    if (Array.isArray(parsed)) favoriteIds.value = parsed
  } catch {
    favoriteIds.value = []
  }
}

function persistFavorites() {
  if (!import.meta.client) return
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds.value))
}

const isFavorite = computed(() => {
  if (!item.value) return false
  return favoriteIds.value.includes(item.value.id)
})

function toggleFavorite() {
  if (!item.value) return
  if (favoriteIds.value.includes(item.value.id)) {
    favoriteIds.value = favoriteIds.value.filter(v => v !== item.value?.id)
    toast.success('已取消收藏')
  } else {
    favoriteIds.value = [item.value.id, ...favoriteIds.value]
    toast.success('已加入收藏')
  }
  persistFavorites()
}

function triggerHaptic() {
  if (navigator.vibrate) {
    navigator.vibrate(10)
  }
}
</script>

<template>
  <main class="min-h-[100dvh] bg-gradient-subtle">
    <div class="mx-auto min-h-[100dvh] w-full max-w-[600px]">
      <!-- 顶部导航 -->
      <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div class="flex h-[56px] items-center px-[16px] pt-safe-top">
          <button
            type="button"
            class="flex size-[36px] items-center justify-center rounded-full hover:bg-zinc-100 transition-colors"
            @click="router.back()"
          >
            <ArrowLeft class="size-[20px] text-zinc-600" />
          </button>
          <h1 class="flex-1 text-center text-[16px] font-medium text-zinc-900">文案详情</h1>
          <div class="flex items-center gap-[2px]">
            <button
              type="button"
              class="flex size-[36px] items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-amber-500"
              @click="toggleFavorite"
            >
              <Star class="size-[17px]" :class="isFavorite ? 'fill-amber-400 text-amber-500' : ''" />
            </button>
            <button
              type="button"
              class="flex size-[36px] items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-red-500 transition-colors"
              @click="handleDelete"
            >
              <Trash2 class="size-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <div v-if="item" class="p-[16px]">
        <!-- 信息卡片 -->
        <UiCard class="p-[16px] mb-[12px] animate-[fadeInUp_0.3s_ease-out]">
          <div class="flex items-center gap-[8px] flex-wrap">
            <UiBadge>{{ item.platform === 'xiaohongshu' ? '📕 小红书' : '🎵 抖音' }}</UiBadge>
            <UiBadge variant="secondary">{{ item.industryName || '通用' }}</UiBadge>
            <UiBadge variant="secondary">{{ item.sceneName || item.topic }}</UiBadge>
          </div>
          <div class="mt-[12px] flex items-center gap-[16px] text-[12px] text-zinc-400">
            <span>{{ formatTime(item.createdAt) }}</span>
            <span v-if="toneLabel">{{ toneLabel }}</span>
            <span v-if="item.qualityScore">质量 {{ item.qualityScore }}</span>
          </div>
          <div v-if="item.safetyLevel && item.safetyLevel !== 'safe'" class="mt-[8px]">
            <UiBadge :variant="item.safetyLevel === 'warn' ? 'warning' : 'destructive'">
              {{ item.safetyLevel === 'warn' ? '⚠️ 含敏感内容' : '🚫 内容被拦截' }}
            </UiBadge>
          </div>
        </UiCard>

        <!-- 内容区域 -->
        <UiCard class="p-[20px] mb-[16px] animate-[fadeInUp_0.3s_ease-out_0.1s_both]">
          <div
            class="creator-markdown creator-markdown-light"
            v-html="renderedContent"
          />
        </UiCard>

        <!-- 操作按钮 -->
        <div class="flex flex-col gap-[10px] animate-[fadeInUp_0.3s_ease-out_0.2s_both]">
          <UiButton size="lg" class="w-full" @click="handleCopy(); triggerHaptic()">
            <Copy class="size-[16px] mr-[8px]" />
            复制文案
          </UiButton>
          <UiButton variant="outline" size="lg" class="w-full" @click="handleReuse(); triggerHaptic()">
            <RefreshCcw class="size-[16px] mr-[8px]" />
            复用此配置
          </UiButton>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-else-if="loading" class="flex items-center justify-center py-[120px]">
        <div class="text-center">
          <div class="size-[40px] mx-auto mb-[16px] rounded-full border-2 border-zinc-200 border-t-zinc-600 animate-spin" />
          <p class="text-[14px] text-zinc-400">加载中...</p>
        </div>
      </div>

      <div v-else-if="notFound" class="flex items-center justify-center py-[120px] px-[24px]">
        <div class="text-center">
          <p class="text-[16px] font-medium text-zinc-700">该历史记录不存在或已被删除</p>
          <p class="mt-[6px] text-[13px] text-zinc-400">你可以返回历史列表重新选择</p>
          <UiButton class="mt-[18px]" variant="outline" @click="router.replace('/history')">
            返回历史列表
          </UiButton>
        </div>
      </div>
    </div>
  </main>
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
