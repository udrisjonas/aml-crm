-- Document acknowledgment requirements: which roles/users must acknowledge each document
CREATE TABLE IF NOT EXISTS public.document_acknowledgment_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES compliance_documents(id) ON DELETE CASCADE,
  required_roles text[] NOT NULL DEFAULT '{}',
  specific_user_ids uuid[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id)
);

-- Actual acknowledgments by users
CREATE TABLE IF NOT EXISTS public.document_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES document_acknowledgment_requirements(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES compliance_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doc_ack_req_document ON document_acknowledgment_requirements(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_ack_user ON document_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_ack_document ON document_acknowledgments(document_id);

-- RLS
ALTER TABLE document_acknowledgment_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_ack_req" ON document_acknowledgment_requirements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_ack_req" ON document_acknowledgment_requirements
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_ack_req" ON document_acknowledgment_requirements
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "auth_read_ack" ON document_acknowledgments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_ack" ON document_acknowledgments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
