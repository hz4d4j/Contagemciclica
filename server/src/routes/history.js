import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/history — imported history rows
router.get('/', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT id, count_date, pn, description, abc, system_mom, system_qad,
             counted_qty, variance_qad, variance_jfk, adjustment, status_note
      FROM count_history
      ORDER BY count_date DESC, source_line
    `);
    res.json(rows.recordset);
  } catch (err) { next(err); }
});

// GET /api/history/last-dates — last count date per PN (for schedule)
router.get('/last-dates', async (req, res, next) => {
  try {
    const rows = await query(`SELECT pn, MAX(count_date) AS count_date FROM count_history WHERE count_date IS NOT NULL GROUP BY pn`);
    res.json(rows.recordset);
  } catch (err) { next(err); }
});

// POST /api/history/bulk — upsert from CSV import
router.post('/bulk', async (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows inválido.' });
    for (const row of rows) {
      const existing = await query(`SELECT id FROM count_history WHERE source_line=@p0`, [row.sourceLine]);
      if (existing.recordset.length) {
        await query(`UPDATE count_history SET count_date=@p0, pn=@p1, description=@p2, abc=@p3, system_mom=@p4, system_qad=@p5, counted_qty=@p6, variance_qad=@p7, variance_jfk=@p8, adjustment=@p9, status_note=@p10 WHERE source_line=@p11`,
          [row.countDate, row.pn, row.description, row.abc ?? null, row.systemMom, row.systemQad, row.countedQty, row.varianceQad, row.varianceJfk, row.adjustment ?? null, row.statusNote ?? null, row.sourceLine]);
      } else {
        await query(`INSERT INTO count_history (source_line, count_date, pn, description, abc, system_mom, system_qad, counted_qty, variance_qad, variance_jfk, adjustment, status_note) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10)`,
          [row.sourceLine, row.countDate, row.pn, row.description, row.abc ?? null, row.systemMom, row.systemQad, row.countedQty, row.varianceQad, row.varianceJfk, row.adjustment ?? null, row.statusNote ?? null]);
      }
    }
    res.json({ count: rows.length });
  } catch (err) { next(err); }
});

// PUT /api/history/:id — edit a single history row
router.put('/:id', async (req, res, next) => {
  try {
    const { date, systemMom, systemQad, countedQty, adjustment, statusNote } = req.body;
    const varianceQad = (countedQty !== null && systemQad !== null) ? countedQty - systemQad : null;
    const varianceJfk = (countedQty !== null && systemMom !== null) ? countedQty - systemMom : null;
    await query(`UPDATE count_history SET count_date=@p0, system_mom=@p1, system_qad=@p2, counted_qty=@p3, variance_qad=@p4, variance_jfk=@p5, adjustment=@p6, status_note=@p7 WHERE id=@p8`,
      [date, systemMom, systemQad, countedQty, varianceQad, varianceJfk, adjustment ?? null, statusNote ?? null, req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
