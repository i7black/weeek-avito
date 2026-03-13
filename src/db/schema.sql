-- Avito ↔ Weeek Integration Database Schema

-- Маппинг чатов Авито ↔ задач Weeek
CREATE TABLE IF NOT EXISTS chat_task_map (
  id            SERIAL PRIMARY KEY,
  avito_chat_id VARCHAR(255) NOT NULL UNIQUE,
  avito_user_id VARCHAR(255) NOT NULL,
  weeek_task_id INTEGER NOT NULL,
  item_id       VARCHAR(255),
  buyer_name    VARCHAR(255),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Лог обработанных звонков (дедупликация)
CREATE TABLE IF NOT EXISTS processed_calls (
  id            SERIAL PRIMARY KEY,
  call_id       VARCHAR(255) NOT NULL UNIQUE,
  call_time     TIMESTAMP NOT NULL,
  item_id       VARCHAR(255),
  buyer_phone   VARCHAR(64),
  seller_phone  VARCHAR(64),
  talk_duration INTEGER DEFAULT 0,
  weeek_task_id INTEGER,
  processed_at  TIMESTAMP DEFAULT NOW()
);

-- Лог отправленных ответов
CREATE TABLE IF NOT EXISTS sent_replies (
  id            SERIAL PRIMARY KEY,
  avito_chat_id VARCHAR(255) NOT NULL,
  message_text  TEXT NOT NULL,
  sent_by       VARCHAR(255),
  sent_at       TIMESTAMP DEFAULT NOW()
);

-- OAuth токены Авито (автообновление)
CREATE TABLE IF NOT EXISTS avito_tokens (
  id            SERIAL PRIMARY KEY,
  access_token  TEXT NOT NULL,
  expires_at    TIMESTAMP NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Лог webhook'ов (для дебага)
CREATE TABLE IF NOT EXISTS webhook_log (
  id            SERIAL PRIMARY KEY,
  payload       JSONB NOT NULL,
  processed     BOOLEAN DEFAULT FALSE,
  error         TEXT,
  received_at   TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_chat_task_map_chat_id ON chat_task_map(avito_chat_id);
CREATE INDEX IF NOT EXISTS idx_processed_calls_call_id ON processed_calls(call_id);
CREATE INDEX IF NOT EXISTS idx_webhook_log_processed ON webhook_log(processed);
