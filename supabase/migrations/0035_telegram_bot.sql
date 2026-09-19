-- ══════════════════════════════════════════════════════════════
-- Telegram Bot Integration — پرس‌کاد
-- ══════════════════════════════════════════════════════════════

-- ─── تنظیمات ربات تلگرام ───
CREATE TABLE IF NOT EXISTS telegram_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_token   TEXT NOT NULL,
  chat_id     TEXT NOT NULL,
  chat_title  TEXT DEFAULT '',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── لینک فرم‌ها به تلگرام ───
CREATE TABLE IF NOT EXISTS telegram_form_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id     UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  config_id   UUID NOT NULL REFERENCES telegram_config(id) ON DELETE CASCADE,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(form_id, config_id)
);

-- ─── لاگ ارسال‌ها ───
CREATE TABLE IF NOT EXISTS telegram_send_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id       UUID REFERENCES forms(id) ON DELETE SET NULL,
  response_id   UUID REFERENCES responses(id) ON DELETE SET NULL,
  config_id     UUID REFERENCES telegram_config(id) ON DELETE SET NULL,
  chat_id       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  message_text  TEXT,
  sent_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── RLS ───
ALTER TABLE telegram_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_form_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_send_log ENABLE ROW LEVEL SECURITY;

-- Admin/Owner policies for telegram_config
CREATE POLICY "telegram_config_admin_select" ON telegram_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_id IN ('admin') AND active = true
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_owner = true
    )
  );

CREATE POLICY "telegram_config_admin_insert" ON telegram_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_id IN ('admin') AND active = true
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_owner = true
    )
  );

CREATE POLICY "telegram_config_admin_update" ON telegram_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_id IN ('admin') AND active = true
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_owner = true
    )
  );

CREATE POLICY "telegram_config_admin_delete" ON telegram_config
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_id IN ('admin') AND active = true
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_owner = true
    )
  );

-- Admin/Owner policies for telegram_form_links
CREATE POLICY "telegram_form_links_admin_select" ON telegram_form_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_id IN ('admin') AND active = true
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_owner = true
    )
  );

CREATE POLICY "telegram_form_links_admin_insert" ON telegram_form_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_id IN ('admin') AND active = true
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_owner = true
    )
  );

CREATE POLICY "telegram_form_links_admin_delete" ON telegram_form_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_id IN ('admin') AND active = true
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_owner = true
    )
  );

-- Admin/Owner policies for telegram_send_log
CREATE POLICY "telegram_send_log_admin_select" ON telegram_send_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_id IN ('admin') AND active = true
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_owner = true
    )
  );

CREATE POLICY "telegram_send_log_admin_insert" ON telegram_send_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "telegram_send_log_service_insert" ON telegram_send_log
  FOR INSERT WITH CHECK (true);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_telegram_form_links_form_id ON telegram_form_links(form_id);
CREATE INDEX IF NOT EXISTS idx_telegram_form_links_config_id ON telegram_form_links(config_id);
CREATE INDEX IF NOT EXISTS idx_telegram_send_log_form_id ON telegram_send_log(form_id);
CREATE INDEX IF NOT EXISTS idx_telegram_send_log_sent_at ON telegram_send_log(sent_at DESC);
