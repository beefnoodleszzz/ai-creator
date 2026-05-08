import { readJsonFile, writeJsonFile } from './jsonStore'

const ANALYTICS_FILE = 'analytics.json'
const MAX_EVENTS = 10000

export async function persistAnalyticsEvent(event: Record<string, unknown>) {
  const events = await readJsonFile<Record<string, unknown>[]>(ANALYTICS_FILE, [])
  events.push(event)
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS)
  }
  await writeJsonFile(ANALYTICS_FILE, events)
}

export async function getAnalyticsEvents(): Promise<Record<string, unknown>[]> {
  return await readJsonFile<Record<string, unknown>[]>(ANALYTICS_FILE, [])
}
