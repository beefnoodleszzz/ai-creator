type AuthUser = {
  id: string
  phone: string
}

const TOKEN_KEY = 'ai_creator_auth_token'
let refreshMePending: Promise<boolean> | null = null
let refreshMeAt = 0

export function useAuth() {
  const token = useState<string>('auth-token', () => '')
  const user = useState<AuthUser | null>('auth-user', () => null)

  function authHeaders() {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  function loadToken() {
    if (!import.meta.client) return
    const cached = localStorage.getItem(TOKEN_KEY)
    if (cached) token.value = cached
  }

  async function refreshMe() {
    if (!token.value) return false
    const now = Date.now()
    if (refreshMePending) return refreshMePending
    if (user.value && now - refreshMeAt < 30_000) return true

    refreshMePending = (async () => {
      const response = await fetch('/api/auth/me', { headers: { ...authHeaders() } }).catch(() => null)
      if (!response) return false
      if (!response.ok) {
        if (response.status !== 401) return false
        token.value = ''
        user.value = null
        if (import.meta.client) localStorage.removeItem(TOKEN_KEY)
        return false
      }
      const data = await response.json() as { user: AuthUser }
      user.value = data.user
      refreshMeAt = Date.now()
      return true
    })()

    try {
      return await refreshMePending
    } finally {
      refreshMePending = null
    }
  }

  async function sendCode(phone: string) {
    const response = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    if (!response.ok) throw new Error('验证码发送失败')
    return await response.json() as { ok: boolean, devCode?: string }
  }

  async function login(phone: string, code: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    })
    if (!response.ok) throw new Error('登录失败')
    const data = await response.json() as { token: string, user: AuthUser }
    token.value = data.token
    user.value = data.user
    if (import.meta.client) localStorage.setItem(TOKEN_KEY, data.token)
    return data
  }

  async function logout() {
    if (token.value) {
      await fetch('/api/auth/logout', { method: 'POST', headers: { ...authHeaders() } }).catch(() => undefined)
    }
    token.value = ''
    user.value = null
    if (import.meta.client) localStorage.removeItem(TOKEN_KEY)
  }

  return {
    token,
    user,
    authHeaders,
    loadToken,
    refreshMe,
    sendCode,
    login,
    logout,
  }
}
