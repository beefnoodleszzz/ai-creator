import { z } from 'zod'
import { issueLoginCode } from '../../utils/authStore'

const bodySchema = z.object({
  phone: z.string().regex(/^1\d{10}$/),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: '手机号格式无效' })
  }
  const code = await issueLoginCode(parsed.data.phone)
  return { ok: true, devCode: code }
})
