const DEVICE_KEY = 'ai_creator_device_id_v1'

export function useDeviceId() {
  const deviceId = useState<string>('device-id', () => '')

  function ensureDeviceId() {
    if (!import.meta.client) return ''
    if (deviceId.value) return deviceId.value

    const cached = localStorage.getItem(DEVICE_KEY)
    if (cached) {
      deviceId.value = cached
      return cached
    }

    const next = crypto.randomUUID()
    deviceId.value = next
    localStorage.setItem(DEVICE_KEY, next)
    return next
  }

  return {
    deviceId,
    ensureDeviceId,
  }
}
