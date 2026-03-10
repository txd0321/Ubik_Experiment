// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore cos-js-sdk-v5 may not ship stable type declarations in this setup
import COS from 'cos-js-sdk-v5'

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

const COS_BUCKET = (import.meta.env.VITE_TENCENT_COS_BUCKET as string | undefined)?.trim() ?? ''
const COS_REGION = (import.meta.env.VITE_TENCENT_COS_REGION as string | undefined)?.trim() ?? ''
const COS_TMP_SECRET_ID = (import.meta.env.VITE_TENCENT_COS_TMP_SECRET_ID as string | undefined)?.trim() ?? ''
const COS_TMP_SECRET_KEY = (import.meta.env.VITE_TENCENT_COS_TMP_SECRET_KEY as string | undefined)?.trim() ?? ''
const COS_TMP_TOKEN = (import.meta.env.VITE_TENCENT_COS_TMP_TOKEN as string | undefined)?.trim() ?? ''
const COS_URL_EXPIRES_SECONDS =
  Number((import.meta.env.VITE_TENCENT_COS_PRESIGN_EXPIRES as string | undefined) ?? 1800) || 1800

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

let cosClient: COS | null = null

function getCosClient(): COS | null {
  if (!COS_BUCKET || !COS_REGION || !COS_TMP_SECRET_ID || !COS_TMP_SECRET_KEY) {
    return null
  }
  if (!cosClient) {
    cosClient = new COS({
      SecretId: COS_TMP_SECRET_ID,
      SecretKey: COS_TMP_SECRET_KEY,
      XCosSecurityToken: COS_TMP_TOKEN || undefined,
    })
  }
  return cosClient
}

/**
 * 获取模型的下载地址。
 *
 * - 优先使用前端通过腾讯云 COS JS SDK 现场生成的预签名链接（有效期约 30 分钟）。
 * - 如未配置 COS 相关环境变量，则回退到站点静态资源路径 /assets/models/<文件名>。
 *
 * key 一般为 COS 对象键，例如: "models/itr_01_1930_spray_bedroom_opt.glb".
 */
export async function getModelDownloadUrl(key: string): Promise<string> {
  const cos = getCosClient()
  if (cos && COS_BUCKET && COS_REGION) {
    const url = await new Promise<string>((resolve, reject) => {
      cos.getObjectUrl(
        {
          Bucket: COS_BUCKET,
          Region: COS_REGION,
          Key: key,
          Expires: COS_URL_EXPIRES_SECONDS,
          Sign: true,
        },
        (err: unknown, data: { Url?: string } | undefined) => {
          if (err || !data?.Url) {
            reject(err ?? new Error('COS_GET_OBJECT_URL_FAILED'))
          } else {
            resolve(data.Url)
          }
        },
      )
    })

    return url
  }

  const baseName = key.includes('/') ? key.split('/').pop() ?? key : key
  return `/assets/models/${encodeURIComponent(baseName)}`
}
