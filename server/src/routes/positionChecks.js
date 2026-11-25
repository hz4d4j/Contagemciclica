import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/position-checks — list with optional PN join
router.get('/', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT pc.id, pc.count_item_id, pc.check_date, pc.operator_name,
             pc.locations_checked, pc.locations_ok, pc.locations_not_ok,
             pc.occurrence, pc.action_plan,
             i.sku, i.description
      FROM position_checks pc
      LEFT JOIN count_items i ON pc.count_item_id = i.id
      ORDER BY pc.check_date DESC, pc.created_at DESC
      OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY
    `);
    res.json(rows.map(r => ({
      id: r.id, count_item_id: r.count_item_id, check_date: r.check_date,
      operator_name: r.operator_name, locations_checked: r.locations_checked,
      locations_ok: r.locations_ok, locations_not_ok: r.locations_not_ok,
      occurrence: r.occurrence, action_plan: r.action_plan,
      count_items: r.sku ? { sku: r.sku, description: r.description } : null,
    })));
  } catch (err) { next(err); }
});

// POST /api/position-checks
router.post('/', async (req, res, next) => {
  try {
    const c = req.body;
    await query(`
      INSERT INTO position_checks (count_item_id, check_date, operator_name, locations_checked, locations_ok, locations_not_ok, occurrence, action_plan)
      VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7)
    `, [c.countItemId ?? null, c.checkDate, c.operatorName, c.locationsChecked, c.locationsOk, c.locationsNotOk, c.occurrence ?? null, c.locationsNotOk > 0 ? c.actionPlan : null]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PUT /api/position-checks/:id
router.put('/:id', async (req, res, next) => {
  try {
    const c = req.body;
    await query(`
      UPDATE position_checks SET
        count_item_id=@p0, check_date=@p1, operator_name=@p2,
        locations_checked=@p3, locations_ok=@p4, locations_not_ok=@p5,
        occurrence=@p6, action_plan=@p7
      WHERE id=@p8
    `, [c.countItemId ?? null, c.checkDate, c.operatorName, c.locationsChecked, c.locationsOk, c.locationsNotOk, c.occurrence ?? null, c.locationsNotOk > 0 ? c.actionPlan : null, req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
