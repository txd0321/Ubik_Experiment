import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { Pool } from 'pg'

const app = express()
const port = Number(process.env.PORT || 4000)

app.use(cors())
app.use(express.json({ limit: '1mb' }))

const enableDb = process.env.ENABLE_DB === 'true'
const pool = enableDb
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  : null

function genSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

app.get('/api/v1/health', (_req, res) => {
  res.json({ ok: true, service: 'ubik-experiment-backend' })
})

app.post('/api/v1/session/init', async (req, res) => {
  const sessionId = genSessionId()
  const clientTime = req.body?.clientTime ?? null

  if (pool) {
    await pool.query(
      `INSERT INTO participant_session (session_id, client_time, user_agent)
       VALUES ($1, $2, $3)`,
      [sessionId, clientTime, req.headers['user-agent'] ?? null],
    )
  }

  res.json({ sessionId })
})

app.post('/api/v1/events/batch', async (req, res) => {
  const events = Array.isArray(req.body?.events) ? req.body.events : []

  if (pool && events.length > 0) {
    const values = []
    const params = []

    events.forEach((ev, idx) => {
      const i = idx * 6
      values.push(`($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6})`)
      params.push(
        ev.session_id ?? null,
        ev.event_id ?? null,
        ev.event_name ?? null,
        ev.event_time ?? null,
        ev.step ?? null,
        JSON.stringify(ev.payload ?? {}),
      )
    })

    await pool.query(
      `INSERT INTO event_log (session_id, event_id, event_name, event_time, step, event_payload)
       VALUES ${values.join(',')}`,
      params,
    )
  }

  res.json({ ok: true, received: events.length })
})

app.post('/api/v1/experiment/submit', async (req, res) => {
  const { sessionId, totalDurationMs, practiceAnswer, formalAnswers, surveyData } = req.body ?? {}

  if (!sessionId) {
    res.status(400).json({ ok: false, message: 'sessionId is required' })
    return
  }

  if (pool) {
    await pool.query('BEGIN')
    try {
      if (practiceAnswer) {
        await pool.query(
          `INSERT INTO practice_answer
            (session_id, item_id, selected_option, is_correct, duration_ms)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            sessionId,
            practiceAnswer.itemId ?? null,
            practiceAnswer.selectedOptionId ?? null,
            practiceAnswer.isCorrect ?? null,
            practiceAnswer.durationMs ?? null,
          ],
        )
      }

      if (Array.isArray(formalAnswers) && formalAnswers.length > 0) {
        const values = []
        const params = []

        formalAnswers.forEach((ans, idx) => {
          const i = idx * 5
          values.push(`($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`)
          params.push(
            sessionId,
            ans.itemId ?? null,
            ans.selectedOptionId ?? null,
            ans.durationMs ?? null,
            ans.orderIndex ?? null,
          )
        })

        await pool.query(
          `INSERT INTO formal_answer
            (session_id, item_id, selected_option, duration_ms, order_index)
           VALUES ${values.join(',')}`,
          params,
        )
      }

      if (surveyData) {
        await pool.query(
          `INSERT INTO survey_response
            (session_id, hardest_question, judgment_basis, read_ubik_before, feedback_text, total_duration_ms)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            sessionId,
            surveyData.hardestQuestion ?? null,
            surveyData.judgmentBasis ?? null,
            surveyData.readUbikBefore ?? null,
            surveyData.feedback ?? null,
            totalDurationMs ?? null,
          ],
        )
      }

      await pool.query('COMMIT')
    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }
  }

  res.json({ ok: true })
})

app.use((err, _req, res, _next) => {
  console.error('[server-error]', err)
  res.status(500).json({ ok: false, message: 'internal server error' })
})

app.listen(port, () => {
  console.log(`backend is running at http://localhost:${port}`)
})
