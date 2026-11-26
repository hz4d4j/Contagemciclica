import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/costs — all item costs (read-only)
router.get('/', async (req, res, next) => {
  try {
    const rows = await query(`SELECT pn, description, supplier, abc, unit_cost_usd FROM item_costs ORDER BY pn`);
    res.json(rows.recordset.map(r => ({ ...r, unitCostUsd: Number(r.unit_cost_usd) })));
  } catch (err) { next(err); }
});

router.post('/bulk', async (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'Lista de custos inválida.' });
    for (const row of rows) {
      if (!row.pn || !Number.isFinite(row.unit_cost_usd) || row.unit_cost_usd < 0) return res.status(400).json({ error: 'Custo inválido.' });
      await query(`UPDATE item_costs SET description=@p0, supplier=@p1, abc=@p2, unit_cost_usd=@p3 WHERE pn=@p4;
        IF @@ROWCOUNT = 0 INSERT INTO item_costs (description,supplier,abc,unit_cost_usd,pn) VALUES (@p0,@p1,@p2,@p3,@p4)`,
        [row.description, row.supplier || null, row.abc || null, row.unit_cost_usd, row.pn]);
    }
    res.json({ count: rows.length });
  } catch (err) { next(err); }
});

export default router;
