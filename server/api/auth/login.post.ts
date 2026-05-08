import { z } from 'zod'
import { createSession, findOrCreateUser, verifyLoginCode } from '../../utils/authStore'

const bodySchema = z.object({
  phone: z.string().regex(/^1\d{10}$/),
  code: z.string().length(6),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: '登录参数无效' })
  }

  const passed = await verifyLoginCode(parsed.data.phone, parsed.data.code)
  if (!passed) {
    throw createError({ statusCode: 400, statusMessage: '验证码无效或已过期' })
  }

  const user = await findOrCreateUser(parsed.data.phone)
  const token = await createSession(user.id)
  return {
    token,
    user: { id: user.id, phone: user.phone },
  }
})
