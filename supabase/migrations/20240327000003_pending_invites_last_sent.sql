-- Add last_sent_at to track when the invite was most recently sent/resent.
-- Used for the 24h expiry window — resending resets the window.
alter table public.pending_invites
  add column last_sent_at timestamptz;
