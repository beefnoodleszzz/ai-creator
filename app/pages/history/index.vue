<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ArrowLeft, Clock3, Trash2, ArrowRight, Star } from 'lucide-vue-next'
import UiCard from '~/components/ui/card/index.vue'
import UiButton from '~/components/ui/button/index.vue'
import UiInput from '~/components/ui/input/index.vue'
import UiDatePicker from '~/components/ui/date-picker/index.vue'

const router = useRouter()
const { history, load, remove, syncFromCloud } = useCreatorHistory()
const { user, loadToken, refreshMe, authHeaders } = useAuth()
const { ensureDeviceId } = useDeviceId()
const platformFilter = ref<'all' | 'xiaohongshu' | 'douyin'>('all')
const goalFilter = ref<'all' | 'growth' | 'engagement' | 'conversion' | 'branding'>('all')
const qualityFilter = ref<'all' | '80' | '60' | '0'>('all')
const groupFilter = ref<'all' | 'inspire' | 'high_quality' | 'reuse'>('all')
const onlyFavorite = ref(false)
const keyword = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const sortBy = ref<'newest' | 'quality'>('newest')
const batchMode = ref(false)
const selectedIds = ref<string[]>([])
const favoriteIds = ref<string[]>([])
const favoriteGroups = ref<Record<string, 'inspire' | 'high_quality' | 'reuse'>>({})
const FAVORITES_KEY = 'ai_creator_history_favorites_v1'
const FAVORITE_GROUPS_KEY = 'ai_creator_history_favorite_groups_v1'

onMounted(async () => {
  loadFavorites()
  loadFavoriteGroups()
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
    if (groupFilter.value !== 'all' && favoriteGroups.value[item.id] !== groupFilter.value) return false
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

function loadFavoriteGroups() {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(FAVORITE_GROUPS_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, 'inspire' | 'high_quality' | 'reuse'>
    if (parsed && typeof parsed === 'object') favoriteGroups.value = parsed
  } catch {
    favoriteGroups.value = {}
  }
}

function persistFavoriteGroups() {
  if (!import.meta.client) return
  localStorage.setItem(FAVORITE_GROUPS_KEY, JSON.stringify(favoriteGroups.value))
}

function isFavorite(id: string) {
  return favoriteIds.value.includes(id)
}

function toggleFavorite(id: string, e: Event) {
  e.stopPropagation()
  if (favoriteIds.value.includes(id)) {
    favoriteIds.value = favoriteIds.value.filter(v => v !== id)
    delete favoriteGroups.value[id]
    toast.success('已取消收藏')
  } else {
    favoriteIds.value = [id, ...favoriteIds.value]
    toast.success('已加入收藏')
  }
  persistFavorites()
  persistFavoriteGroups()
}

function setFavoriteGroup(id: string, group: 'inspire' | 'high_quality' | 'reuse', e: Event) {
  e.stopPropagation()
  if (!favoriteIds.value.includes(id)) {
    favoriteIds.value = [id, ...favoriteIds.value]
    persistFavorites()
  }
  favoriteGroups.value[id] = group
  persistFavoriteGroups()
  toast.success(`已归入${group === 'inspire' ? '选题灵感' : group === 'high_quality' ? '高质量' : '待复用'}`)
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
  delete favoriteGroups.value[id]
  persistFavorites()
  persistFavoriteGroups()
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

function toggleBatchMode() {
  batchMode.value = !batchMode.value
  selectedIds.value = []
}

function toggleSelect(id: string, e: Event) {
  e.stopPropagation()
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter(v => v !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

function selectAllFiltered() {
  selectedIds.value = filteredHistory.value.map(i => i.id)
}

function clearSelection() {
  selectedIds.value = []
}

function batchFavorite(next: boolean) {
  if (!selectedIds.value.length) return
  if (next) {
    const merged = new Set([...favoriteIds.value, ...selectedIds.value])
    favoriteIds.value = Array.from(merged)
    toast.success(`已收藏 ${selectedIds.value.length} 条`)
  } else {
    favoriteIds.value = favoriteIds.value.filter(id => !selectedIds.value.includes(id))
    selectedIds.value.forEach((id) => { delete favoriteGroups.value[id] })
    toast.success(`已取消收藏 ${selectedIds.value.length} 条`)
  }
  persistFavorites()
  persistFavoriteGroups()
}

async function batchDelete() {
  if (!selectedIds.value.length) return
  const ids = [...selectedIds.value]
  await Promise.all(ids.map(id => remove(id, ensureDeviceId(), user.value ? authHeaders() : undefined)))
  favoriteIds.value = favoriteIds.value.filter(id => !ids.includes(id))
  ids.forEach((id) => { delete favoriteGroups.value[id] })
  persistFavorites()
  persistFavoriteGroups()
  selectedIds.value = []
  toast.success(`已批量删除 ${ids.length} 条`)
}
</script>

<template>
  <main class="min-h-[100dvh] bg-gradient-subtle">
    <div class="mx-auto min-h-[100dvh] w-full max-w-[600px]">
      <header class="sticky top-0 z-30 bg-white/80 border-b border-zinc-100 backdrop-blur-xl">
        <div class="flex h-[56px] items-center px-[16px] pt-safe-top">
          <button
            type="button"
            class="flex size-[36px] items-center justify-center rounded-full transition-colors hover:bg-zinc-100"
            @click="router.back()"
          >
            <ArrowLeft class="size-[20px] text-zinc-600" />
          </button>
          <h1 class="flex-1 text-center text-[16px] font-medium text-zinc-900">历史记录</h1>
          <div class="size-[36px]" />
        </div>
      </header>

      <div class="p-[16px]">
        <div
          v-if="history.length"
          class="mb-[12px] rounded-[14px] border border-zinc-200/80 bg-white/80 p-[10px]"
        >
          <div class="mb-[8px] flex items-center justify-between gap-[8px]">
            <p class="text-[12px] font-medium text-zinc-500">历史资产管理</p>
            <button
              type="button"
              class="rounded-full border px-[10px] py-[4px] text-[12px] transition-colors"
              :class="batchMode ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white text-zinc-700'"
              @click="toggleBatchMode"
            >
              {{ batchMode ? '退出批量' : '批量操作' }}
            </button>
          </div>

          <div v-if="batchMode" class="mb-[8px] grid grid-cols-2 gap-[8px]">
            <button type="button" class="rounded-[10px] border border-zinc-200 bg-white px-[10px] py-[7px] text-[12px] text-zinc-700" @click="selectAllFiltered">全选当前结果</button>
            <button type="button" class="rounded-[10px] border border-zinc-200 bg-white px-[10px] py-[7px] text-[12px] text-zinc-700" @click="clearSelection">清空选择</button>
            <button type="button" class="rounded-[10px] border border-amber-200 bg-amber-50 px-[10px] py-[7px] text-[12px] text-amber-700" @click="batchFavorite(true)">批量收藏</button>
            <button type="button" class="rounded-[10px] border border-zinc-200 bg-zinc-50 px-[10px] py-[7px] text-[12px] text-zinc-700" @click="batchFavorite(false)">取消收藏</button>
            <button type="button" class="col-span-2 rounded-[10px] border border-red-200 bg-red-50 px-[10px] py-[7px] text-[12px] text-red-700" @click="batchDelete">批量删除</button>
          </div>

          <div class="mb-[8px] grid grid-cols-3 gap-[8px]">
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="platformFilter === 'all' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="platformFilter = 'all'">全部</button>
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="platformFilter === 'xiaohongshu' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="platformFilter = 'xiaohongshu'">📕 小红书</button>
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="platformFilter === 'douyin' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="platformFilter = 'douyin'">🎵 抖音</button>
          </div>

          <div class="mb-[8px] grid grid-cols-4 gap-[8px]">
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="goalFilter === 'all' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="goalFilter = 'all'">全目标</button>
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="goalFilter === 'growth' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="goalFilter = 'growth'">涨粉</button>
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="goalFilter === 'engagement' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="goalFilter = 'engagement'">互动</button>
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="goalFilter === 'conversion' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="goalFilter = 'conversion'">转化</button>
          </div>

          <div class="mb-[8px] grid grid-cols-4 gap-[8px]">
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="goalFilter === 'branding' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="goalFilter = 'branding'">种草</button>
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="qualityFilter === 'all' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="qualityFilter = 'all'">全质量</button>
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="qualityFilter === '80' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="qualityFilter = '80'">80+</button>
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="qualityFilter === '60' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="qualityFilter = '60'">60-79</button>
          </div>

          <div class="mb-[8px] grid grid-cols-4 gap-[8px]">
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="groupFilter === 'all' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="groupFilter = 'all'">全部分组</button>
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="groupFilter === 'inspire' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="groupFilter = 'inspire'">选题灵感</button>
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="groupFilter === 'high_quality' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="groupFilter = 'high_quality'">高质量</button>
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="groupFilter === 'reuse' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="groupFilter = 'reuse'">待复用</button>
          </div>

          <div class="mb-[8px] grid grid-cols-2 gap-[8px]">
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="qualityFilter === '0' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="qualityFilter = '0'">低于60</button>
            <button type="button" class="rounded-[10px] border border-zinc-200 bg-white px-[10px] py-[7px] text-[12px] text-zinc-600 transition-colors hover:border-zinc-300" @click="goalFilter = 'all'; qualityFilter = 'all'; platformFilter = 'all'; groupFilter = 'all'; dateFrom = ''; dateTo = ''; keyword = ''; onlyFavorite = false">清空筛选</button>
          </div>

          <div class="mb-[8px] grid grid-cols-2 gap-[8px]">
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="sortBy === 'newest' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="sortBy = 'newest'">按时间倒序</button>
            <button type="button" class="rounded-[10px] border px-[10px] py-[7px] text-[12px] transition-colors" :class="sortBy === 'quality' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'" @click="sortBy = 'quality'">按质量高到低</button>
          </div>

          <div class="mb-[8px]">
            <UiInput v-model="keyword" placeholder="搜索场景、主题或文案内容" />
          </div>

          <div class="mb-[8px] grid grid-cols-2 gap-[8px]">
            <UiDatePicker v-model="dateFrom" placeholder="开始日期" />
            <UiDatePicker v-model="dateTo" placeholder="结束日期" />
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
          <div class="mb-[16px] flex size-[80px] items-center justify-center rounded-full bg-zinc-100">
            <Clock3 class="size-[32px] text-zinc-400" />
          </div>
          <p class="text-[16px] font-medium text-zinc-600">暂无历史记录</p>
          <p class="mt-[8px] text-[14px] text-zinc-400">生成的文案会显示在这里</p>
          <UiButton variant="outline" class="mt-[24px]" @click="router.push('/')">
            去创作
          </UiButton>
        </div>

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
            <UiCard class="group p-[14px] transition-all duration-200 hover:shadow-float">
              <div class="flex items-start gap-[12px]">
                <button
                  type="button"
                  class="min-w-0 flex-1 text-left"
                  @click="goDetail(item.id)"
                >
                  <div class="mb-[6px] flex items-center gap-[8px]">
                    <span class="text-[14px]">{{ item.platform === 'xiaohongshu' ? '📕' : '🎵' }}</span>
                    <p class="line-clamp-1 truncate text-[15px] font-medium text-zinc-900">
                      {{ item.sceneName || item.topic }}
                    </p>
                  </div>
                  <p class="line-clamp-2 text-[13px] font-light leading-[20px] text-zinc-500">
                    {{ item.content?.slice(0, 100) }}...
                  </p>
                  <div class="mt-[8px] flex items-center gap-[12px]">
                    <span class="text-[11px] text-zinc-400">{{ formatTime(item.createdAt) }}</span>
                    <span v-if="item.qualityScore" class="text-[11px] text-zinc-400">
                      质量 {{ item.qualityScore }}
                    </span>
                  </div>
                </button>
                <div class="flex items-center gap-[4px]">
                  <button
                    v-if="batchMode"
                    type="button"
                    class="flex size-[32px] items-center justify-center rounded-full border text-[12px] transition-all"
                    :class="selectedIds.includes(item.id) ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-500'"
                    @click="toggleSelect(item.id, $event)"
                  >
                    {{ selectedIds.includes(item.id) ? '✓' : '选' }}
                  </button>
                  <button
                    type="button"
                    class="flex size-[32px] items-center justify-center rounded-full text-zinc-400 transition-all hover:bg-amber-50 hover:text-amber-500"
                    @click="toggleFavorite(item.id, $event)"
                  >
                    <Star class="size-[14px]" :class="isFavorite(item.id) ? 'fill-amber-400 text-amber-500' : ''" />
                  </button>
                  <button v-if="isFavorite(item.id)" type="button" class="rounded-full border border-zinc-200 px-[8px] py-[4px] text-[11px] text-zinc-600" @click="setFavoriteGroup(item.id, 'inspire', $event)">灵感</button>
                  <button v-if="isFavorite(item.id)" type="button" class="rounded-full border border-zinc-200 px-[8px] py-[4px] text-[11px] text-zinc-600" @click="setFavoriteGroup(item.id, 'high_quality', $event)">高质</button>
                  <button v-if="isFavorite(item.id)" type="button" class="rounded-full border border-zinc-200 px-[8px] py-[4px] text-[11px] text-zinc-600" @click="setFavoriteGroup(item.id, 'reuse', $event)">复用</button>
                  <button
                    type="button"
                    class="flex size-[32px] items-center justify-center rounded-full text-zinc-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    @click="handleRemove(item.id, $event)"
                  >
                    <Trash2 class="size-[14px]" />
                  </button>
                  <ArrowRight class="size-[14px] text-zinc-300 transition-colors group-hover:text-zinc-500" />
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
