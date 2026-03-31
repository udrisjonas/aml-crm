-- ═══════════════════════════════════════════════════════════════════════════
-- EDD (Enhanced Due Diligence) flow
-- Triggered automatically when client pep_status = 'yes'
-- ═══════════════════════════════════════════════════════════════════════════

-- ── edd_questionnaires ────────────────────────────────────────────────────────
create table if not exists edd_questionnaires (
  id                          uuid        primary key default gen_random_uuid(),
  client_id                   uuid        not null references clients(id) on delete cascade,
  token                       text        unique not null default gen_random_uuid()::text,
  status                      text        not null default 'triggered'
    check (status in ('triggered','sent_to_client','client_completed','under_review','completed','escalated')),
  triggered_reason            text        not null default 'pep',
  sent_at                     timestamptz,
  client_completed_at         timestamptz,
  aml_officer_reviewed_at     timestamptz,
  aml_officer_user_id         uuid        references auth.users(id),
  aml_officer_notes           text,
  aml_officer_recommendation  text
    check (aml_officer_recommendation in ('approve','escalate','reject') or aml_officer_recommendation is null),
  senior_manager_reviewed_at  timestamptz,
  senior_manager_user_id      uuid        references auth.users(id),
  senior_manager_notes        text,
  senior_manager_decision     text
    check (senior_manager_decision in ('approved','rejected') or senior_manager_decision is null),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists edd_questionnaires_client_id_idx on edd_questionnaires(client_id);
create index if not exists edd_questionnaires_token_idx     on edd_questionnaires(token);

-- ── edd_responses ─────────────────────────────────────────────────────────────
create table if not exists edd_responses (
  id                      uuid  primary key default gen_random_uuid(),
  edd_questionnaire_id    uuid  not null references edd_questionnaires(id) on delete cascade,
  question_key            text  not null,
  answer                  text,
  created_at              timestamptz not null default now(),
  unique (edd_questionnaire_id, question_key)
);

create index if not exists edd_responses_questionnaire_idx on edd_responses(edd_questionnaire_id);

-- ── edd_documents ─────────────────────────────────────────────────────────────
create table if not exists edd_documents (
  id                    uuid        primary key default gen_random_uuid(),
  edd_questionnaire_id  uuid        not null references edd_questionnaires(id) on delete cascade,
  client_id             uuid        not null references clients(id) on delete cascade,
  file_name             text        not null,
  file_path             text        not null,
  file_size             bigint,
  mime_type             text,
  document_type         text        not null default 'edd_document',
  uploaded_by_type      text        not null default 'client',
  created_at            timestamptz not null default now()
);

create index if not exists edd_documents_questionnaire_idx on edd_documents(edd_questionnaire_id);
create index if not exists edd_documents_client_id_idx     on edd_documents(client_id);

-- ── Row-level security ────────────────────────────────────────────────────────
-- All access goes through server actions using service-role (admin) client,
-- which bypasses RLS. Enable RLS to prevent accidental direct access.

alter table edd_questionnaires enable row level security;
alter table edd_responses       enable row level security;
alter table edd_documents       enable row level security;
