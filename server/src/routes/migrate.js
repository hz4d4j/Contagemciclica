import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

/**
 * POST /api/migrate
 * Receives a JSON payload with all 7 tables' data exported from Supabase.
 * Preserves existing UUIDs by inserting them explicitly (not NEWID()).
 * Validates row counts after insert and returns a summary.
 * Re-executable: existing rows are updated (MERGE) so re-running is safe.
 *
 * Body shape:
 * { bases: [], items: [], plans: [], results: [], history: [], costs: [], positionChecks: [] }
 */
router.post('/', async (req, res, next) => {
  try {
    const { bases, items, plans, results, history, costs, positionChecks } = req.body;
    const summary = {};

    // 1. count_bases
    if (Array.isArray(bases)) {
      for (const r of bases) {
        await query(`
          MERGE count_bases AS t USING (SELECT @p0 AS id) AS s ON t.id = s.id
          WHEN MATCHED THEN UPDATE SET name=@p1
          WHEN NOT MATCHED THEN INSERT (id, name) VALUES (@p0, @p1);
        `, [r.id, r.name]);
      }
      summary.bases = bases.length;
    }

    // 2. count_items
    if (Array.isArray(items)) {
      for (const r of items) {
        await query(`
          MERGE count_items AS t USING (SELECT @p0 AS id) AS s ON t.id = s.id
          WHEN MATCHED THEN UPDATE SET base_id=@p1, sku=@p2, description=@p3, location=@p4, system_qty=@p5, abc_class=@p6, frequency=@p7, last_counted_at=@p8
          WHEN NOT MATCHED THEN INSERT (id, base_id, sku, description, location, system_qty, abc_class, frequency, last_counted_at) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8);
        `, [r.id, r.base_id, r.sku, r.description ?? '', r.location ?? '', r.system_qty ?? 0, r.abc_class ?? null, r.frequency ?? null, r.last_counted_at ?? null]);
      }
      summary.items = items.length;
    }

    // 3. count_plans
    if (Array.isArray(plans)) {
      for (const r of plans) {
        await query(`
          MERGE count_plans AS t USING (SELECT @p0 AS id) AS s ON t.id = s.id
          WHEN MATCHED THEN UPDATE SET base_id=@p1, item_id=@p2, scheduled_date=@p3, status=@p4, completed_at=@p5, operator_name=@p6
          WHEN NOT MATCHED THEN INSERT (id, base_id, item_id, scheduled_date, status, completed_at, operator_name) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6);
        `, [r.id, r.base_id, r.item_id ?? null, r.scheduled_date, r.status, r.completed_at ?? null, r.operator_name ?? '']);
      }
      summary.plans = plans.length;
    }

    // 4. count_results
    if (Array.isArray(results)) {
      for (const r of results) {
        await query(`
          MERGE count_results AS t USING (SELECT @p0 AS id) AS s ON t.id = s.id
          WHEN MATCHED THEN UPDATE SET plan_id=@p1, item_id=@p2, system_qty=@p3, counted_qty=@p4, counted_at=@p5, qad_qty=@p6, adjustment=@p7, observation=@p8
          WHEN NOT MATCHED THEN INSERT (id, plan_id, item_id, system_qty, counted_qty, counted_at, qad_qty, adjustment, observation) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8);
        `, [r.id, r.plan_id, r.item_id, r.system_qty ?? 0, r.counted_qty, r.counted_at ?? new Date().toISOString(), r.qad_qty ?? null, r.adjustment ?? null, r.observation ?? null]);
      }
      summary.results = results.length;
    }

    // 5. count_history
    if (Array.isArray(history)) {
      for (const r of history) {
        await query(`
          MERGE count_history AS t USING (SELECT @p0 AS id) AS s ON t.id = s.id
          WHEN MATCHED THEN UPDATE SET source_line=@p1, count_date=@p2, pn=@p3, description=@p4, abc=@p5, system_mom=@p6, system_qad=@p7, counted_qty=@p8, variance_qad=@p9, variance_jfk=@p10, adjustment=@p11, status_note=@p12
          WHEN NOT MATCHED THEN INSERT (id, source_line, count_date, pn, description, abc, system_mom, system_qad, counted_qty, variance_qad, variance_jfk, adjustment, status_note) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11,@p12);
        `, [r.id, r.source_line, r.count_date, r.pn, r.description ?? '', r.abc ?? null, r.system_mom, r.system_qad, r.counted_qty, r.variance_qad, r.variance_jfk, r.adjustment ?? null, r.status_note ?? null]);
      }
      summary.history = history.length;
    }

    // 6. item_costs
    if (Array.isArray(costs)) {
      for (const r of costs) {
        await query(`
          MERGE item_costs AS t USING (SELECT @p0 AS pn) AS s ON t.pn = s.pn
          WHEN MATCHED THEN UPDATE SET description=@p1, supplier=@p2, abc=@p3, unit_cost_usd=@p4
          WHEN NOT MATCHED THEN INSERT (pn, description, supplier, abc, unit_cost_usd) VALUES (@p0,@p1,@p2,@p3,@p4);
        `, [r.pn, r.description, r.supplier ?? null, r.abc ?? null, r.unit_cost_usd]);
      }
      summary.costs = costs.length;
    }

    // 7. position_checks
    if (Array.isArray(positionChecks)) {
      for (const r of positionChecks) {
        await query(`
          MERGE position_checks AS t USING (SELECT @p0 AS id) AS s ON t.id = s.id
          WHEN MATCHED THEN UPDATE SET count_item_id=@p1, check_date=@p2, operator_name=@p3, locations_checked=@p4, locations_ok=@p5, locations_not_ok=@p6, occurrence=@p7, action_plan=@p8
          WHEN NOT MATCHED THEN INSERT (id, count_item_id, check_date, operator_name, locations_checked, locations_ok, locations_not_ok, occurrence, action_plan) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8);
        `, [r.id, r.count_item_id ?? null, r.check_date, r.operator_name, r.locations_checked, r.locations_ok, r.locations_not_ok, r.occurrence ?? null, r.action_plan ?? null]);
      }
      summary.positionChecks = positionChecks.length;
    }

    // Validate counts
    const validations = {};
    for (const [table, expected] of Object.entries(summary)) {
      const r = await query(`SELECT COUNT(*) AS cnt FROM ${table}`);
      validations[table] = { expected, actual: r.recordset[0].cnt, ok: r.recordset[0].cnt >= expected };
    }

    res.json({ migrated: summary, validations });
  } catch (err) { next(err); }
});

// GET /api/migrate/validate — returns current row counts per table
router.get('/validate', async (req, res, next) => {
  try {
    const tables = ['count_bases', 'count_items', 'count_plans', 'count_results', 'count_history', 'item_costs', 'position_checks'];
    const counts = {};
    for (const t of tables) {
      const r = await query(`SELECT COUNT(*) AS cnt FROM ${t}`);
      counts[t] = r.recordset[0].cnt;
    }
    res.json(counts);
  } catch (err) { next(err); }
});

export default router;
