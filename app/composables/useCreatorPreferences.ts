import type { CreatorGoal, CreatorPlatform, CreatorTone, HistoryItem } from '~/types/creator'

type PreferredCombo = {
  platform: CreatorPlatform
  tone: CreatorTone
  goal: CreatorGoal
  confidence: number
  sampleSize: number
}

const PREFERENCE_ENABLED_KEY = 'ai_creator_preference_learning_enabled_v1'
const PREFERENCE_CACHE_KEY = 'ai_creator_preference_cache_v1'

export function useCreatorPreferences() {
  const enabled = useState<boolean>('creator-preference-enabled', () => true)

  function loadEnabled() {
    if (!import.meta.client) return
    const raw = localStorage.getItem(PREFERENCE_ENABLED_KEY)
    enabled.value = raw !== '0'
  }

  function setEnabled(next: boolean) {
    enabled.value = next
    if (import.meta.client) {
      localStorage.setItem(PREFERENCE_ENABLED_KEY, next ? '1' : '0')
    }
  }

  function resetLearnedPreferences() {
    if (!import.meta.client) return
    localStorage.removeItem(PREFERENCE_CACHE_KEY)
  }

  function inferPreferredCombo(history: HistoryItem[]): PreferredCombo | null {
    if (!enabled.value || !history.length) return null

    const weightByTone = new Map<CreatorTone, number>()
    const weightByGoal = new Map<CreatorGoal, number>()
    const weightByPlatform = new Map<CreatorPlatform, number>()

    const latest = history.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 30)

    latest.forEach((item, idx) => {
      const recency = Math.max(1, 30 - idx)
      const quality = Math.max(1, item.qualityScore || 50)
      const score = recency * (quality / 50)

      weightByTone.set(item.tone, (weightByTone.get(item.tone) || 0) + score)
      const goal = item.goal || 'growth'
      weightByGoal.set(goal, (weightByGoal.get(goal) || 0) + score)
      weightByPlatform.set(item.platform, (weightByPlatform.get(item.platform) || 0) + score)
    })

    const pickMax = <T extends string>(map: Map<T, number>, fallback: T) =>
      Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || fallback

    const tone = pickMax(weightByTone, 'viral')
    const goal = pickMax(weightByGoal, 'growth')
    const platform = pickMax(weightByPlatform, 'xiaohongshu')
    const confidence = Math.min(100, Math.round((latest.length / 30) * 100))
    const combo = { platform, tone, goal, confidence, sampleSize: latest.length }
    if (import.meta.client) {
      localStorage.setItem(PREFERENCE_CACHE_KEY, JSON.stringify(combo))
    }
    return combo
  }

  return {
    enabled,
    loadEnabled,
    setEnabled,
    resetLearnedPreferences,
    inferPreferredCombo,
  }
}
