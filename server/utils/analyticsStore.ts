import { appendFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const logDir = resolve(process.cwd(), '.data')
const logFile = resolve(logDir, 'analytics.ndjson')

export async function persistAnalyticsEvent(event: Record<string, unknown>) {
  await mkdir(logDir, { recursive: true })
  await appendFile(logFile, `${JSON.stringify(event)}\n`, 'utf-8')
}
