type TopicItem = {
  title: string
  source: string
  url: string
}

function decodeXml(input: string) {
  return input
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .trim()
}

function stripTitleNoise(text: string) {
  return text
    .replace(/\s*[-|｜_]\s*(知乎|小红书|抖音|今日头条|百度|哔哩哔哩|搜狐|网易|腾讯).*/i, '')
    .replace(/[【】[\]()（）]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksLikeUsefulTopic(text: string) {
  if (text.length < 6 || text.length > 60) return false
  const mustHave = /(比熊|狗狗|犬|宠物|养狗)/i.test(text)
  const useful = /(泪痕|喂养|训练|皮肤|耳朵|肠胃|掉毛|洗澡|刷牙|便便|疫苗|驱虫|过敏|焦虑|社交|绝育|幼犬|成犬|护理|科普|健康)/i.test(text)
  const bad = /(出售|领养|价格|多少钱|交易|广告|直播|下载|app|官网)/i.test(text)
  return mustHave && useful && !bad
}

function parseRssItems(xml: string, source: string) {
  const items: TopicItem[] = []
  const matches = xml.match(/<item>[\s\S]*?<\/item>/g) || []
  for (const item of matches) {
    const title = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1]
      || item.match(/<title>([\s\S]*?)<\/title>/)?.[1]
      || ''
    const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || ''
    const cleanTitle = stripTitleNoise(decodeXml(title))
    if (!looksLikeUsefulTopic(cleanTitle)) continue
    if (!link) continue
    items.push({ title: cleanTitle, source, url: decodeXml(link) })
  }
  return items
}

function normalizeTopic(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, '')
    .replace(/比熊犬/g, '比熊')
}

function inferPoint(title: string) {
  const map: Array<{ key: RegExp, point: string }> = [
    { key: /泪痕|眼/, point: '泪痕与眼周护理' },
    { key: /皮肤|洗澡|吹干|毛发|掉毛/, point: '皮肤与被毛护理' },
    { key: /肠胃|软便|便便|换粮|饮食|喂养/, point: '饮食与肠胃稳定' },
    { key: /刷牙|口腔|牙结石/, point: '口腔护理' },
    { key: /焦虑|乱叫|分离|情绪/, point: '情绪稳定与分离焦虑' },
    { key: /训练|召回|口令|社交/, point: '行为训练与社交' },
    { key: /耳|耳道/, point: '耳道清洁与感染预防' },
    { key: /疫苗|驱虫|绝育|就医/, point: '健康管理与就医边界' },
  ]
  return map.find(item => item.key.test(title))?.point || '比熊日常养护'
}

export default defineEventHandler(async () => {
  const queries = [
    '比熊 犬 科普',
    '比熊 泪痕 护理',
    '比熊 训练 喂养',
    '比熊 皮肤 肠胃',
  ]
  const urls = queries.map(q => `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&mkt=zh-CN`)

  const responses = await Promise.allSettled(urls.map(url => $fetch<string>(url, { responseType: 'text' })))
  const all: TopicItem[] = []
  responses.forEach((result, idx) => {
    if (result.status !== 'fulfilled') return
    all.push(...parseRssItems(result.value, `BingNews-${idx + 1}`))
  })

  const deduped = new Map<string, TopicItem>()
  let filteredOut = 0
  for (const item of all) {
    const key = normalizeTopic(item.title)
    if (!key) {
      filteredOut += 1
      continue
    }
    if (!deduped.has(key)) deduped.set(key, item)
  }

  let topics = Array.from(deduped.values())
    .slice(0, 30)
    .map(item => ({
      title: item.title,
      source: item.source,
      url: item.url,
      point: inferPoint(item.title),
    }))

  if (!topics.length) {
    const fallback = [
      '2026比熊泪痕怎么改善：先排查饮水饮食和眼周清洁',
      '比熊洗澡频率多久一次：洗后吹干标准与皮肤避坑',
      '比熊软便反复怎么办：换粮周期和便便观察清单',
      '比熊刷牙怎么训练不抗拒：7天口腔护理入门流程',
      '比熊分离焦虑怎么缓解：低刺激离家训练家庭版',
      '比熊耳朵多久清洁一次：耳道护理频率与就医边界',
      '比熊社交训练怎么做：识别压力信号避免“见狗就冲”',
      '比熊体重管理标准：BCS体况评分和喂食量微调方法',
      '比熊幼犬到成犬怎么过渡：作息与训练重点迁移',
      '梅雨季比熊皮肤护理：潮湿天气下的家庭洗护流程',
      '比熊掉毛突然变多：先看皮肤屏障还是饮食结构',
      '比熊泪痕反复擦不掉：眼周毛修剪的安全边界',
      '比熊挑食怎么办：建立稳定进食节奏的3步法',
      '比熊乱叫怎么纠正：不靠吼叫的低刺激行为干预',
      '比熊在家总啃咬：环境管理和替代啃咬策略',
    ]
    topics = fallback.map((title, index) => ({
      title,
      source: 'fallback',
      url: '',
      point: inferPoint(title),
      rank: index + 1,
    }))
  }

  return {
    fetchedAt: new Date().toISOString(),
    topics,
    debug: {
      queryCount: queries.length,
      fetchedItemCount: all.length,
      dedupedCount: deduped.size,
      filteredOut,
      usingFallback: topics[0]?.source === 'fallback',
    },
  }
})
