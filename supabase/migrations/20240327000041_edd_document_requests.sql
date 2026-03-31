-- ═══════════════════════════════════════════════════════════════════════════
-- EDD document requests — AML officer specifies what docs client must upload
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists edd_document_requests (
  id                    uuid        primary key default gen_random_uuid(),
  edd_questionnaire_id  uuid        not null references edd_questionnaires(id) on delete cascade,
  document_name         text        not null,
  description           text,
  is_required           boolean     not null default true,
  sort_order            integer     not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists edd_document_requests_questionnaire_idx
  on edd_document_requests(edd_questionnaire_id);

alter table edd_document_requests enable row level security;
