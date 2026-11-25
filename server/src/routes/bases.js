import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/bases
router.get('/', async (req, res, next) => {
  try {
    const rows = await query(`SELECT id, name FROM count_bases ORDER BY name`);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/bases/:id/items
router.get('/:id/items', async (req, res, next) => {
  try {
    const rows = await query(`SELECT id, sku, description, abc_class FROM count_items WHERE base_id=@p0 ORDER BY sku`,
      [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/items — all count items (for position check PN dropdown)
router.get('/items', async (req, res, next) => {
  try {
    const rows = await query(`SELECT id, sku, description FROM count_items ORDER BY sku`);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/bases/import — upsert bases and items from Excel
router.post('/import', async (req, res, next) => {
  try {
    const { bases } = req.body;
    if (!Array.isArray(bases)) return res.status(400).json({ error: 'bases inválido.' });
    let itemCount = 0;
    for (const base of bases) {
      // Upsert base
      const existing = await query(`SELECT id FROM count_bases WHERE name=@p0`, [base.name]);
      let baseId;
      if (existing.recordset.length) {
        baseId = existing.recordset[0].id;
      } else {
        const r = await query(`INSERT INTO count_bases (name) OUTPUT INSERTED.id VALUES (@p0)`, [base.name]);
        baseId = r.recordset[0].id;
      }

      // Upsert items
      for (const item of base.items) {
        const itemExists = await query(`SELECT id FROM count_items WHERE base_id=@p0 AND sku=@p1`, [baseId, item.sku]);
        if (itemExists.recordset.length) {
          await query(`UPDATE count_items SET description=@p0, location=@p1, system_qty=@p2 WHERE base_id=@p3 AND sku=@p4`,
            [item.description ?? '', item.location ?? '', item.system_qty ?? 0, baseId, item.sku]);
        } else {
          await query(`INSERT INTO count_items (base_id, sku, description, location, system_qty) VALUES (@p0,@p1,@p2,@p3,@p4)`,
            [baseId, item.sku, item.description ?? '', item.location ?? '', item.system_qty ?? 0]);
        }
        itemCount++;
      }
    }
    res.json({ baseCount: bases.length, itemCount });
  } catch (err) { next(err); }
});

export default router;
