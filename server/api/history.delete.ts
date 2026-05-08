import { z } from 'zod'
import { removeHistory, removeHistoryByUser } from '../utils/historyStore'
import { getAuthUser } from '../utils/auth'

const bodySchema = z.object({
  deviceId: z.string().min(8).max(128),
  id: z.string().min(8).max(128),
})

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: '删除参数无效' })
  }

  if (user) {
    await removeHistoryByUser(user.id, parsed.data.id)
    return { ok: true }
  }

  await removeHistory(parsed.data.deviceId, parsed.data.id)
  return { ok: true }
})
