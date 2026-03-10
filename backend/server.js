import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import COS from 'cos-nodejs-sdk-v5'

dotenv.config()

const app = express()
app.use(express.json({ limit: '2mb' }))

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '*')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error('CORS_NOT_ALLOWED'))
    },
  }),
)

const PORT = Number(process.env.PORT ?? 3001)
const COS_BUCKET = (process.env.COS_BUCKET ?? '').trim()
const COS_REGION = (process.env.COS_REGION ?? '').trim()
const COS_SECRET_ID = (process.env.COS_SECRET_ID ?? '').trim()
const COS_SECRET_KEY = (process.env.COS_SECRET_KEY ?? '').trim()
const COS_TMP_TOKEN = (process.env.COS_TMP_TOKEN ?? '').trim()
const COS_PRESIGN_EXPIRES = Number(process.env.COS_PRESIGN_EXPIRES ?? 1800) || 1800

const canPresign = Boolean(COS_BUCKET && COS_REGION && COS_SECRET_ID && COS_SECRET_KEY)
const cosClient = canPresign
  ? new COS({
      SecretId: COS_SECRET_ID,
      SecretKey: COS_SECRET_KEY,
      XCosSecurityToken: COS_TMP_TOKEN || undefined,
    })
  : null

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

function createStaticFallbackUrl(key) {
  const baseName = key.includes('/') ? key.split('/').pop() ?? key : key
  if (key.startsWith('textures/')) {
    return `/assets/textures/${encodeURIComponent(baseName)}`
  }
  return `/assets/models/${encodeURIComponent(baseName)}`
}

function isAllowedObjectKey(key) {
  return key.startsWith('models/') || key.startsWith('textures/')
}

app.get('/api/v1/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/v1/session/init', (_req, res) => {
  res.json({ sessionId: uid() })
})

app.post('/api/v1/events/batch', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/v1/experiment/submit', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/v1/models/presign', (req, res) => {
  const key = String(req.query.key ?? '').trim()
  if (!key) {
    return res.status(400).json({ message: 'Missing key' })
  }

  const safeKey = key.replace(/^\/+/, '')
  if (!isAllowedObjectKey(safeKey)) {
    return res.status(400).json({ message: 'Invalid key' })
  }

  if (!cosClient || !canPresign) {
    return res.json({
      url: createStaticFallbackUrl(safeKey),
      source: 'static_fallback',
    })
  }

  cosClient.getObjectUrl(
    {
      Bucket: COS_BUCKET,
      Region: COS_REGION,
      Key: safeKey,
      Expires: COS_PRESIGN_EXPIRES,
      Sign: true,
    },
    (err, data) => {
      if (err || !data?.Url) {
        return res.status(500).json({ message: 'COS_GET_OBJECT_URL_FAILED' })
      }
      return res.json({
        url: data.Url,
        source: 'cos_presigned',
      })
    },
  )
})

app.get('/api/v1/assets/presign', (req, res) => {
  const key = String(req.query.key ?? '').trim()
  if (!key) {
    return res.status(400).json({ message: 'Missing key' })
  }

  const safeKey = key.replace(/^\/+/, '')
  if (!isAllowedObjectKey(safeKey)) {
    return res.status(400).json({ message: 'Invalid key' })
  }

  if (!cosClient || !canPresign) {
    return res.json({
      url: createStaticFallbackUrl(safeKey),
      source: 'static_fallback',
    })
  }

  cosClient.getObjectUrl(
    {
      Bucket: COS_BUCKET,
      Region: COS_REGION,
      Key: safeKey,
      Expires: COS_PRESIGN_EXPIRES,
      Sign: true,
    },
    (err, data) => {
      if (err || !data?.Url) {
        return res.status(500).json({ message: 'COS_GET_OBJECT_URL_FAILED' })
      }
      return res.json({
        url: data.Url,
        source: 'cos_presigned',
      })
    },
  )
})

app.get('/api/v1/assets/proxy', (req, res) => {
  const key = String(req.query.key ?? '').trim()
  if (!key) {
    return res.status(400).json({ message: 'Missing key' })
  }
  const safeKey = key.replace(/^\/+/, '')
  if (!isAllowedObjectKey(safeKey)) {
    return res.status(400).json({ message: 'Invalid key' })
  }

  if (!cosClient || !canPresign) {
    return res.redirect(302, createStaticFallbackUrl(safeKey))
  }

  cosClient.getObjectUrl(
    {
      Bucket: COS_BUCKET,
      Region: COS_REGION,
      Key: safeKey,
      Expires: COS_PRESIGN_EXPIRES,
      Sign: true,
    },
    (err, data) => {
      if (err || !data?.Url) {
        return res.status(500).json({ message: 'COS_GET_OBJECT_URL_FAILED' })
      }
      return res.redirect(302, data.Url)
    },
  )
})

app.listen(PORT, () => {
  console.log(`Ubik backend listening on :${PORT}`)
})
