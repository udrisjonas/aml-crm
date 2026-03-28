-- Migration 000029: Notification dismissals

CREATE TABLE IF NOT EXISTS notification_dismissals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  reference_id      text NOT NULL,
  dismissed_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_type, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_dismissals_user ON notification_dismissals(user_id);

ALTER TABLE notification_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_dismissals_own" ON notification_dismissals;
CREATE POLICY "notification_dismissals_own"
  ON notification_dismissals FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
