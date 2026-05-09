<script setup lang="ts">
import { toast } from 'vue-sonner'
import UiButton from '~/components/ui/button/index.vue'
import UiCard from '~/components/ui/card/index.vue'
import UiInput from '~/components/ui/input/index.vue'

interface DailyRecord {
  id: string
  dateKey: string
  topic: string
  knowledgePoint: string
  generatedContent: string
  polishedContent: string
  sent: boolean
  createdAt: string
  sentAt?: string
}
interface HotTopicItem {
  title: string
  point: string
  source: string
  url: string
}

const DAILY_RECORDS_KEY = 'xhs_bichon_daily_records_v1'
const PET_NAME_KEY = 'xhs_bichon_pet_name_v1'

const knowledgePool = [
  '泪痕管理：饮水、饮食、眼周清洁、毛发修剪的联动逻辑',
  '比熊皮肤屏障：洗护频率、吹干标准、潮湿性皮炎预防',
  '肠胃稳定：换粮周期、便便观察、零食占比控制',
  '体重管理：BCS体况评分与每日喂食量微调',
  '口腔护理：刷牙训练步骤与牙结石预防节奏',
  '居家环境：过敏原、清洁剂、香氛对狗狗的潜在刺激',
  '分离焦虑：低刺激离家训练和回家流程管理',
  '基础服从：召回、等待、放下口令的强化策略',
  '运动结构：比熊日常活动量与情绪稳定关系',
  '耳道护理：清洁频率、异常分泌物识别与就医时机',
  '泪痕与面部毛：眼角毛修剪安全边界',
  '季节护理：梅雨季、换季期皮肤与毛发注意点',
  '社交规则：与陌生狗接触的压力信号识别',
  '幼犬到成犬：作息与训练重点迁移',
]

const articleTitle = ref('比熊犬泪痕反复，先从这4件基础事排查')
const petName = ref('雪球')
const dogProfile = ref('比熊，1岁2个月，已绝育，室内饲养，每天遛2次')
const audience = ref('新手养比熊家庭')
const keyPoint = ref('泪痕管理')
const scenario = ref('日常家庭护理，可执行，不夸张承诺')
const evidenceNeed = ref('必须给出原理 + 可执行步骤 + 观察周期 + 常见误区')
const riskGuard = ref('禁止医疗承诺；出现异常需建议及时就医')
const keywords = ref('比熊,泪痕,日常护理,饮食管理,梳毛清洁,新手养狗')
const generatedAt = ref('')
const records = ref<DailyRecord[]>([])
const hotTopics = ref<HotTopicItem[]>([])
const hotLoading = ref(false)
const hotFetchedAt = ref('')

const dateKey = computed(() => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
})

const todayKnowledgePoint = computed(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const day = Math.floor(diff / 86400000)
  return knowledgePool[(day - 1) % knowledgePool.length]
})

const recentTopicText = computed(() => {
  return records.value
    .slice(0, 30)
    .map(r => `${r.topic} ${r.knowledgePoint}`.toLowerCase())
})

const suggestedTopic = computed(() => {
  const prefixes = [
    `${petName.value}最近`,
    `很多比熊家长问我`,
    `关于比熊`,
    `${petName.value}这周实测`,
  ]
  const suffixMap: Record<string, string[]> = {
    '泪痕管理': ['泪痕反复怎么排查更稳妥', '泪痕护理里最容易做错的3步'],
    '比熊皮肤屏障': ['皮肤屏障脆弱时，洗护顺序怎么排', '洗完澡后这一步不到位最伤皮肤'],
    '肠胃稳定': ['软便反复时先别急着换粮', '换粮期怎么把肠胃波动降到最低'],
    '体重管理': ['怎么判断喂多了而不是吃不饱', '体重控制里最关键的不是“少喂”'],
    '口腔护理': ['刷牙训练总失败，问题常在节奏', '牙结石预防从哪天开始最省事'],
    '居家环境': ['家里这几样东西可能在刺激狗狗', '比熊居家环境怎么做更稳'],
    '分离焦虑': ['出门前后这2个动作会放大焦虑', '分离焦虑训练为什么越安慰越粘人'],
    '基础服从': ['召回总失效，先修这一步', '口令训练里强化时机比次数更重要'],
    '运动结构': ['遛狗不是越久越好，关键看结构', '运动安排不当会让狗更兴奋'],
    '耳道护理': ['耳道清洁频率太高反而坏事', '出现这类分泌物别再自己处理'],
    '泪痕与面部毛': ['眼角毛修剪的安全边界', '面部毛处理不当会让泪痕更重'],
    '季节护理': ['换季期比熊最容易出现的护理误区', '潮湿天气下怎么稳住皮肤状态'],
    '社交规则': ['见狗就冲不是“热情”而是压力', '社交时怎么识别快要冲突的信号'],
    '幼犬到成犬': ['作息怎么从幼犬平滑过渡到成犬', '成犬后哪些训练不能停'],
  }
  const point = keyPoint.value || todayKnowledgePoint.value
  const core = (point.split('：')[0] || point).trim()
  const suffixes = suffixMap[core] || [`${core}这件事到底怎么做更专业`, `${core}里最容易忽略的细节`]
  for (const p of prefixes) {
    for (const s of suffixes) {
      const candidate = `${p}，${s}`
      const hit = recentTopicText.value.some(t => t.includes(candidate.toLowerCase().slice(0, 12)))
      if (!hit) return candidate
    }
  }
  return `${petName.value}日常科普：${core}的家庭护理实操清单`
})

const todayRecord = computed(() => records.value.find(r => r.dateKey === dateKey.value))
const hasGeneratedToday = computed(() => Boolean(todayRecord.value?.generatedContent))
const hasPolishedToday = computed(() => Boolean(todayRecord.value?.polishedContent))
const finalContent = computed(() => todayRecord.value?.polishedContent || todayRecord.value?.generatedContent || '')

const internalPrompt = computed(() => {
  return [
    '你是一位犬类行为与健康管理方向的内容编辑，擅长将专业知识转成普通养宠人可执行的步骤。',
    '请写一篇可以直接发布到小红书的【比熊养宠科普】图文内容，要求：搜索友好、真实克制、强互动、可操作。',
    '',
    `【今日选题】${articleTitle.value}`,
    `【宠物名字】${petName.value}`,
    `【狗狗画像】${dogProfile.value}`,
    `【目标读者】${audience.value}`,
    `【核心知识点】${keyPoint.value || todayKnowledgePoint.value}`,
    `【使用场景】${scenario.value}`,
    `【证据要求】${evidenceNeed.value}`,
    `【风险边界】${riskGuard.value}`,
    `【必须覆盖关键词】${keywords.value}`,
    '',
    '【2026发布策略（必须执行）】',
    '1. 搜索优先：标题前15字必须出现核心搜索词（如“比熊泪痕”“比熊软便”“比熊洗澡频率”）。',
    '2. 正文前50字自然植入3-5个长尾词，禁止堆砌。',
    '3. 高质量互动导向：结尾必须设计一个可回答的问题，鼓励15字以上经验评论。',
    '4. 风格为“活人感”：允许真实小瑕疵和踩坑，不写完美叙事，不用营销腔。',
    '5. 信息价值优先：内容要让人有“想收藏/截图”的冲动，给清单化步骤。',
    '',
    '【写作硬性要求】',
    '1. 开头2句内点出常见误区或痛点，避免空话。',
    '2. 正文按“原因判断 -> 具体做法 -> 观察周期 -> 何时就医”展开。',
    '3. 每个做法给出频次和量化动作（例如：连续7天、每天2次、每次3-5分钟）。',
    '4. 必须写“不要做什么”，至少3条避坑提醒。',
    '5. 语言专业但不端着，不要营销腔，不要夸张承诺。',
    '6. 结尾给一个低门槛互动问题，促进评论区交流真实经验（引导“你家比熊目前是什么情况”）。',
    '7. 补充“评论区关键词建议”1行，便于后续评论区埋词做搜索扩展。',
    '',
    '【小红书格式要求】',
    '输出必须包含并仅包含以下结构标签：',
    '===TITLE=== / ===END_TITLE===',
    '===COVER=== / ===END_COVER===',
    '===BODY=== / ===END_BODY===',
    '===TAGS=== / ===END_TAGS===',
    '===FIRST_COMMENTS=== / ===END_FIRST_COMMENTS===',
    '',
    '【标题要求】给3个备选，20字以内，避免标题党；每个标题都要是“核心词+痛点/结果”结构。',
    '【标签要求】给8-12个，含 #比熊 #养狗经验 #养宠科普 等长尾词。',
    '【额外提醒】如果发布端使用AI图或AI改写，请在平台发布时按规则勾选AI生成标识。',
  ].join('\n')
})

const generating = ref(false)
const generated = ref('')
const polishing = ref(false)
const polished = ref('')

function persistRecords() {
  if (!import.meta.client) return
  localStorage.setItem(DAILY_RECORDS_KEY, JSON.stringify(records.value))
}

function persistPetName() {
  if (!import.meta.client) return
  localStorage.setItem(PET_NAME_KEY, petName.value.trim() || '雪球')
}

function loadRecords() {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(DAILY_RECORDS_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as DailyRecord[]
    if (!Array.isArray(parsed)) return
    records.value = parsed.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 60)
  } catch {
    records.value = []
  }
}

async function copyContent() {
  const text = finalContent.value.trim()
  if (!text) return
  await navigator.clipboard.writeText(text)
  toast.success('文案已复制')
}

async function generateContent() {
  generating.value = true
  generated.value = ''
  polished.value = ''
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'xiaohongshu',
        tone: 'professional',
        goal: 'growth',
        industry: 'pet',
        scene: '比熊犬养宠科普（日更）',
        topic: articleTitle.value,
        audience: audience.value,
        keywords: keywords.value,
        customPrompt: internalPrompt.value,
      }),
    })
    if (!response.ok) {
      throw new Error(response.status === 429 ? '请求过于频繁，请稍后重试' : '生成失败')
    }
    const reader = response.body?.getReader()
    if (!reader) {
      generated.value = await response.text()
      return
    }
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      generated.value += decoder.decode(value, { stream: true })
    }
    generatedAt.value = new Date().toISOString()
    const next: DailyRecord = {
      id: todayRecord.value?.id || crypto.randomUUID(),
      dateKey: dateKey.value,
      topic: articleTitle.value,
      knowledgePoint: keyPoint.value || todayKnowledgePoint.value,
      generatedContent: generated.value.trim(),
      polishedContent: '',
      sent: false,
      createdAt: generatedAt.value,
    }
    records.value = [next, ...records.value.filter(r => r.dateKey !== dateKey.value)].slice(0, 60)
    persistRecords()
    toast.success('今日科普文案已生成')
  } catch (error: any) {
    toast.error(error?.message || '生成失败')
  } finally {
    generating.value = false
  }
}

async function polishBeforeSend() {
  const source = generated.value.trim() || todayRecord.value?.generatedContent?.trim()
  if (!source) {
    toast.error('请先生成今日文案')
    return
  }
  polishing.value = true
  polished.value = ''
  try {
    const optimizePrompt = [
      '请对下面这篇【比熊养宠科普】做发送前深度二次调优。',
      '目标：在不改变事实的前提下，把专业可信度、可执行性、搜索友好度和互动质量优化到可直接发布级别。',
      '硬性要求：',
      '1) 保留核心观点，不得编造医学结论或保证性承诺。',
      '2) 补强“步骤频次、观察周期、何时就医”。',
      '3) 增加3条常见误区纠偏，语气克制。',
      '4) 保持小红书结构化输出标签完整。',
      '5) 删除空话和重复句，优化段落节奏与信息密度。',
      '6) 标题、首段、结尾互动问题必须更精准。',
      '7) 出现风险描述时必须给出边界条件与替代方案。',
      '8) 标题前15字要有核心搜索词，正文前50字含3-5个自然长尾词。',
      '9) FIRST_COMMENTS 至少1条设计为“15字以上经验分享型提问”。',
      '',
      '原始文案如下：',
      source,
    ].join('\n')

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'xiaohongshu',
        tone: 'professional',
        goal: 'branding',
        industry: 'pet',
        scene: '发送前二次调优',
        topic: articleTitle.value,
        audience: audience.value,
        keywords: keywords.value,
        customPrompt: optimizePrompt,
      }),
    })
    if (!response.ok) throw new Error('二次调优失败')

    const reader = response.body?.getReader()
    if (!reader) {
      polished.value = await response.text()
    } else {
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        polished.value += decoder.decode(value, { stream: true })
      }
    }

    const existing = todayRecord.value
    if (existing) {
      existing.polishedContent = polished.value.trim()
      existing.topic = articleTitle.value
      existing.knowledgePoint = keyPoint.value || todayKnowledgePoint.value
      persistRecords()
    }
    toast.success('已完成发送前二次调优')
  } catch (error: any) {
    toast.error(error?.message || '二次调优失败')
  } finally {
    polishing.value = false
  }
}

function markSent() {
  const existing = todayRecord.value
  const text = finalContent.value.trim()
  if (!existing || !text) {
    toast.error('请先生成并调优文案')
    return
  }
  existing.sent = true
  existing.sentAt = new Date().toISOString()
  persistRecords()
  toast.success('已记录今日已发送')
}

function useTodayKnowledgePoint() {
  keyPoint.value = todayKnowledgePoint.value
  articleTitle.value = suggestedTopic.value
}

async function loadHotTopics() {
  hotLoading.value = true
  try {
    const response = await fetch('/api/topics/bichon-hot')
    if (!response.ok) throw new Error('在线话题抓取失败')
    const data = await response.json() as { fetchedAt?: string, topics?: HotTopicItem[] }
    hotTopics.value = Array.isArray(data.topics) ? data.topics.slice(0, 24) : []
    hotFetchedAt.value = data.fetchedAt || ''
    if (!hotTopics.value.length) {
      toast.warning('未抓到可用热点，先用系统推荐话题')
    }
  } catch {
    toast.error('在线话题加载失败，请稍后重试')
  } finally {
    hotLoading.value = false
  }
}

function applyHotTopic(item: HotTopicItem) {
  articleTitle.value = item.title.replace(/比熊犬/g, petName.value)
  keyPoint.value = item.point
  toast.success('已采用热门话题')
}

onMounted(() => {
  loadRecords()
  if (import.meta.client) {
    const cached = localStorage.getItem(PET_NAME_KEY)
    if (cached?.trim()) petName.value = cached.trim()
  }
  if (!keyPoint.value) keyPoint.value = todayKnowledgePoint.value
  if (todayRecord.value) {
    generated.value = todayRecord.value.generatedContent
    polished.value = todayRecord.value.polishedContent
  }
  loadHotTopics()
})

watch(petName, () => {
  persistPetName()
})
</script>

<template>
  <main class="min-h-[100dvh] bg-gradient-subtle px-[16px] py-[20px] text-zinc-900">
    <div class="mx-auto w-full max-w-[760px] space-y-[12px]">
      <UiCard class="p-[16px]">
        <h1 class="text-[22px] font-semibold tracking-tight">小红书 · 比熊养宠科普专页</h1>
        <p class="mt-[6px] text-[13px] text-zinc-500">专业科普导向，默认每日一篇，支持生成、二次调优、发送记录。</p>
      </UiCard>

      <UiCard class="space-y-[10px] p-[16px]">
        <div class="flex flex-wrap items-center justify-between gap-[8px]">
          <div>
            <p class="text-[14px] font-medium">在线热门比熊科普话题</p>
            <p class="mt-[2px] text-[12px] text-zinc-500">
              {{ hotFetchedAt ? `最近抓取：${new Date(hotFetchedAt).toLocaleString()}` : '点击刷新抓取最新热点' }}
            </p>
          </div>
          <UiButton size="sm" variant="outline" :disabled="hotLoading" @click="loadHotTopics">
            {{ hotLoading ? '抓取中...' : '刷新热点' }}
          </UiButton>
        </div>

        <div v-if="hotTopics.length" class="grid gap-[8px] sm:grid-cols-2">
          <button
            v-for="item in hotTopics"
            :key="`${item.source}-${item.title}`"
            type="button"
            class="rounded-[10px] border border-zinc-200 bg-white p-[10px] text-left transition hover:border-zinc-300 hover:bg-zinc-50"
            @click="applyHotTopic(item)"
          >
            <p class="text-[13px] font-medium leading-[19px] text-zinc-900">{{ item.title }}</p>
            <p class="mt-[4px] text-[11px] text-zinc-500">{{ item.point }} · {{ item.source }}</p>
          </button>
        </div>
        <p v-else class="text-[12px] text-zinc-500">暂无在线热点，先用下方“一键采用今日话题”。</p>
      </UiCard>

      <UiCard class="space-y-[10px] p-[16px]">
        <div class="space-y-[8px]">
          <div>
            <p class="text-[14px] font-medium">今日知识点（{{ dateKey }}）</p>
            <p class="mt-[4px] text-[13px] text-zinc-600">{{ todayKnowledgePoint }}</p>
          </div>
          <UiButton class="w-full sm:w-auto" size="sm" variant="outline" @click="useTodayKnowledgePoint">一键采用今日话题</UiButton>
        </div>
        <p class="text-[12px] text-zinc-500">
          今日状态：{{ todayRecord?.sent ? '已发送' : hasPolishedToday ? '已调优待发送' : hasGeneratedToday ? '已生成待调优' : '未生成' }}
        </p>
      </UiCard>

      <UiCard class="space-y-[10px] p-[16px]">
        <UiInput v-model="petName" placeholder="宠物名字（固定）" />
        <UiInput v-model="articleTitle" placeholder="今日选题" />
        <UiInput v-model="dogProfile" placeholder="狗狗画像" />
        <UiInput v-model="audience" placeholder="目标读者" />
        <UiInput v-model="keyPoint" placeholder="核心知识点" />
        <UiInput v-model="scenario" placeholder="场景限定" />
        <UiInput v-model="evidenceNeed" placeholder="证据与结构要求" />
        <UiInput v-model="riskGuard" placeholder="风险边界" />
        <UiInput v-model="keywords" placeholder="关键词（逗号分隔）" />
      </UiCard>

      <UiCard class="space-y-[10px] p-[16px]">
        <div class="grid grid-cols-2 gap-[8px] sm:grid-cols-4">
          <UiButton class="w-full text-[13px]" :disabled="generating" @click="generateContent">
            {{ generating ? '生成中...' : '一键生成' }}
          </UiButton>
          <UiButton class="w-full text-[13px]" variant="outline" :disabled="polishing || !generated.trim()" @click="polishBeforeSend">
            {{ polishing ? '调优中...' : '二次调优' }}
          </UiButton>
          <UiButton class="w-full text-[13px]" variant="outline" :disabled="!finalContent.trim()" @click="copyContent">复制文案</UiButton>
          <UiButton class="w-full text-[13px]" variant="outline" :disabled="!finalContent.trim()" @click="markSent">标记发送</UiButton>
        </div>
        <textarea
          :value="polished || generated"
          rows="18"
          readonly
          placeholder="先生成，再点“发送前二次调优”，这里会显示最终可发版本。"
          class="w-full rounded-[10px] border border-zinc-200 bg-white p-[12px] text-[13px] leading-[21px] text-zinc-800"
        />
      </UiCard>

      <UiCard class="space-y-[8px] p-[16px]">
        <p class="text-[14px] font-medium">近14天发送记录</p>
        <div v-if="records.length" class="space-y-[8px]">
          <div
            v-for="item in records.slice(0, 14)"
            :key="item.id"
            class="rounded-[10px] border border-zinc-200 p-[10px]"
          >
            <p class="text-[12px] text-zinc-500">{{ item.dateKey }} · {{ item.sent ? '已发送' : '未发送' }}</p>
            <p class="mt-[3px] text-[13px] font-medium text-zinc-900">{{ item.topic }}</p>
            <p class="mt-[2px] text-[12px] text-zinc-600">{{ item.knowledgePoint }}</p>
          </div>
        </div>
        <p v-else class="text-[12px] text-zinc-500">暂无记录</p>
      </UiCard>
    </div>
  </main>
</template>
