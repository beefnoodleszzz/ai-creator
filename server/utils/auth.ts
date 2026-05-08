import type { H3Event } from 'h3'
import { getUserByToken } from './authStore'

export function getBearerToken(event: H3Event) {
  const header = getHeader(event, 'authorization')
  if (!header) return ''
  if (!header.startsWith('Bearer ')) return ''
  return header.slice(7).trim()
}

export async function getAuthUser(event: H3Event) {
  const token = getBearerToken(event)
  if (!token) return null
  return await getUserByToken(token)
}
