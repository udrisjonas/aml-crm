-- Migration 000027: Add relationship_frequency and relationship_use to individual_details

ALTER TABLE individual_details
  ADD COLUMN IF NOT EXISTS relationship_frequency text,
  ADD COLUMN IF NOT EXISTS relationship_use        text;
