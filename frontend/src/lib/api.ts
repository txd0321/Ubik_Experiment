export type Step = 'welcome' | 'tutorial' | 'practice' | 'formal' | 'survey'

export type EventPayload = {
  event_id: string
  event_name: string
  event_time: string
  step: Step
  session_id: string
  page_url: string
  payload?: Record<string, unknown>
}

export type SubmitPayload = {
  sessionId: string
  userId: string
  totalDurationMs: number
  practiceAnswer: unknown
  formalAnswers: unknown[]
  surveyData: unknown
  surveyQuestionDurationsMs: Record<string, number>
  eventBufferLength: number
  /** Per-question telemetry including screenshots (optional for backend). */
  formalInteractionRecords?: unknown[]
  /** Movement trajectory: roomOrigin, roomSize, points, skippedTimestamps, postSubmitSamples (optional). */
  movementTrajectory?: {
    roomOrigin: [number, number, number]
    roomSize: [number, number, number]
    points: number[][]
    skippedTimestamps?: number[]
    postSubmitSamples?: Array<{ afterQuestionIndex: number; point: number[] }>
  }
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? ''

async function safeJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP_${response.status}`)
  }
  return (await response.json()) as T
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return safeJson<T>(response)
}

async function mockInitSession() {
  await new Promise((r) => setTimeout(r, 160))
  return { sessionId: uid() }
}

async function mockBatchEvents(_events: EventPayload[]) {
  await new Promise((r) => setTimeout(r, 120))
  return { ok: true }
}

async function mockSubmitAll(_data: SubmitPayload) {
  await new Promise((r) => setTimeout(r, 600))
  return { ok: true }
}

export async function initSession(userId?: string) {
  if (!API_BASE) {
    return mockInitSession()
  }
  try {
    return await postJson<{ sessionId: string }>('/api/v1/session/init', {
      clientTime: new Date().toISOString(),
      userId: userId ?? null,
    })
  } catch {
    return mockInitSession()
  }
}

export async function batchEvents(events: EventPayload[]) {
  if (!API_BASE) {
    return mockBatchEvents(events)
  }
  try {
    return await postJson<{ ok: boolean }>('/api/v1/events/batch', { events })
  } catch {
    return mockBatchEvents(events)
  }
}

export async function submitExperiment(payload: SubmitPayload) {
  if (!API_BASE) {
    return mockSubmitAll(payload)
  }
  try {
    return await postJson<{ ok: boolean }>('/api/v1/experiment/submit', payload)
  } catch {
    return mockSubmitAll(payload)
  }
}
