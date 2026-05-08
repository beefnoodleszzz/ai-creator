import { readJsonFile, writeJsonFile } from './jsonStore'

interface User {
  id: string
  phone: string
  createdAt: string
}

interface Session {
  token: string
  userId: string
  createdAt: string
  expiresAt?: number
}

interface CodeRecord {
  phone: string
  code: string
  expiresAt: number
}

const USERS_FILE = 'users.json'
const SESSIONS_FILE = 'sessions.json'
const CODES_FILE = 'login-codes.json'
const SESSION_TTL_MS = 7 * 24 * 60 * 60_000

function nextExpiresAt() {
  return Date.now() + SESSION_TTL_MS
}

function isSessionExpired(session: Session) {
  const fallback = Date.parse(session.createdAt) + SESSION_TTL_MS
  const expiresAt = typeof session.expiresAt === 'number' ? session.expiresAt : fallback
  return expiresAt <= Date.now()
}

export async function issueLoginCode(phone: string) {
  const codes = await readJsonFile<CodeRecord[]>(CODES_FILE, [])
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const next = [
    { phone, code, expiresAt: Date.now() + 5 * 60_000 },
    ...codes.filter(item => item.phone !== phone),
  ].slice(0, 500)
  await writeJsonFile(CODES_FILE, next)
  return code
}

export async function verifyLoginCode(phone: string, code: string) {
  const codes = await readJsonFile<CodeRecord[]>(CODES_FILE, [])
  const matched = codes.find(item => item.phone === phone && item.code === code && item.expiresAt > Date.now())
  if (!matched) return false
  await writeJsonFile(CODES_FILE, codes.filter(item => !(item.phone === phone && item.code === code)))
  return true
}

export async function findOrCreateUser(phone: string) {
  const users = await readJsonFile<User[]>(USERS_FILE, [])
  const existing = users.find(item => item.phone === phone)
  if (existing) return existing
  const created: User = { id: crypto.randomUUID(), phone, createdAt: new Date().toISOString() }
  await writeJsonFile(USERS_FILE, [created, ...users].slice(0, 5000))
  return created
}

export async function createSession(userId: string) {
  const sessions = await readJsonFile<Session[]>(SESSIONS_FILE, [])
  const token = crypto.randomUUID()
  const created: Session = { token, userId, createdAt: new Date().toISOString(), expiresAt: nextExpiresAt() }
  await writeJsonFile(SESSIONS_FILE, [created, ...sessions.filter(item => item.userId !== userId)].slice(0, 5000))
  return token
}

export async function getUserByToken(token: string) {
  const sessions = await readJsonFile<Session[]>(SESSIONS_FILE, [])
  const alive = sessions.filter(item => !isSessionExpired(item))
  if (alive.length !== sessions.length) {
    await writeJsonFile(SESSIONS_FILE, alive)
  }
  const session = alive.find(item => item.token === token)
  if (!session) return null
  session.expiresAt = nextExpiresAt()
  await writeJsonFile(SESSIONS_FILE, alive)
  const users = await readJsonFile<User[]>(USERS_FILE, [])
  return users.find(item => item.id === session.userId) || null
}

export async function removeSession(token: string) {
  const sessions = await readJsonFile<Session[]>(SESSIONS_FILE, [])
  await writeJsonFile(SESSIONS_FILE, sessions.filter(item => item.token !== token))
}
