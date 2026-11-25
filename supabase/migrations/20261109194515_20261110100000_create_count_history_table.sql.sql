/*
# Create count history table

1. New Tables
- `count_history`: one row per line of the historical count sheet (ciclico_historico.csv).
  - `id` (uuid, primary key)
  - `source_line` (integer, unique) - line number in the source file; makes re-imports update rows instead of duplicating them
  - `count_date` (date) - date of the count (the source file has no year; imported as 2026)
  - `pn` (text) - part number
  - `description` (text)
  - `abc` (text) - ABC class
  - `system_mom` (numeric) - balance in MOM
  - `system_qad` (numeric) - balance in QAD
  - `counted_qty` (numeric) - physical count
  - `variance_qad` (numeric) - physical vs QAD variance
  - `variance_jfk` (numeric) - physical vs JFK variance
  - `adjustment` (text) - adjusted OK/NOK
  - `status_note` (text) - status / observation
  - `created_at` (timestamptz)

2. Security
- Row level security is enabled.
- The app has no sign-in screen, so the anon and authenticated roles get full access (data is shared inside the operation), matching the other count tables.

3. Important notes
- New table only; no existing data is modified or removed.
- Re-running this migration is safe: all statements are idempotent.
*/

CREATE TABLE IF NOT EXISTS count_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_line integer NOT NULL UNIQUE,
  count_date date,
  pn text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  abc text,
  system_mom numeric,
  system_qad numeric,
  counted_qty numeric,
  variance_qad numeric,
  variance_jfk numeric,
  adjustment text,
  status_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE count_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON count_history TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_count_history" ON count_history;
CREATE POLICY "anon_select_count_history" ON count_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_count_history" ON count_history;
CREATE POLICY "anon_insert_count_history" ON count_history FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_count_history" ON count_history;
CREATE POLICY "anon_update_count_history" ON count_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_count_history" ON count_history;
CREATE POLICY "anon_delete_count_history" ON count_history FOR DELETE TO anon, authenticated USING (true);
