-- ═══════════════════════════════════════════════════════════════════════════
-- EDD document review fields + link to document request
-- Run after 20240327000041_edd_document_requests.sql
-- ═══════════════════════════════════════════════════════════════════════════

alter table edd_documents
  add column if not exists request_id              uuid        references edd_document_requests(id),
  add column if not exists review_status           text
    check (review_status in ('pending','accepted','rejected')),
  add column if not exists review_notes            text,
  add column if not exists review_rejection_reason text
    check (review_rejection_reason in ('irrelevant','unreadable','not_legalized','insufficient','other')),
  add column if not exists reviewed_by             uuid        references profiles(id),
  add column if not exists reviewed_at             timestamptz;
