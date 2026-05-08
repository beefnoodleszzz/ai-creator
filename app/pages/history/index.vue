<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ArrowLeft, Clock3, Trash2, ArrowRight, Star } from 'lucide-vue-next'
import UiCard from '~/components/ui/card/index.vue'
import UiButton from '~/components/ui/button/index.vue'
import UiInput from '~/components/ui/input/index.vue'

const router = useRouter()
const { history, load, remove, syncFromCloud } = useCreatorHistory()
const { user, loadToken, refreshMe, authHeaders } = useAuth()
const { ensureDeviceId } = useDeviceId()
const platformFilter = ref<'all' | 'xiaohongshu' | 'douyin'>('all')
const goalFilter = ref<'all' | 'growth' | 'engagement' | 'conversion' | 'branding'>('all')
const qualityFilter = ref<'all' | '80' | '60' | '0'>('all')
const onlyFavorite = ref(false)
const keyword = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const sortBy = ref<'newest' | 'quality'>('newest')
const favoriteIds = ref<string[]>([])
const FAVORITES_KEY = 'ai_creator_history_favorites_v1'

onMounted(async () => {
  loadFavorites()
  load()
  loadToken()
  await refreshMe()
  if (user.value) {
    await syncFromCloud(undefined, authHeaders())
  } else {
    await syncFromCloud(ensureDeviceId())
  }
})

const filteredHistory = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  const matched = history.value.filter((item) => {
    if (platformFilter.value !== 'all' && item.platform !== platformFilter.value) return false
    if (goalFilter.value !== 'all' && item.goal !== goalFilter.value) return false
    if (onlyFavorite.value && !favoriteIds.value.includes(item.id)) return false
    if (qualityFilter.value !== 'all') {
      const score = item.qualityScore || 0
      if (qualityFilter.value === '80' && score < 80) return false
      if (qualityFilter.value === '60' && (score < 60 || score >= 80)) return false
      if (qualityFilter.value === '0' && score >= 60) return false
    }
    const day = item.createdAt.slice(0, 10)
    if (dateFrom.value && day < dateFrom.value) return false
    if (dateTo.value && day > dateTo.value) return false
    if (!q) return true
    const text = `${item.sceneName || ''} ${item.topic || ''} ${item.content || ''}`.toLowerCase()
    return text.includes(q)
  })

  if (sortBy.value === 'quality') {
    return matched.slice().sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
  }

  return matched.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
})

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

function isFavorite(id: string) {
  return favoriteIds.value.includes(id)
}

function toggleFavorite(id: string, e: Event) {
  e.stopPropagation()
  if (favoriteIds.value.includes(id)) {
    favoriteIds.value = favoriteIds.value.filter(v => v !== id)
    toast.success('已取消收藏')
  } else {
    favoriteIds.value = [id, ...favoriteIds.value]
    toast.success('已加入收藏')
  }
  persistFavorites()
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

async function handleRemove(id: string, e: Event) {
  e.stopPropagation()
  favoriteIds.value = favoriteIds.value.filter(v => v !== id)
  persistFavorites()
  await remove(id, ensureDeviceId(), user.value ? authHeaders() : undefined)
  toast.success('已删除')
}

function goDetail(id?: string) {
  if (!id) {
    toast.error('该记录缺少详情 ID')
    return
  }
  navigateTo(`/history/${id}`)
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
          <h1 class="flex-1 text-center text-[16px] font-medium text-zinc-900">历史记录</h1>
          <div class="size-[36px]" />
        </div>
      </header>

      <div class="p-[16px]">
        <!-- 空状态 -->
        <div
          class="mb-[12px] rounded-[14px] border border-zinc-200/80 bg-white/80 p-[10px]"
          v-if="history.length"
        >
          <div class="mb-[8px] grid grid-cols-3 gap-[8px]">
            <button
              type="button"
              class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors"
              :class="platformFilter === 'all' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'"
              @click="platformFilter = 'all'"
            >
              全部
            </button>
            <button
              type="button"
              class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors"
              :class="platformFilter === 'xiaohongshu' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'"
              @click="platformFilter = 'xiaohongshu'"
            >
              📕 小红书
            </button>
            <button
              type="button"
              class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors"
              :class="platformFilter === 'douyin' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'"
              @click="platformFilter = 'douyin'"
            >
              🎵 抖音
            </button>
          </div>
          <div class="mb-[8px] grid grid-cols-4 gap-[8px]">
            <button
              type="button"
              class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors"
              :class="goalFilter === 'all' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'"
              @click="goalFilter = 'all'"
            >
              全目标
            </button>
            <button
              type="button"
              class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors"
              :class="goalFilter === 'growth' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'"
              @click="goalFilter = 'growth'"
            >
              涨粉
            </button>
            <button
              type="button"
              class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors"
              :class="goalFilter === 'engagement' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'"
              @click="goalFilter = 'engagement'"
            >
              互动
            </button>
            <button
              type="button"
              class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors"
              :class="goalFilter === 'conversion' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'"
              @click="goalFilter = 'conversion'"
            >
              转化
            </button>
          </div>
          <div class="mb-[8px] grid grid-cols-4 gap-[8px]">
            <button
              type="button"
              class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors"
              :class="goalFilter === 'branding' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'"
              @click="goalFilter = 'branding'"
            >
              种草
            </button>
            <button
              type="button"
              class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors"
              :class="qualityFilter === 'all' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'"
              @click="qualityFilter = 'all'"
            >
              全质量
            </button>
            <button
              type="button"
              class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors"
              :class="qualityFilter === '80' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'"
              @click="qualityFilter = '80'"
            >
              80+
            </button>
            <button
              type="button"
              class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors"
              :class="qualityFilter === '60' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'"
              @click="qualityFilter = '60'"
            >
              60-79
            </button>
          </div>
          <div class="mb-[8px] grid grid-cols-2 gap-[8px]">
            <button
              type="button"
              class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors"
              :class="qualityFilter === '0' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'"
              @click="qualityFilter = '0'"
            >
              低于60
            </button>
            <button
              type="button"
              class="rounded-[10px] border border-zinc-200 bg-white px-[10px] py-[7px] text-[12px] text-zinc-600 transition-colors hover:border-zinc-300"
              @click="goalFilter = 'all'; qualityFilter = 'all'; platformFilter = 'all'; dateFrom = ''; dateTo = ''; keyword = ''; onlyFavorite = false"
            >
              清空筛选
            </button>
          </div>
          <div class="mb-[8px] grid grid-cols-2 gap-[8px]">
            <button
              type="button"
              class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors"
              :class="sortBy === 'newest' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'"
              @click="sortBy = 'newest'"
            >
              按时间倒序
            </button>
            <button
              type="button"
              class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors"
              :class="sortBy === 'quality' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'"
              @click="sortBy = 'quality'"
            >
              按质量高到低
            </button>
          </div>
          <div class="mb-[8px]">
            <UiInput v-model="keyword" placeholder="搜索场景、主题或文案内容" />
          </div>
          <div class="mb-[8px] grid grid-cols-2 gap-[8px]">
            <UiInput v-model="dateFrom" type="date" />
            <UiInput v-model="dateTo" type="date" />
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-[6px] rounded-full border px-[10px] py-[5px] text-[12px] transition-colors"
            :class="onlyFavorite ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-zinc-200 bg-white text-zinc-600'"
            @click="onlyFavorite = !onlyFavorite"
          >
            <Star class="size-[12px]" :class="onlyFavorite ? 'fill-amber-400 text-amber-500' : 'text-zinc-400'" />
            仅看收藏
          </button>
          <p class="mt-[8px] text-[12px] text-zinc-500">
            当前命中 {{ filteredHistory.length }} 条（总计 {{ history.length }} 条）
          </p>
        </div>

        <div v-if="!history.length" class="flex flex-col items-center justify-center py-[80px]">
          <div class="flex size-[80px] items-center justify-center rounded-full bg-zinc-100 mb-[16px]">
            <Clock3 class="size-[32px] text-zinc-400" />
          </div>
          <p class="text-[16px] font-medium text-zinc-600">暂无历史记录</p>
          <p class="text-[14px] text-zinc-400 mt-[8px]">生成的文案会显示在这里</p>
          <UiButton variant="outline" class="mt-[24px]" @click="router.push('/')">
            去创作
          </UiButton>
        </div>

        <!-- 历史列表 -->
        <div v-else-if="!filteredHistory.length" class="flex flex-col items-center justify-center py-[60px]">
          <p class="text-[15px] font-medium text-zinc-600">没有匹配结果</p>
          <p class="mt-[6px] text-[13px] text-zinc-400">试试切换筛选或更换关键词</p>
        </div>

        <div v-else class="flex flex-col gap-[10px]">
          <div
            v-for="(item, index) in filteredHistory"
            :key="item.id"
            class="animate-[fadeInUp_0.3s_ease-out_both]"
            :style="{ animationDelay: `${index * 40}ms` }"
          >
            <UiCard class="p-[14px] transition-all duration-200 hover:shadow-float group">
              <div class="flex items-start gap-[12px]">
                <button
                  type="button"
                  class="flex-1 min-w-0 text-left"
                  @click="goDetail(item.id)"
                >
                  <div class="flex items-center gap-[8px] mb-[6px]">
                    <span class="text-[14px]">{{ item.platform === 'xiaohongshu' ? '📕' : '🎵' }}</span>
                    <p class="line-clamp-1 truncate text-[15px] font-medium text-zinc-900">
                      {{ item.sceneName || item.topic }}
                    </p>
                  </div>
                  <p class="line-clamp-2 text-[13px] leading-[20px] text-zinc-500 font-light">
                    {{ item.content?.slice(0, 100) }}...
                  </p>
                  <div class="flex items-center gap-[12px] mt-[8px]">
                    <span class="text-[11px] text-zinc-400">{{ formatTime(item.createdAt) }}</span>
                    <span v-if="item.qualityScore" class="text-[11px] text-zinc-400">
                      质量 {{ item.qualityScore }}
                    </span>
                  </div>
                </button>
                <div class="flex items-center gap-[4px]">
                  <button
                    type="button"
                    class="flex size-[32px] items-center justify-center rounded-full text-zinc-400 transition-all hover:bg-amber-50 hover:text-amber-500"
                    @click="toggleFavorite(item.id, $event)"
                  >
                    <Star class="size-[14px]" :class="isFavorite(item.id) ? 'fill-amber-400 text-amber-500' : ''" />
                  </button>
                  <button
                    type="button"
                    class="flex size-[32px] items-center justify-center rounded-full text-zinc-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-500"
                    @click="handleRemove(item.id, $event)"
                  >
                    <Trash2 class="size-[14px]" />
                  </button>
                  <ArrowRight class="size-[14px] text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                </div>
              </div>
            </UiCard>
          </div>
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
