import { z } from 'zod'
import { getAuthUser } from '../../utils/auth'
import { bindDeviceHistoryToUser } from '../../utils/historyStore'

const bodySchema = z.object({
  deviceId: z.string().min(8).max(128),
})

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '未登录' })
  }
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'deviceId 无效' })
  }
  await bindDeviceHistoryToUser(parsed.data.deviceId, user.id)
  return { ok: true }
})
