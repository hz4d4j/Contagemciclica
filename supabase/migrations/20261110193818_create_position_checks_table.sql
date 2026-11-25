/*
# Create position checks table

1. New Tables
- `position_checks`: one row per position check session done by an operator, comparing the physical positioning of material with the MOM.
  - `id` (uuid, primary key)
  - `check_date` (date, not null) day the check was done
  - `operator_name` (text, not null) operator who did the check
  - `locations_checked` (integer, not null) locations verified
  - `locations_ok` (integer, not null) locations positioned as per MOM
  - `locations_not_ok` (integer, not null) locations not positioned as per MOM
  - `action_plan` (text) action plan, required when there are locations not OK
  - `created_at` (timestamp)

2. Security
- Enable RLS on `position_checks`.
- Grant SELECT and INSERT to `anon` and `authenticated` (the app has no sign-in and uses the anon key). No update or delete access.
- Policies allow select and insert for both roles.

3. Notes
- Check constraints guarantee that OK + not OK equals the number of locations checked.
- Check constraints guarantee that an action plan is written whenever a location is not OK.
- Re-running this migration is safe (IF NOT EXISTS and policies are dropped before being recreated).
*/

CREATE TABLE IF NOT EXISTS position_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_date date NOT NULL DEFAULT CURRENT_DATE,
  operator_name text NOT NULL,
  locations_checked integer NOT NULL CHECK (locations_checked > 0),
  locations_ok integer NOT NULL CHECK (locations_ok >= 0),
  locations_not_ok integer NOT NULL CHECK (locations_not_ok >= 0),
  action_plan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (locations_ok + locations_not_ok = locations_checked),
  CHECK (locations_not_ok = 0 OR length(trim(coalesce(action_plan, ''))) > 0)
);

ALTER TABLE position_checks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON position_checks TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_position_checks" ON position_checks;
CREATE POLICY "anon_select_position_checks" ON position_checks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_position_checks" ON position_checks;
CREATE POLICY "anon_insert_position_checks" ON position_checks FOR INSERT
  TO anon, authenticated WITH CHECK (true);
