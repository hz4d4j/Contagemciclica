/*
# Add QAD quantity, adjustment and observation to count results

1. Modified Tables
- `count_results`
  - `qad_qty` (numeric, nullable): quantity recorded in the QAD system at the time of the count.
  - `adjustment` (text, nullable): whether the stock was adjusted, 'OK' or 'NOK'.
  - `observation` (text, nullable): free-text note from the operator.
  - Adds a unique rule on (plan_id, item_id) so a count can be saved again without creating duplicates.

2. Security
- No policy or grant changes. The existing anon and authenticated access on this table still applies.

3. Important notes
- Only columns and a unique index are added. No existing data is removed or changed.
- Re-running this migration is safe: every statement uses IF NOT EXISTS or a guarded check.
- In count_results, `system_qty` holds the MOM balance and `counted_qty` holds the physical count.
*/

ALTER TABLE count_results ADD COLUMN IF NOT EXISTS qad_qty numeric;
ALTER TABLE count_results ADD COLUMN IF NOT EXISTS adjustment text;
ALTER TABLE count_results ADD COLUMN IF NOT EXISTS observation text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'count_results_adjustment_check'
  ) THEN
    ALTER TABLE count_results ADD CONSTRAINT count_results_adjustment_check
      CHECK (adjustment IS NULL OR adjustment IN ('OK', 'NOK'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS count_results_plan_item_key ON count_results (plan_id, item_id);
