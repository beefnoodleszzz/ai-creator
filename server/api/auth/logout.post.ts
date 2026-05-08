import { getBearerToken } from '../../utils/auth'
import { removeSession } from '../../utils/authStore'

export default defineEventHandler(async (event) => {
  const token = getBearerToken(event)
  if (token) {
    await removeSession(token)
  }
  return { ok: true }
})
