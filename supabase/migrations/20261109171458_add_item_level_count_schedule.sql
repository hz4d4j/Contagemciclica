/*
# Item-level count schedule

1. Modified Tables
- `count_items`
  - `abc_class` (text, 'A', 'B' or 'C'): ABC classification of the item. Nullable.
  - `frequency` (text): count frequency from the source spreadsheet (Semanal, Quinzenal, Mensal). Nullable.
  - `last_counted_at` (date): date of the most recent completed count. Nullable, empty for items never counted.
- `count_plans`
  - `item_id` (uuid, references count_items): the item scheduled for counting on that day. Nullable so existing base-level rows stay valid.

2. Security
- No policy or grant changes. The existing anon and authenticated access on these tables still applies.

3. Important notes
- Only columns are added. No data is removed or changed.
- Re-running this migration is safe: every statement uses IF NOT EXISTS.
*/

ALTER TABLE count_items ADD COLUMN IF NOT EXISTS abc_class text;
ALTER TABLE count_items ADD COLUMN IF NOT EXISTS frequency text;
ALTER TABLE count_items ADD COLUMN IF NOT EXISTS last_counted_at date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'count_items_abc_class_check'
  ) THEN
    ALTER TABLE count_items ADD CONSTRAINT count_items_abc_class_check
      CHECK (abc_class IS NULL OR abc_class IN ('A', 'B', 'C'));
  END IF;
END $$;

ALTER TABLE count_plans ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES count_items(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS count_plans_item_id_idx ON count_plans (item_id);
