import { readJsonFile, writeJsonFile } from './jsonStore'

export interface CloudHistoryItem {
  id: string
  createdAt: string
  deviceId: string
  userId?: string
  platform: 'xiaohongshu' | 'douyin'
  tone: 'viral' | 'professional' | 'chatty'
  goal?: 'growth' | 'engagement' | 'conversion' | 'branding'
  safetyLevel?: 'safe' | 'warn' | 'block'
  qualityScore?: number
  qualityStructure?: number
  qualityPublishability?: number
  qualityRepetition?: number
  industryName?: string
  sceneName?: string
  topic: string
  content: string
  /** 结构化内容 */
  structured?: {
    titles: string[]
    cover: string
    body: string
    tags: string[]
    firstComments: string[]
    meta?: string
  }
}

const HISTORY_FILE = 'history.json'
const MAX_PER_DEVICE = 50

function dedupeKey(item: CloudHistoryItem) {
  const minuteBucket = item.createdAt.slice(0, 16)
  return [item.userId || '', item.platform, item.tone, item.topic, minuteBucket].join('|')
}

function dedupeHistory(items: CloudHistoryItem[]) {
  const map = new Map<string, CloudHistoryItem>()
  for (const item of items) {
    const key = dedupeKey(item)
    const existing = map.get(key)
    if (!existing || existing.createdAt < item.createdAt) {
      map.set(key, item)
    }
  }
  return Array.from(map.values())
}

export async function listHistoryByDevice(deviceId: string) {
  const all = await readJsonFile<CloudHistoryItem[]>(HISTORY_FILE, [])
  return all
    .filter(item => item.deviceId === deviceId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, MAX_PER_DEVICE)
}

export async function listHistoryByUser(userId: string) {
  const all = await readJsonFile<CloudHistoryItem[]>(HISTORY_FILE, [])
  return all
    .filter(item => item.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, MAX_PER_DEVICE)
}

export async function addHistory(item: CloudHistoryItem) {
  const all = await readJsonFile<CloudHistoryItem[]>(HISTORY_FILE, [])
  const next = dedupeHistory([item, ...all])
  await writeJsonFile(HISTORY_FILE, next.slice(0, 5000))
}

export async function removeHistory(deviceId: string, id: string) {
  const all = await readJsonFile<CloudHistoryItem[]>(HISTORY_FILE, [])
  const next = all.filter(item => !(item.deviceId === deviceId && item.id === id))
  await writeJsonFile(HISTORY_FILE, next)
}

export async function removeHistoryByUser(userId: string, id: string) {
  const all = await readJsonFile<CloudHistoryItem[]>(HISTORY_FILE, [])
  const next = all.filter(item => !(item.userId === userId && item.id === id))
  await writeJsonFile(HISTORY_FILE, next)
}

export async function bindDeviceHistoryToUser(deviceId: string, userId: string) {
  const all = await readJsonFile<CloudHistoryItem[]>(HISTORY_FILE, [])
  const next = dedupeHistory(all.map(item => item.deviceId === deviceId ? { ...item, userId } : item))
  await writeJsonFile(HISTORY_FILE, next)
}
