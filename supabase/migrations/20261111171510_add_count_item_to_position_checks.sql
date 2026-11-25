/*
# Link position checks to counted items

1. Modified Tables
- `position_checks`
  - New column `count_item_id` (uuid, nullable) pointing to the PN in `count_items` that was checked in the cycle count panel.
  - Existing rows keep a null value, meaning the check was done for the whole area and not for a single PN.

2. Notes
- Foreign key uses ON DELETE SET NULL so a check is never removed when an item is removed from the schedule.
- No existing data, policies or grants are changed; the anon and authenticated roles keep SELECT and INSERT.
- Re-running this migration is safe (IF NOT EXISTS).
*/

ALTER TABLE position_checks
  ADD COLUMN IF NOT EXISTS count_item_id uuid REFERENCES count_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS position_checks_count_item_id_idx ON position_checks (count_item_id);
