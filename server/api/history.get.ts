import { z } from 'zod'
import { listHistoryByDevice, listHistoryByUser } from '../utils/historyStore'
import { getAuthUser } from '../utils/auth'

const querySchema = z.object({
  deviceId: z.string().min(8).max(128),
})

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (user) {
    const list = await listHistoryByUser(user.id)
    return { items: list }
  }

  const query = getQuery(event)
  const parsed = querySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'deviceId 无效' })
  }

  const list = await listHistoryByDevice(parsed.data.deviceId)
  return { items: list }
})
