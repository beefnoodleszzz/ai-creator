export type CreatorPlatform = 'xiaohongshu' | 'douyin'
export type CreatorTone = 'viral' | 'professional' | 'chatty'
export type CreatorGoal = 'growth' | 'engagement' | 'conversion' | 'branding'
export type CreatorStatus = 'idle' | 'generating' | 'finished' | 'error'
export type CreatorStep = 'platform' | 'industry' | 'tone' | 'result'

export interface Industry {
  id: string
  name: string
  icon: string
  scenes: Scene[]
}

export interface Scene {
  id: string
  name: string
  description: string
  topic: string
}

export interface CreatorState {
  step: CreatorStep
  platform: CreatorPlatform
  industry?: Industry
  scene?: Scene
  tone: CreatorTone
  status: CreatorStatus
  content: string
}

export interface PromptTemplate {
  id: string
  name: string
  prompt: string
}

export interface HistoryItem {
  id: string
  createdAt: string
  platform: CreatorPlatform
  tone: CreatorTone
  goal?: CreatorGoal
  safetyLevel?: 'safe' | 'warn' | 'block'
  qualityScore?: number
  qualityStructure?: number
  qualityPublishability?: number
  qualityRepetition?: number
  industryName?: string
  sceneName?: string
  topic: string
  content: string
  /** 结构化内容（新版本） */
  structured?: StructuredContent
}

export interface StructuredContent {
  titles: string[]
  cover: string
  body: string
  tags: string[]
  firstComments: string[]
  meta?: string
}

export const industries: Industry[] = [
  {
    id: 'food',
    name: '美食探店',
    icon: '🍜',
    scenes: [
      { id: 'restaurant', name: '网红店打卡', description: '咖啡店/餐厅探店', topic: '新开的网红咖啡店，环境超好出片' },
      { id: 'recipe', name: '懒人食谱', description: '简单易学家常菜', topic: '10分钟搞定的懒人晚餐，好吃到舔盘子' },
      { id: 'food-review', name: '零食测评', description: '便利店/外卖测评', topic: '便利店隐藏美食测评，第三款真的绝了' },
      { id: 'street-food', name: '街边小吃', description: '路边摊/夜市美食', topic: '公司楼下5块钱的煎饼，吃了3年没腻' },
    ]
  },
  {
    id: 'beauty',
    name: '美妆护肤',
    icon: '💄',
    scenes: [
      { id: 'makeup', name: '日常妆容', description: '通勤/约会妆容', topic: '新手也能学会的伪素颜妆，5分钟出门' },
      { id: 'skincare', name: '护肤分享', description: '护肤经验/好物', topic: '熬夜党急救护肤，第二天依然发光' },
      { id: 'product', name: '产品红黑榜', description: '真实测评', topic: '百元内平价彩妆，学生党闭眼入' },
      { id: 'hair', name: '发型教程', description: '编发/造型', topic: '3个显脸小的发型，圆脸必看' },
    ]
  },
  {
    id: 'fashion',
    name: '穿搭分享',
    icon: '👗',
    scenes: [
      { id: 'ootd', name: '今日穿搭', description: '日常OOTD', topic: '秋冬通勤穿搭，气质又保暖' },
      { id: 'style', name: '穿搭技巧', description: '显高显瘦技巧', topic: '小个子女生显高穿搭，秒变170' },
      { id: 'haul', name: '购物分享', description: '新衣服开箱', topic: '双十一战利品开箱，这波不亏' },
      { id: 'budget', name: '平价穿搭', description: '百元穿搭', topic: '全身不超过200块，也能穿出高级感' },
    ]
  },
  {
    id: 'travel',
    name: '旅行出游',
    icon: '✈️',
    scenes: [
      { id: 'guide', name: '旅行攻略', description: '目的地攻略', topic: '三亚5天4晚深度游，避开人挤人' },
      { id: 'hotel', name: '住宿体验', description: '酒店/民宿', topic: '这家海景民宿太绝了，拍照超出片' },
      { id: 'weekend', name: '周末游', description: '周边短途', topic: '说走就走的周末短途，治愈疲惫' },
      { id: 'cheap', name: '穷游攻略', description: '省钱旅行', topic: '1000块玩转一座城市，学生党穷游' },
    ]
  },
  {
    id: 'fitness',
    name: '运动健身',
    icon: '💪',
    scenes: [
      { id: 'workout', name: '健身教程', description: '居家/健身房', topic: '居家15分钟燃脂，不伤膝盖' },
      { id: 'diet', name: '饮食管理', description: '减脂餐/增肌餐', topic: '一周减脂餐食谱，好吃不饿还能瘦' },
      { id: 'yoga', name: '瑜伽拉伸', description: '拉伸放松', topic: '睡前10分钟拉伸，改善睡眠' },
      { id: 'run', name: '跑步记录', description: '跑步打卡', topic: '从跑不动到5公里，我的跑步日记' },
    ]
  },
  {
    id: 'career',
    name: '职场成长',
    icon: '💼',
    scenes: [
      { id: 'interview', name: '面试技巧', description: '面试准备', topic: '面试自我介绍公式，HR听了直接过' },
      { id: 'skill', name: '职场干货', description: '工作技巧', topic: '新人入职第一周，做好这5件事' },
      { id: 'side', name: '副业赚钱', description: '副业/自媒体', topic: '上班族下班后能做的3个副业' },
      { id: 'emotion', name: '职场情绪', description: '职场感悟', topic: '工作3年才明白的职场真相' },
    ]
  },
  {
    id: 'home',
    name: '家居生活',
    icon: '🏠',
    scenes: [
      { id: 'decor', name: '房间布置', description: '软装/收纳', topic: '小户型收纳神器，空间瞬间翻倍' },
      { id: '改造', name: '房间改造', description: '出租屋改造', topic: '500块改造出租屋，房东看了都想住' },
      { id: 'smart', name: '智能家居', description: '智能好物', topic: '这些智能家居好物，用过就回不去了' },
      { id: 'clean', name: '清洁技巧', description: '家务妙招', topic: '3个清洁小妙招，家里干净到发光' },
    ]
  },
  {
    id: 'parenting',
    name: '亲子育儿',
    icon: '👶',
    scenes: [
      { id: 'baby', name: '育儿经验', description: '育儿知识', topic: '新手妈妈必看，0-3个月宝宝护理' },
      { id: 'food', name: '宝宝辅食', description: '辅食制作', topic: '8月龄宝宝辅食，营养又好吃' },
      { id: 'play', name: '亲子游戏', description: '亲子互动', topic: '在家也能早教，10个亲子小游戏' },
      { id: 'product', name: '母婴好物', description: '好物推荐', topic: '这些母婴好物让我带娃轻松一半' },
    ]
  },
]

export const tones: Array<{ value: CreatorTone, label: string, desc: string, emoji: string }> = [
  { value: 'viral', label: '吸睛爆款', desc: '强钩子、快节奏、高互动', emoji: '🔥' },
  { value: 'professional', label: '干货专业', desc: '有结构、有深度、可信赖', emoji: '🧠' },
  { value: 'chatty', label: '闺蜜聊天', desc: '亲切自然、生活感、真实', emoji: '🍵' },
]

export const promptTemplates: PromptTemplate[] = [
  { id: 'store-traffic', name: '门店引流', prompt: '加入门店名和地址锚点，目标是引导用户到店，结尾给出评论区互动问题。' },
  { id: 'conversion', name: '转化导向', prompt: '聚焦转化，强化痛点-方案-结果结构，加入明确行动引导和限时感。' },
  { id: 'authentic', name: '真实踩坑', prompt: '加入真实踩坑经历和可量化细节，保留1-2个小缺点，降低广告感。' },
]

export const goals: Array<{ value: CreatorGoal, label: string, desc: string, emoji: string }> = [
  { value: 'growth', label: '涨粉', desc: '强化吸引力与关注动机', emoji: '📈' },
  { value: 'engagement', label: '互动', desc: '提升评论、收藏与讨论', emoji: '💬' },
  { value: 'conversion', label: '转化', desc: '突出行动引导与决策触发', emoji: '🎯' },
  { value: 'branding', label: '种草', desc: '建立信任与品牌感知', emoji: '🌱' },
]
