import { Router } from 'express';
import { query, queryOne, sql } from '../db.js';

const router = Router();

// GET /api/plans?date=YYYY-MM-DD  — plans on a given date with nested item + result
router.get('/plans', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (date) {
      const rows = await query(`
        SELECT p.id, p.base_id, p.scheduled_date, p.status, p.completed_at, p.operator_name,
               i.id AS item_id, i.sku, i.description, i.abc_class, i.last_counted_at,
               r.system_qty, r.qad_qty, r.counted_qty, r.adjustment, r.observation
        FROM count_plans p
        LEFT JOIN count_items i ON p.item_id = i.id
        LEFT JOIN count_results r ON r.plan_id = p.id
        WHERE p.scheduled_date = @p0
        ORDER BY p.id
      `, [date]);
      return res.json(groupPlans(rows));
    }
    // GET /api/plans?year=YYYY&month=0-11 — plans in a given month (calendar view)
    const { year, month } = req.query;
    if (year && month !== undefined) {
      const m = Number(month) + 1;
      const first = `${year}-${String(m).padStart(2,'0')}-01`;
      const last = `${year}-${String(m).padStart(2,'0')}-31`;
      const rows = await query(`
        SELECT p.id, p.scheduled_date, p.status,
               i.id AS item_id, i.sku, i.description, i.abc_class
        FROM count_plans p
        LEFT JOIN count_items i ON p.item_id = i.id
        WHERE p.scheduled_date >= @p0 AND p.scheduled_date <= @p1
        ORDER BY p.scheduled_date, p.id
      `, [first, last]);
      return res.json(rows.map(r => ({
        id: r.id, scheduled_date: r.scheduled_date, status: r.status,
        count_items: r.item_id ? { id: r.item_id, sku: r.sku, description: r.description, abc_class: r.abc_class } : null,
      })));
    }
    res.status(400).json({ error: 'Informe date ou year+month.' });
  } catch (err) { next(err); }
});

// POST /api/plans/:id/complete — record count result and mark plan completed
router.post('/plans/:id/complete', async (req, res, next) => {
  try {
    const planId = req.params.id;
    const { itemId, momQty, qadQty, countedQty, adjustment, observation, operatorName } = req.body;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    // Upsert result (MERGE)
    await query(`
      MERGE count_results AS target
      USING (SELECT @p0 AS plan_id, @p1 AS item_id) AS source
      ON target.plan_id = source.plan_id AND target.item_id = source.item_id
      WHEN MATCHED THEN UPDATE SET
        system_qty = @p2, qad_qty = @p3, counted_qty = @p4,
        adjustment = @p5, observation = @p6, counted_at = @p7
      WHEN NOT MATCHED THEN INSERT (plan_id, item_id, system_qty, qad_qty, counted_qty, adjustment, observation, counted_at)
        VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7);
    `, [planId, itemId, momQty, qadQty, countedQty, adjustment ?? null, observation ?? null, now]);

    await query(`UPDATE count_plans SET status='completed', completed_at=@p0, operator_name=@p1 WHERE id=@p2`,
      [now, operatorName ?? '', planId]);
    await query(`UPDATE count_items SET last_counted_at=@p0 WHERE id=@p1`, [today, itemId]);

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PUT /api/plans/:id/item — change item of a pending plan
router.put('/plans/:id/item', async (req, res, next) => {
  try {
    const result = await query(`
      UPDATE count_plans SET item_id=@p0 WHERE id=@p1 AND status='pending';
      SELECT @@ROWCOUNT AS affected;
    `, [req.body.itemId, req.params.id]);
    if (result.recordset[0].affected === 0) {
      return res.status(409).json({ error: 'Esta contagem já foi concluída e não pode mais ser alterada.' });
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/plans/rebuild — delete pending plans and rebuild schedule
router.post('/plans/rebuild', async (req, res, next) => {
  try {
    const { scheduleRows } = req.body;
    if (!Array.isArray(scheduleRows)) return res.status(400).json({ error: 'scheduleRows inválido.' });

    // Delete existing pending plans per base
    const baseIds = [...new Set(scheduleRows.map(r => r.base_id))];
    for (const baseId of baseIds) {
      await query(`DELETE FROM count_plans WHERE base_id=@p0 AND status='pending'`, [baseId]);
    }

    // Insert new plans in chunks
    const CHUNK = 500;
    for (let i = 0; i < scheduleRows.length; i += CHUNK) {
      const chunk = scheduleRows.slice(i, i + CHUNK);
      const values = chunk.map((_, idx) =>
        `(@p${idx*3}, @p${idx*3+1}, @p${idx*3+2})`
      ).join(',');
      const params = chunk.flatMap(r => [r.base_id, r.item_id, r.scheduled_date]);
      await query(`INSERT INTO count_plans (base_id, item_id, scheduled_date, status) VALUES ${values}`,
        params.map(v => v));
      void values;
    }

    res.json({ scheduled: scheduleRows.length });
  } catch (err) { next(err); }
});

// GET /api/plans/completed — completed plans for history
router.get('/plans/completed', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT p.id, p.scheduled_date, p.completed_at, p.operator_name,
             i.sku, i.description, i.abc_class,
             r.system_qty, r.qad_qty, r.counted_qty, r.adjustment, r.observation
      FROM count_plans p
      LEFT JOIN count_items i ON p.item_id = i.id
      LEFT JOIN count_results r ON r.plan_id = p.id
      WHERE p.status = 'completed'
      ORDER BY p.completed_at DESC, p.id
    `);
    res.json(rows.map(r => ({
      id: r.id, scheduled_date: r.scheduled_date, completed_at: r.completed_at,
      operator_name: r.operator_name,
      count_items: { sku: r.sku, description: r.description, abc_class: r.abc_class },
      count_results: r.system_qty !== null ? [{ system_qty: r.system_qty, qad_qty: r.qad_qty, counted_qty: r.counted_qty, adjustment: r.adjustment, observation: r.observation }] : [],
    })));
  } catch (err) { next(err); }
});

// PUT /api/plans/:id/result — update result of a completed plan (history edit)
router.put('/plans/:id/result', async (req, res, next) => {
  try {
    const { date, systemMom, systemQad, countedQty, adjustment, statusNote } = req.body;
    const completedAt = new Date(`${date}T12:00:00Z`).toISOString();
    await query(`UPDATE count_plans SET completed_at=@p0 WHERE id=@p1`, [completedAt, req.params.id]);
    await query(`UPDATE count_results SET system_qty=@p0, qad_qty=@p1, counted_qty=@p2, adjustment=@p3, observation=@p4 WHERE plan_id=@p5`,
      [systemMom, systemQad, countedQty, adjustment ?? null, statusNote ?? null, req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

function groupPlans(rows) {
  return rows.map(r => ({
    id: r.id,
    base_id: r.base_id,
    scheduled_date: r.scheduled_date,
    status: r.status,
    count_items: r.item_id ? {
      id: r.item_id, sku: r.sku, description: r.description,
      abc_class: r.abc_class, last_counted_at: r.last_counted_at,
    } : null,
    count_results: r.system_qty !== null ? [{
      system_qty: r.system_qty, qad_qty: r.qad_qty, counted_qty: r.counted_qty,
      adjustment: r.adjustment, observation: r.observation,
    }] : [],
  }));
}

export default router;
