<script setup lang="ts">
import { Activity, ChevronLeft, ChevronRight, Download, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-vue-next'
import UiButton from '~/components/ui/button/index.vue'
import { Select as UiSelect, SelectItem as UiSelectItem } from '~/components/ui/select'
import UiInput from '~/components/ui/input/index.vue'
import UiDatePicker from '~/components/ui/date-picker/index.vue'
import UiCard from '~/components/ui/card/index.vue'
import { Sparkline, MiniBar, MiniRing } from '~/components/ui/chart'

type OverviewResponse = {
  summary: {
    history_total: number
    devices_total: number
    events_total: number
    today_generate_start: number
    today_generate_success: number
    success_rate_total: number
    error_rate_total: number
    avg_generate_per_session: number
    avg_quality_score: number
    p50_quality_score: number
    p90_quality_score: number
    warning_count: number
    safety_warn_events: number
    top_error_code: string
    top_error_count: number
  }
  funnel: Array<{
    date: string
    sessions: number
    generate_start: number
    generate_success: number
    generate_error: number
    success_rate: number
  }>
  recent_history: Array<{
    id: string
    createdAt: string
    platform: 'xiaohongshu' | 'douyin'
    tone: 'viral' | 'professional' | 'chatty'
    sceneName?: string
    topic: string
  }>
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  error_by_day: Array<{
    date: string
    codes: Record<string, number>
  }>
  error_by_platform: Array<{
    platform: string
    codes: Record<string, number>
  }>
  quality_trend: Array<{
    date: string
    structure: number
    publishability: number
    repetition: number
  }>
}

type WeeklyResponse = {
  period: string
  metrics: {
    starts: number
    success: number
    errors: number
    successRate: number
  }
  highlights: string[]
  actions: string[]
}

const route = useRoute()
const key = computed(() => typeof route.query.key === 'string' ? route.query.key : '')

const loading = ref(false)
const errorMessage = ref('')
const lastOverviewAt = ref(0)
const lastWeeklyAt = ref(0)
const FETCH_TTL_MS = 15_000

const platform = ref<'all' | 'xiaohongshu' | 'douyin'>('all')
const tone = ref<'all' | 'viral' | 'professional' | 'chatty'>('all')
const userType = ref<'all' | 'logged' | 'guest'>('all')
const userId = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const historySort = ref<'desc' | 'asc'>('desc')
const page = ref(1)
const pageSize = ref(10)
const CACHE_TTL = 60_000

const overviewCacheKey = computed(() => [
  'ops-overview',
  key.value,
  platform.value,
  tone.value,
  userType.value,
  userId.value,
  dateFrom.value,
  dateTo.value,
  historySort.value,
  page.value,
  pageSize.value,
].join(':'))

const weeklyCacheKey = computed(() => ['ops-weekly', key.value].join(':'))

function readCached<T>(cacheKey: string): T | undefined {
  if (!import.meta.client) return undefined
  const fromNuxt = useNuxtData<T>(cacheKey).data.value
  if (fromNuxt) return fromNuxt
  try {
    const raw = sessionStorage.getItem(cacheKey)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { at: number, data: T }
    if (Date.now() - parsed.at > CACHE_TTL) return undefined
    return parsed.data
  } catch {
    return undefined
  }
}

function writeCached<T>(cacheKey: string, value: T) {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), data: value }))
  } catch {
    // ignore storage failures
  }
}

function buildQuery(extra: Record<string, string> = {}) {
  const query = new URLSearchParams()
  if (key.value) query.set('key', key.value)
  if (platform.value !== 'all') query.set('platform', platform.value)
  if (tone.value !== 'all') query.set('tone', tone.value)
  if (userType.value !== 'all') query.set('userType', userType.value)
  if (userId.value.trim()) query.set('userId', userId.value.trim())
  if (dateFrom.value) query.set('dateFrom', dateFrom.value)
  if (dateTo.value) query.set('dateTo', dateTo.value)
  query.set('page', String(page.value))
  query.set('pageSize', String(pageSize.value))
  query.set('historySort', historySort.value)

  for (const [k, v] of Object.entries(extra)) {
    if (v) query.set(k, v)
  }
  return `?${query.toString()}`
}

const overviewQuery = computed(() => ({
  key: key.value || undefined,
  platform: platform.value === 'all' ? undefined : platform.value,
  tone: tone.value === 'all' ? undefined : tone.value,
  userType: userType.value === 'all' ? undefined : userType.value,
  userId: userId.value.trim() || undefined,
  dateFrom: dateFrom.value || undefined,
  dateTo: dateTo.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
  historySort: historySort.value,
}))

const weeklyQuery = computed(() => ({
  key: key.value || undefined,
}))

const { data, pending: overviewPending, error: overviewError, execute: executeOverview } = await useFetch<OverviewResponse>('/api/ops/overview', {
  server: false,
  lazy: true,
  immediate: false,
  query: overviewQuery,
  key: overviewCacheKey,
  getCachedData: cacheKey => readCached<OverviewResponse>(cacheKey),
  transform: (value) => {
    writeCached(overviewCacheKey.value, value)
    return value
  },
})

const { data: weekly, execute: executeWeekly } = await useFetch<WeeklyResponse>('/api/ops/weekly', {
  server: false,
  lazy: true,
  immediate: false,
  query: weeklyQuery,
  key: weeklyCacheKey,
  getCachedData: cacheKey => readCached<WeeklyResponse>(cacheKey),
  transform: (value) => {
    writeCached(weeklyCacheKey.value, value)
    return value
  },
})

watch(overviewPending, value => {
  loading.value = value
})

watch(overviewError, value => {
  if (!value) {
    errorMessage.value = ''
    return
  }
  errorMessage.value = (value as any)?.statusCode === 403 ? '无访问权限' : '加载失败'
})

async function loadOverview(force = false) {
  if (!force && Date.now() - lastOverviewAt.value < FETCH_TTL_MS) return
  await executeOverview({ dedupe: 'cancel' })
  lastOverviewAt.value = Date.now()
}

async function loadWeekly(force = false) {
  if (!force && Date.now() - lastWeeklyAt.value < FETCH_TTL_MS) return
  await executeWeekly({ dedupe: 'cancel' })
  lastWeeklyAt.value = Date.now()
}

function exportCsv(type: 'history' | 'funnel') {
  window.open(`/api/ops/export${buildQuery({ type })}`, '_blank')
}

function exportAdvancedCsv(type: 'error-distribution' | 'quality-trend') {
  window.open(`/api/ops/export${buildQuery({ type })}`, '_blank')
}

function resetFilters() {
  platform.value = 'all'
  tone.value = 'all'
  userType.value = 'all'
  userId.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  historySort.value = 'desc'
  page.value = 1
  executeOverview()
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const maxStart = computed(() => Math.max(...(data.value?.funnel.map(item => item.generate_start) || [1])))
const summaryCards = computed(() => {
  if (!data.value) return []
  const s = data.value.summary
  return [
    { title: '历史总量', value: String(s.history_total), hint: '累计记录' },
    { title: '设备数', value: String(s.devices_total), hint: '去重设备' },
    { title: '总成功率', value: `${(s.success_rate_total * 100).toFixed(1)}%`, hint: '全量' },
    { title: '总失败率', value: `${(s.error_rate_total * 100).toFixed(1)}%`, hint: '全量' },
    { title: '会话人均发起', value: String(s.avg_generate_per_session), hint: '近窗口平均' },
    { title: '平均质量分', value: String(s.avg_quality_score), hint: '整体质量' },
    { title: 'P50 / P90', value: `${s.p50_quality_score} / ${s.p90_quality_score}`, hint: '质量分位' },
    { title: '头部错误码', value: s.top_error_code || '-', hint: `次数 ${s.top_error_count}` },
  ]
})

function toPct(v: number, max: number) {
  if (max <= 0) return 0
  return Math.max(4, Math.round((v / max) * 100))
}

function isAnomalyDay(row: { generate_start: number, generate_error: number }) {
  if (row.generate_start < 5) return false
  return row.generate_error / row.generate_start >= 0.3
}

async function applyFilters() {
  page.value = 1
  await loadOverview(true)
}

async function goPage(next: number) {
  if (!data.value) return
  if (next < 1 || next > data.value.pagination.totalPages) return
  page.value = next
  await loadOverview(true)
}

onMounted(async () => {
  await Promise.all([loadOverview(true), loadWeekly(true)])
})
</script>

<template>
  <main class="ops-shell min-h-[100dvh] text-zinc-900">
    <div class="mx-auto w-full max-w-[1180px] px-[16px] py-[18px] md:px-[24px] md:py-[24px]">
      <section class="ops-panel mb-[12px] px-[14px] py-[14px] md:px-[18px] md:py-[16px]">
        <div class="flex flex-wrap items-start justify-between gap-[12px]">
          <div>
            <p class="ops-kicker">AI CREATOR · OPS</p>
            <h1 class="mt-[4px] text-[24px] font-semibold leading-[30px] tracking-tight">运营驾驶舱</h1>
            <p class="mt-[4px] text-[13px] text-zinc-600">统一查看生成质量、转化漏斗与风险分布</p>
          </div>
          <div class="flex flex-wrap items-center gap-[8px]">
            <UiButton variant="outline" @click="loadOverview(true)">
              <RefreshCw class="size-[14px]" :class="loading ? 'animate-spin' : ''" />刷新数据
            </UiButton>
            <UiButton variant="outline" @click="exportCsv('history')">
              <Download class="size-[14px]" />导出历史
            </UiButton>
            <UiButton variant="outline" @click="exportCsv('funnel')">
              <Download class="size-[14px]" />导出漏斗
            </UiButton>
            <UiButton variant="outline" @click="exportAdvancedCsv('error-distribution')">
              <Download class="size-[14px]" />错误分布
            </UiButton>
            <UiButton variant="outline" @click="exportAdvancedCsv('quality-trend')">
              <Download class="size-[14px]" />质量趋势
            </UiButton>
          </div>
        </div>
      </section>

      <section class="ops-panel mb-[12px] p-[12px] md:p-[14px]">
        <div class="mb-[10px] flex items-center justify-between">
          <p class="text-[12px] font-medium uppercase tracking-[0.08em] text-zinc-500">筛选条件</p>
          <UiButton variant="ghost" size="sm" @click="resetFilters">重置</UiButton>
        </div>
        <div class="grid gap-[8px] md:grid-cols-8">
          <UiSelect v-model="platform" placeholder="全部平台">
            <UiSelectItem value="all">全部平台</UiSelectItem>
            <UiSelectItem value="xiaohongshu">小红书</UiSelectItem>
            <UiSelectItem value="douyin">抖音</UiSelectItem>
          </UiSelect>
          <UiSelect v-model="tone" placeholder="全部语气">
            <UiSelectItem value="all">全部语气</UiSelectItem>
            <UiSelectItem value="viral">吸睛爆款</UiSelectItem>
            <UiSelectItem value="professional">干货专业</UiSelectItem>
            <UiSelectItem value="chatty">闺蜜聊天</UiSelectItem>
          </UiSelect>
          <UiSelect v-model="userType" placeholder="全部用户">
            <UiSelectItem value="all">全部用户</UiSelectItem>
            <UiSelectItem value="logged">已登录</UiSelectItem>
            <UiSelectItem value="guest">游客</UiSelectItem>
          </UiSelect>
          <UiInput v-model="userId" placeholder="用户 ID 精确筛选" />
          <UiDatePicker v-model="dateFrom" placeholder="开始日期" />
          <UiDatePicker v-model="dateTo" placeholder="结束日期" />
          <UiSelect v-model="historySort" placeholder="排序方式">
            <UiSelectItem value="desc">时间倒序</UiSelectItem>
            <UiSelectItem value="asc">时间正序</UiSelectItem>
          </UiSelect>
          <UiButton class="w-full" @click="applyFilters">应用筛选</UiButton>
        </div>
      </section>

      <p v-if="errorMessage" class="mb-[12px] rounded-[12px] border border-red-100 bg-red-50 px-[12px] py-[10px] text-[13px] text-red-600">{{ errorMessage }}</p>

      <div v-if="data" class="mb-[12px] grid gap-[8px] sm:grid-cols-2 lg:grid-cols-4">
        <UiCard class="ops-metric p-[14px]">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[12px] text-zinc-500">历史总量</p>
              <p class="mt-[4px] text-[22px] font-semibold tracking-tight">{{ data.summary.history_total }}</p>
              <p class="mt-[2px] text-[11px] text-zinc-400">累计记录</p>
            </div>
            <MiniRing
              :value="data.summary.today_generate_success"
              :max="data.summary.today_generate_start || 1"
              :size="40"
              color="#10b981"
            />
          </div>
        </UiCard>

        <UiCard class="ops-metric p-[14px]">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[12px] text-zinc-500">成功率</p>
              <p class="mt-[4px] text-[22px] font-semibold tracking-tight">{{ (data.summary.success_rate_total * 100).toFixed(1) }}%</p>
              <p class="mt-[2px] text-[11px] text-zinc-400">全量统计</p>
            </div>
            <MiniRing
              :value="data.summary.success_rate_total * 100"
              :size="40"
              :color="data.summary.success_rate_total >= 0.8 ? '#10b981' : data.summary.success_rate_total >= 0.6 ? '#f59e0b' : '#ef4444'"
              :show-label="true"
            />
          </div>
        </UiCard>

        <UiCard class="ops-metric p-[14px]">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[12px] text-zinc-500">平均质量分</p>
              <p class="mt-[4px] text-[22px] font-semibold tracking-tight">{{ data.summary.avg_quality_score }}</p>
              <p class="mt-[2px] text-[11px] text-zinc-400">P50: {{ data.summary.p50_quality_score }} / P90: {{ data.summary.p90_quality_score }}</p>
            </div>
            <MiniRing
              :value="data.summary.avg_quality_score"
              :size="40"
              color="#8b5cf6"
            />
          </div>
        </UiCard>

        <UiCard class="ops-metric p-[14px]">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[12px] text-zinc-500">设备数</p>
              <p class="mt-[4px] text-[22px] font-semibold tracking-tight">{{ data.summary.devices_total }}</p>
              <p class="mt-[2px] text-[11px] text-zinc-400">人均 {{ data.summary.avg_generate_per_session }} 次</p>
            </div>
            <div class="flex size-[40px] items-center justify-center rounded-full bg-zinc-100">
              <TrendingUp class="size-[18px] text-zinc-600" />
            </div>
          </div>
        </UiCard>
      </div>

      <section v-if="data" class="ops-panel mb-[12px] overflow-hidden">
        <div class="flex items-center justify-between border-b border-zinc-100/90 px-[14px] py-[12px]">
          <span class="text-[13px] font-semibold text-zinc-700">转化趋势（近7天）</span>
          <span class="text-[11px] text-zinc-400">发起 → 成功</span>
        </div>
        <div class="p-[14px]">
          <!-- 迷你图表 -->
          <div class="mb-[12px] grid grid-cols-2 gap-[12px]">
            <div class="rounded-[10px] bg-zinc-50 p-[12px]">
              <p class="mb-[4px] text-[11px] text-zinc-500">发起量</p>
              <p class="text-[20px] font-semibold tracking-tight">{{ data.funnel.reduce((s, r) => s + r.generate_start, 0) }}</p>
              <div class="mt-[8px] h-[32px]">
                <Sparkline
                  :data="data.funnel.map(r => r.generate_start)"
                  color="#71717a"
                  :show-area="true"
                />
              </div>
            </div>
            <div class="rounded-[10px] bg-emerald-50 p-[12px]">
              <p class="mb-[4px] text-[11px] text-emerald-600">成功量</p>
              <p class="text-[20px] font-semibold tracking-tight text-emerald-700">{{ data.funnel.reduce((s, r) => s + r.generate_success, 0) }}</p>
              <div class="mt-[8px] h-[32px]">
                <Sparkline
                  :data="data.funnel.map(r => r.generate_success)"
                  color="#10b981"
                  :show-area="true"
                />
              </div>
            </div>
          </div>

          <!-- 详细数据 -->
          <div class="grid gap-[6px]">
            <div
              v-for="row in data.funnel"
              :key="row.date"
              class="grid grid-cols-[70px_1fr_80px] items-center gap-[8px] rounded-[8px] px-[8px] py-[6px] text-[12px] transition-colors"
              :class="isAnomalyDay(row) ? 'bg-red-50/60' : 'hover:bg-zinc-50'"
            >
              <span class="flex items-center gap-[4px]" :class="isAnomalyDay(row) ? 'text-red-600' : 'text-zinc-500'">
                <AlertTriangle v-if="isAnomalyDay(row)" class="size-[12px]" />
                {{ row.date.slice(5) }}
              </span>
              <div class="flex gap-[4px]">
                <MiniBar
                  :value="row.generate_start"
                  :max="maxStart"
                  color="#a1a1aa"
                  :height="16"
                />
                <MiniBar
                  :value="row.generate_success"
                  :max="maxStart"
                  color="#10b981"
                  :height="16"
                />
              </div>
              <span class="text-right tabular-nums" :class="row.success_rate >= 0.8 ? 'text-emerald-600' : row.success_rate >= 0.6 ? 'text-amber-600' : 'text-red-600'">
                {{ (row.success_rate * 100).toFixed(0) }}%
              </span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="weekly" class="ops-panel mb-[12px] overflow-hidden">
        <div class="border-b border-zinc-100/90 px-[14px] py-[12px] text-[13px] font-semibold text-zinc-700">周报摘要（自动）</div>
        <div class="grid gap-[6px] px-[12px] py-[10px] text-[13px] text-zinc-700 md:px-[14px]">
          <p v-for="line in weekly.highlights" :key="line">• {{ line }}</p>
        </div>
        <div class="border-t border-zinc-100 px-[12px] py-[10px] md:px-[14px]">
          <p class="mb-[6px] text-[12px] font-medium text-zinc-500">建议动作</p>
          <p v-for="line in weekly.actions" :key="line" class="text-[13px] text-zinc-700">• {{ line }}</p>
        </div>
      </section>

      <section v-if="data" class="mb-[12px] grid gap-[12px] lg:grid-cols-2">
        <div class="ops-panel overflow-hidden">
          <div class="border-b border-zinc-100 px-[14px] py-[12px] text-[13px] font-semibold text-zinc-700">错误码分布（按天）</div>
          <div class="p-[14px] text-[12px]">
            <div v-for="row in data.error_by_day" :key="row.date" class="mb-[8px]">
              <p class="mb-[2px] text-zinc-500">{{ row.date }}</p>
              <p class="text-zinc-700">{{ Object.entries(row.codes).map(([code, count]) => `${code}:${count}`).join(' / ') || '-' }}</p>
            </div>
          </div>
        </div>
        <div class="ops-panel overflow-hidden">
          <div class="border-b border-zinc-100 px-[14px] py-[12px] text-[13px] font-semibold text-zinc-700">错误码分布（按平台）</div>
          <div class="p-[14px] text-[12px]">
            <div v-for="row in data.error_by_platform" :key="row.platform" class="mb-[8px]">
              <p class="mb-[2px] text-zinc-500">{{ row.platform }}</p>
              <p class="text-zinc-700">{{ Object.entries(row.codes).map(([code, count]) => `${code}:${count}`).join(' / ') || '-' }}</p>
            </div>
          </div>
        </div>
      </section>

      <section v-if="data" class="ops-panel mb-[12px] overflow-hidden">
        <div class="flex items-center justify-between border-b border-zinc-100 px-[14px] py-[12px]">
          <span class="text-[13px] font-semibold text-zinc-700">质量三维趋势</span>
          <span class="text-[11px] text-zinc-400">结构 · 发布 · 重复</span>
        </div>
        <div class="p-[14px]">
          <div class="mb-[12px] grid grid-cols-3 gap-[8px]">
            <div class="rounded-[10px] bg-blue-50 p-[10px] text-center">
              <p class="text-[11px] text-blue-600 mb-[4px]">结构</p>
              <div class="flex justify-center">
                <MiniRing
                  :value="data.quality_trend.length ? data.quality_trend[data.quality_trend.length - 1].structure : 0"
                  :size="48"
                  color="#3b82f6"
                  :show-label="true"
                />
              </div>
            </div>
            <div class="rounded-[10px] bg-violet-50 p-[10px] text-center">
              <p class="text-[11px] text-violet-600 mb-[4px]">发布</p>
              <div class="flex justify-center">
                <MiniRing
                  :value="data.quality_trend.length ? data.quality_trend[data.quality_trend.length - 1].publishability : 0"
                  :size="48"
                  color="#8b5cf6"
                  :show-label="true"
                />
              </div>
            </div>
            <div class="rounded-[10px] bg-amber-50 p-[10px] text-center">
              <p class="text-[11px] text-amber-600 mb-[4px]">重复度</p>
              <div class="flex justify-center">
                <MiniRing
                  :value="data.quality_trend.length ? data.quality_trend[data.quality_trend.length - 1].repetition : 0"
                  :size="48"
                  color="#f59e0b"
                  :show-label="true"
                />
              </div>
            </div>
          </div>

          <div class="grid gap-[6px]">
            <div v-for="row in data.quality_trend" :key="row.date" class="grid grid-cols-[70px_1fr_1fr_1fr] items-center gap-[8px] text-[12px]">
              <span class="text-zinc-500">{{ row.date.slice(5) }}</span>
              <div class="flex items-center gap-[4px]">
                <div class="h-[6px] flex-1 rounded-full bg-zinc-100">
                  <div class="h-full rounded-full bg-blue-500" :style="{ width: `${row.structure}%` }" />
                </div>
                <span class="tabular-nums text-zinc-600 min-w-[24px] text-right">{{ row.structure }}</span>
              </div>
              <div class="flex items-center gap-[4px]">
                <div class="h-[6px] flex-1 rounded-full bg-zinc-100">
                  <div class="h-full rounded-full bg-violet-500" :style="{ width: `${row.publishability}%` }" />
                </div>
                <span class="tabular-nums text-zinc-600 min-w-[24px] text-right">{{ row.publishability }}</span>
              </div>
              <div class="flex items-center gap-[4px]">
                <div class="h-[6px] flex-1 rounded-full bg-zinc-100">
                  <div class="h-full rounded-full bg-amber-500" :style="{ width: `${row.repetition}%` }" />
                </div>
                <span class="tabular-nums text-zinc-600 min-w-[24px] text-right">{{ row.repetition }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="data" class="ops-panel overflow-hidden">
        <div class="border-b border-zinc-100 px-[14px] py-[12px] text-[13px] font-semibold text-zinc-700">最近内容（分页）</div>
        <div class="divide-y divide-zinc-100">
          <div v-for="item in data.recent_history" :key="item.id" class="px-[12px] py-[10px]">
            <p class="line-clamp-1 text-[13px] font-medium">{{ item.sceneName || item.topic }}</p>
            <p class="mt-[3px] text-[12px] text-zinc-500">{{ formatTime(item.createdAt) }} · {{ item.platform === 'xiaohongshu' ? '小红书' : '抖音' }} · {{ item.tone }}</p>
          </div>
        </div>
        <div class="flex items-center justify-between border-t border-zinc-100 px-[12px] py-[10px] text-[12px] text-zinc-600">
          <span>第 {{ data.pagination.page }} / {{ data.pagination.totalPages }} 页（共 {{ data.pagination.total }} 条）</span>
          <div class="flex items-center gap-[6px]">
            <UiButton variant="outline" size="sm" :disabled="data.pagination.page <= 1" @click="goPage(data.pagination.page - 1)">
              <ChevronLeft class="size-[14px]" />
            </UiButton>
            <UiButton variant="outline" size="sm" :disabled="data.pagination.page >= data.pagination.totalPages" @click="goPage(data.pagination.page + 1)">
              <ChevronRight class="size-[14px]" />
            </UiButton>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.ops-shell {
  background:
    radial-gradient(1200px 460px at 0% 0%, rgba(15, 23, 42, 0.07), transparent 70%),
    linear-gradient(180deg, #f4f6fb 0%, #f8fafc 42%, #f5f7fb 100%);
}

.ops-panel {
  border: 1px solid rgba(24, 24, 27, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 14px 32px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(6px);
}

.ops-kicker {
  font-size: 11px;
  letter-spacing: 0.14em;
  font-weight: 600;
  color: rgb(82 82 91);
}

.ops-metric {
  border-color: rgba(24, 24, 27, 0.06);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.ops-metric:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(24, 24, 27, 0.08);
}
</style>
