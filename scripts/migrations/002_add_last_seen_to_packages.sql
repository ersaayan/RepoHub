-- Add last_seen_at to track soft-deletion by sync scope
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Backfill existing rows so they are not immediately purged until their next scoped sync
UPDATE packages SET last_seen_at = NOW() WHERE last_seen_at IS NULL;

-- Helpful index for prune queries
CREATE INDEX IF NOT EXISTS idx_packages_seen_scope
  ON packages (platform_id, repository, is_active, last_seen_at);
