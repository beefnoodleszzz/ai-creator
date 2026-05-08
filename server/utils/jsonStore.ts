/**
 * 抽象存储层
 * 本地开发：使用 Nitro 内置 memory driver
 * Vercel 部署：使用 Vercel KV（Redis）
 */

function getStorage() {
  return useStorage('data:')
}

/**
 * 读取 JSON 数据
 */
export async function readJsonFile<T>(name: string, fallback: T): Promise<T> {
  const storage = getStorage()
  try {
    const raw = await storage.getItem<string>(name)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * 写入 JSON 数据
 */
export async function writeJsonFile<T>(name: string, data: T) {
  const storage = getStorage()
  await storage.setItem(name, JSON.stringify(data))
}
