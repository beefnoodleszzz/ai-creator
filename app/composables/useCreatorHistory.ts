import type { HistoryItem } from '~/types/creator'

const STORAGE_KEY = 'ai_creator_history_v1'
const MAX_HISTORY = 20
const syncInflight = new Map<string, Promise<void>>()

function dedupeKey(item: HistoryItem) {
  const minuteBucket = item.createdAt.slice(0, 16)
  return [item.platform, item.tone, item.topic, minuteBucket].join('|')
}

function mergeHistory(primary: HistoryItem[], secondary: HistoryItem[]) {
  const map = new Map<string, HistoryItem>()
  for (const item of [...primary, ...secondary]) {
    const key = dedupeKey(item)
    const existing = map.get(key)
    if (!existing) {
      map.set(key, item)
      continue
    }
    if (existing.createdAt < item.createdAt) {
      map.set(key, item)
    }
  }
  return Array.from(map.values())
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, MAX_HISTORY)
}

export function useCreatorHistory() {
  const history = useState<HistoryItem[]>('creator-history', () => [])

  function load() {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as HistoryItem[]
      if (Array.isArray(parsed)) {
        history.value = parsed
      }
    } catch {
      history.value = []
    }
  }

  async function syncFromCloud(deviceId?: string, headers?: Record<string, string>) {
    if (!import.meta.client || (!deviceId && !headers)) return

    const key = headers ? 'auth' : `device:${deviceId}`
    if (syncInflight.has(key)) {
      await syncInflight.get(key)
      return
    }

    const task = (async () => {
      try {
        const url = headers ? '/api/history' : `/api/history?deviceId=${encodeURIComponent(deviceId || '')}`
        const response = await fetch(url, { headers })
        if (!response.ok) return
        const data = await response.json() as { items?: HistoryItem[] }
        if (Array.isArray(data.items)) {
          const cloudFirst = headers
            ? mergeHistory(data.items, history.value)
            : mergeHistory(history.value, data.items)
          history.value = cloudFirst
          persist()
        }
      } catch {
        // ignore
      }
    })()

    syncInflight.set(key, task)
    try {
      await task
    } finally {
      syncInflight.delete(key)
    }
  }

  function persist() {
    if (!import.meta.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
  }

  async function add(item: Omit<HistoryItem, 'id' | 'createdAt'>, deviceId?: string, headers?: Record<string, string>) {
    const next: HistoryItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    history.value = [next, ...history.value].slice(0, MAX_HISTORY)
    persist()

    if (deviceId || headers) {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(headers || {}) },
        body: JSON.stringify({
          deviceId,
          platform: item.platform,
          tone: item.tone,
          goal: item.goal,
          safetyLevel: item.safetyLevel,
          qualityScore: item.qualityScore,
          qualityStructure: item.qualityStructure,
          qualityPublishability: item.qualityPublishability,
          qualityRepetition: item.qualityRepetition,
          industryName: item.industryName,
          sceneName: item.sceneName,
          topic: item.topic,
          content: item.content,
          structured: item.structured,
        }),
      }).catch(() => undefined)
    }
  }

  async function remove(id: string, deviceId?: string, headers?: Record<string, string>) {
    history.value = history.value.filter(item => item.id !== id)
    persist()
    if (deviceId || headers) {
      await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(headers || {}) },
        body: JSON.stringify({ deviceId, id }),
      }).catch(() => undefined)
    }
  }

  function clear() {
    history.value = []
    persist()
  }

  return {
    history,
    load,
    persist,
    syncFromCloud,
    add,
    remove,
    clear,
  }
}
