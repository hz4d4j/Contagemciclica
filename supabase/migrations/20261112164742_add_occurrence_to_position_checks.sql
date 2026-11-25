/*
# Add detected occurrence to position checks

1. Modified Tables
- `position_checks`
  - New column `occurrence` (text, nullable) describing the occurrence detected during the position check.

2. Notes
- Existing rows keep a null value.
- Re-running this migration is safe (IF NOT EXISTS).
*/

ALTER TABLE position_checks
  ADD COLUMN IF NOT EXISTS occurrence text;
