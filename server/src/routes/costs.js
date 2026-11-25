import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/costs — all item costs (read-only)
router.get('/', async (req, res, next) => {
  try {
    const rows = await query(`SELECT pn, description, supplier, abc, unit_cost_usd FROM item_costs ORDER BY pn`);
    res.json(rows.map(r => ({ ...r, unitCostUsd: Number(r.unit_cost_usd) })));
  } catch (err) { next(err); }
});

export default router;
