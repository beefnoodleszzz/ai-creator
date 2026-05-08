/**
 * 存储层
 * 本地开发：内存存储
 * Vercel 部署：Upstash Redis (通过 @upstash/redis)
 */

import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

function getRedis(): Redis | null {
  // 只在有环境变量时初始化（Vercel 环境）
  if (_redis) return _redis
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  _redis = new Redis({ url, token })
  return _redis
}

// 本地开发用的内存存储
const memoryStore = new Map<string, string>()

/**
 * 读取 JSON 数据
 */
export async function readJsonFile<T>(name: string, fallback: T): Promise<T> {
  const redis = getRedis()
  const key = `ai-creator:${name}`

  try {
    if (redis) {
      const raw = await redis.get<string>(key)
      if (raw === null || raw === undefined) return fallback
      // Upstash Redis 可能直接返回对象（已自动 JSON.parse）
      if (typeof raw === 'object') return raw as T
      return JSON.parse(raw) as T
    }

    // 本地 fallback
    const cached = memoryStore.get(key)
    if (!cached) return fallback
    return JSON.parse(cached) as T
  } catch {
    return fallback
  }
}

/**
 * 写入 JSON 数据
 */
export async function writeJsonFile<T>(name: string, data: T) {
  const redis = getRedis()
  const key = `ai-creator:${name}`

  try {
    if (redis) {
      await redis.set(key, JSON.stringify(data))
      return
    }

    // 本地 fallback
    memoryStore.set(key, JSON.stringify(data))
  } catch (error) {
    console.error(`[storage] write failed for ${name}:`, error)
  }
}
