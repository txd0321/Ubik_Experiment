CREATE TABLE IF NOT EXISTS participant_session (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(64) UNIQUE NOT NULL,
  client_time TIMESTAMPTZ NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS practice_answer (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  item_id VARCHAR(100) NULL,
  selected_option VARCHAR(20) NULL,
  is_correct BOOLEAN NULL,
  duration_ms INTEGER NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS formal_answer (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  item_id VARCHAR(100) NULL,
  selected_option VARCHAR(20) NULL,
  duration_ms INTEGER NULL,
  order_index INTEGER NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS survey_response (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  hardest_question VARCHAR(20) NULL,
  judgment_basis VARCHAR(100) NULL,
  read_ubik_before VARCHAR(20) NULL,
  feedback_text TEXT NULL,
  total_duration_ms INTEGER NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_log (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(64) NULL,
  event_id VARCHAR(64) NULL,
  event_name VARCHAR(100) NULL,
  event_time TIMESTAMPTZ NULL,
  step VARCHAR(30) NULL,
  event_payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_log_session_id ON event_log(session_id);
CREATE INDEX IF NOT EXISTS idx_formal_answer_session_id ON formal_answer(session_id);
CREATE INDEX IF NOT EXISTS idx_survey_response_session_id ON survey_response(session_id);
