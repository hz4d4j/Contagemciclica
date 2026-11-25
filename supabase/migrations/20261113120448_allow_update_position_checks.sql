/*
# Allow editing position checks

1. Security
- Grant UPDATE on `position_checks` to `anon` and `authenticated` (the app has no sign-in and uses the anon key, same as the other count tables).
- Add an UPDATE policy so saved checks can be corrected, including the PN they refer to.
- Column constraints (OK + not OK = checked, action plan required when not OK) still apply on update.

2. Notes
- Re-running this migration is safe (policy is dropped before being recreated).
*/

GRANT UPDATE ON position_checks TO anon, authenticated;

DROP POLICY IF EXISTS "anon_update_position_checks" ON position_checks;
CREATE POLICY "anon_update_position_checks" ON position_checks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
