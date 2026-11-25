/*
# Create cycle count tables

1. New Tables
- `count_bases`: one row per warehouse base (each sheet of the imported Excel file).
  - `id` (uuid, primary key)
  - `name` (text, unique) - base name taken from the Excel sheet
  - `created_at` (timestamptz)
- `count_items`: items (SKUs) belonging to a base, with the system balance.
  - `id` (uuid, primary key)
  - `base_id` (uuid, references count_bases, cascades on delete)
  - `sku` (text) - item code
  - `description` (text)
  - `location` (text)
  - `system_qty` (numeric) - balance expected by the system
  - `created_at` (timestamptz)
  - Unique per base + sku so re-importing the same file updates rows instead of duplicating them.
- `count_plans`: one scheduled count of a base on a given day (the cycle count calendar).
  - `id` (uuid, primary key)
  - `base_id` (uuid, references count_bases)
  - `scheduled_date` (date)
  - `status` (text): 'pending' or 'completed'
  - `completed_at` (timestamptz)
  - `operator_name` (text) - who performed the count
- `count_results`: the quantity counted for each item during a plan.
  - `id` (uuid, primary key)
  - `plan_id` (uuid, references count_plans)
  - `item_id` (uuid, references count_items)
  - `system_qty` (numeric) - snapshot of the system balance at count time
  - `counted_qty` (numeric) - quantity typed by the operator
  - `counted_at` (timestamptz)
  - Unique per plan + item.

2. Security
- Row level security is enabled on all four tables.
- The app has no sign-in screen, so the anon and authenticated roles get full access to these tables (data is shared inside the operation).

3. Important notes
- No existing data is modified or removed.
- Re-running this migration is safe: all statements are idempotent.
*/

CREATE TABLE IF NOT EXISTS count_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS count_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id uuid NOT NULL REFERENCES count_bases(id) ON DELETE CASCADE,
  sku text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  system_qty numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT count_items_base_sku_key UNIQUE (base_id, sku)
);

CREATE TABLE IF NOT EXISTS count_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id uuid NOT NULL REFERENCES count_bases(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_at timestamptz,
  operator_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS count_plans_scheduled_date_idx ON count_plans (scheduled_date);

CREATE TABLE IF NOT EXISTS count_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES count_plans(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES count_items(id) ON DELETE CASCADE,
  system_qty numeric NOT NULL DEFAULT 0,
  counted_qty numeric NOT NULL,
  counted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT count_results_plan_item_key UNIQUE (plan_id, item_id)
);

ALTER TABLE count_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_results ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON count_bases TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON count_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON count_plans TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON count_results TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_count_bases" ON count_bases;
CREATE POLICY "anon_select_count_bases" ON count_bases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_count_bases" ON count_bases;
CREATE POLICY "anon_insert_count_bases" ON count_bases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_count_bases" ON count_bases;
CREATE POLICY "anon_update_count_bases" ON count_bases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_count_bases" ON count_bases;
CREATE POLICY "anon_delete_count_bases" ON count_bases FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_count_items" ON count_items;
CREATE POLICY "anon_select_count_items" ON count_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_count_items" ON count_items;
CREATE POLICY "anon_insert_count_items" ON count_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_count_items" ON count_items;
CREATE POLICY "anon_update_count_items" ON count_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_count_items" ON count_items;
CREATE POLICY "anon_delete_count_items" ON count_items FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_count_plans" ON count_plans;
CREATE POLICY "anon_select_count_plans" ON count_plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_count_plans" ON count_plans;
CREATE POLICY "anon_insert_count_plans" ON count_plans FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_count_plans" ON count_plans;
CREATE POLICY "anon_update_count_plans" ON count_plans FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_count_plans" ON count_plans;
CREATE POLICY "anon_delete_count_plans" ON count_plans FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_count_results" ON count_results;
CREATE POLICY "anon_select_count_results" ON count_results FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_count_results" ON count_results;
CREATE POLICY "anon_insert_count_results" ON count_results FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_count_results" ON count_results;
CREATE POLICY "anon_update_count_results" ON count_results FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_count_results" ON count_results;
CREATE POLICY "anon_delete_count_results" ON count_results FOR DELETE TO anon, authenticated USING (true);
