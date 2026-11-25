import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

/**
 * Admin-only middleware.
 * In production with Easy Auth, the App Service can inject role claims
 * via x-ms-client-principal-claims. The MIGRATION_ADMINS env var holds
 * a comma-separated allowlist of user principal names (emails) permitted
 * to run migrations. Anyone else gets 403, even if authenticated.
 */
function adminOnly(req, res, next) {
  const adminList = (process.env.MIGRATION_ADMINS ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  if (adminList.length === 0) {
    return res.status(403).json({ error: 'Migração não configurada. Defina MIGRATION_ADMINS.' });
  }

  const userName = (req.user?.name ?? '').toLowerCase();
  if (!adminList.includes(userName)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem migrar dados.' });
  }
  next();
}

// Table name allowlist — never accept user-controlled table names in SQL
const TABLE_ALLOWLIST = new Set([
  'count_bases', 'count_items', 'count_plans', 'count_results',
  'count_history', 'item_costs', 'position_checks',
]);

/**
 * POST /api/migrate
 * Receives a JSON payload with all 7 tables' data exported from Supabase.
 * Preserves existing UUIDs by inserting them explicitly (not NEWID()).
 *
 * SAFE MODE (default): Only inserts rows that don't already exist by PK.
 * Does NOT overwrite existing data. This prevents accidental clobbering
 * of data already in Azure SQL that may have been modified after migration.
 *
 * Re-executable: running again is safe — existing rows are skipped.
 *
 * Body shape:
 * { bases: [], items: [], plans: [], results: [], history: [], costs: [], positionChecks: [] }
 */
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const { bases, items, plans, results, history, costs, positionChecks } = req.body;
    const summary = {};

    // 1. count_bases — insert-only (skip if PK exists)
    if (Array.isArray(bases)) {
      let inserted = 0;
      for (const r of bases) {
        const existing = await query(`SELECT 1 AS hit FROM count_bases WHERE id=@p0`, [r.id]);
        if (existing.recordset.length) continue;
        await query(`INSERT INTO count_bases (id, name) VALUES (@p0, @p1)`, [r.id, r.name]);
        inserted++;
      }
      summary.bases = inserted;
    }

    // 2. count_items
    if (Array.isArray(items)) {
      let inserted = 0;
      for (const r of items) {
        const existing = await query(`SELECT 1 AS hit FROM count_items WHERE id=@p0`, [r.id]);
        if (existing.recordset.length) continue;
        await query(`INSERT INTO count_items (id, base_id, sku, description, location, system_qty, abc_class, frequency, last_counted_at) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8)`,
          [r.id, r.base_id, r.sku, r.description ?? '', r.location ?? '', r.system_qty ?? 0, r.abc_class ?? null, r.frequency ?? null, r.last_counted_at ?? null]);
        inserted++;
      }
      summary.items = inserted;
    }

    // 3. count_plans
    if (Array.isArray(plans)) {
      let inserted = 0;
      for (const r of plans) {
        const existing = await query(`SELECT 1 AS hit FROM count_plans WHERE id=@p0`, [r.id]);
        if (existing.recordset.length) continue;
        await query(`INSERT INTO count_plans (id, base_id, item_id, scheduled_date, status, completed_at, operator_name) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6)`,
          [r.id, r.base_id, r.item_id ?? null, r.scheduled_date, r.status, r.completed_at ?? null, r.operator_name ?? '']);
        inserted++;
      }
      summary.plans = inserted;
    }

    // 4. count_results
    if (Array.isArray(results)) {
      let inserted = 0;
      for (const r of results) {
        const existing = await query(`SELECT 1 AS hit FROM count_results WHERE id=@p0`, [r.id]);
        if (existing.recordset.length) continue;
        await query(`INSERT INTO count_results (id, plan_id, item_id, system_qty, counted_qty, counted_at, qad_qty, adjustment, observation) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8)`,
          [r.id, r.plan_id, r.item_id, r.system_qty ?? 0, r.counted_qty, r.counted_at ?? new Date().toISOString(), r.qad_qty ?? null, r.adjustment ?? null, r.observation ?? null]);
        inserted++;
      }
      summary.results = inserted;
    }

    // 5. count_history
    if (Array.isArray(history)) {
      let inserted = 0;
      for (const r of history) {
        const existing = await query(`SELECT 1 AS hit FROM count_history WHERE id=@p0`, [r.id]);
        if (existing.recordset.length) continue;
        await query(`INSERT INTO count_history (id, source_line, count_date, pn, description, abc, system_mom, system_qad, counted_qty, variance_qad, variance_jfk, adjustment, status_note) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11,@p12)`,
          [r.id, r.source_line, r.count_date, r.pn, r.description ?? '', r.abc ?? null, r.system_mom, r.system_qad, r.counted_qty, r.variance_qad, r.variance_jfk, r.adjustment ?? null, r.status_note ?? null]);
        inserted++;
      }
      summary.history = inserted;
    }

    // 6. item_costs
    if (Array.isArray(costs)) {
      let inserted = 0;
      for (const r of costs) {
        const existing = await query(`SELECT 1 AS hit FROM item_costs WHERE pn=@p0`, [r.pn]);
        if (existing.recordset.length) continue;
        await query(`INSERT INTO item_costs (pn, description, supplier, abc, unit_cost_usd) VALUES (@p0,@p1,@p2,@p3,@p4)`,
          [r.pn, r.description, r.supplier ?? null, r.abc ?? null, r.unit_cost_usd]);
        inserted++;
      }
      summary.costs = inserted;
    }

    // 7. position_checks
    if (Array.isArray(positionChecks)) {
      let inserted = 0;
      for (const r of positionChecks) {
        const existing = await query(`SELECT 1 AS hit FROM position_checks WHERE id=@p0`, [r.id]);
        if (existing.recordset.length) continue;
        await query(`INSERT INTO position_checks (id, count_item_id, check_date, operator_name, locations_checked, locations_ok, locations_not_ok, occurrence, action_plan) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8)`,
          [r.id, r.count_item_id ?? null, r.check_date, r.operator_name, r.locations_checked, r.locations_ok, r.locations_not_ok, r.occurrence ?? null, r.action_plan ?? null]);
        inserted++;
      }
      summary.positionChecks = inserted;
    }

    // Validate counts using allowlist only
    const validations = {};
    for (const [table, inserted] of Object.entries(summary)) {
      if (!TABLE_ALLOWLIST.has(table)) continue;
      const r = await query(`SELECT COUNT(*) AS cnt FROM ${table}`);
      validations[table] = { inserted, totalNow: r.recordset[0].cnt };
    }

    res.json({ migrated: summary, validations });
  } catch (err) { next(err); }
});

// GET /api/migrate/validate — returns current row counts per table
router.get('/validate', adminOnly, async (req, res, next) => {
  try {
    const counts = {};
    for (const t of TABLE_ALLOWLIST) {
      const r = await query(`SELECT COUNT(*) AS cnt FROM ${t}`);
      counts[t] = r.recordset[0].cnt;
    }
    res.json(counts);
  } catch (err) { next(err); }
});

export default router;
