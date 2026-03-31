-- Add archived_at to profiles for proper user archiving
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS archived_at timestamptz;
