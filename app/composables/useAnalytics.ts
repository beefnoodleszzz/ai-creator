type EventName =
  | 'step_change'
  | 'generate_start'
  | 'generate_success'
  | 'generate_error'
  | 'history_open'

const ANALYTICS_KEY = 'ai_creator_analytics_v1'
const SESSION_KEY = 'ai_creator_session_v1'

export function useAnalytics() {
  function getSessionId() {
    if (!import.meta.client) return 'server'
    const existing = localStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const next = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, next)
    return next
  }

  async function track(event: EventName, payload: Record<string, unknown> = {}) {
    const data = {
      event,
      payload,
      at: new Date().toISOString(),
    }

    if (!import.meta.client) return

    try {
      const raw = localStorage.getItem(ANALYTICS_KEY)
      const list = raw ? JSON.parse(raw) as unknown[] : []
      const next = [...list.slice(-199), data]
      localStorage.setItem(ANALYTICS_KEY, JSON.stringify(next))
    } catch {
      // ignore analytics errors
    }

    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          payload,
          sessionId: getSessionId(),
          path: window.location.pathname,
          ts: data.at,
        }),
      })
    } catch {
      // ignore upload failures
    }
  }

  return { track }
}
