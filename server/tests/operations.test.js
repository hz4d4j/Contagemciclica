import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Operation equivalence tests.
 *
 * These verify that the REST API contract matches the original Supabase
 * operations — same input/output shapes, same side effects. We test the
 * data transformation functions that are shared between Bolt mode and
 * Catalyst mode (they don't touch the database).
 */

import { buildHistoryRows } from '../../src/lib/historyRows.js';
import { positionCheckError, positionCheckPayload } from '../../src/lib/positionCheck.js';
import { buildSchedule, isBusinessDay, addDays, monthRange } from '../../src/lib/countSchedule.js';
import { buildMonthlyFinancials } from '../../src/lib/monthlyFinancials.js';
import { parseHistoryCsv } from '../../src/lib/historyCsv.js';

describe('History rows equivalence', () => {
  test('builds rows from imported + completed with source markers', () => {
    const imported = [{
      id: 'uuid-1', count_date: '2026-01-15', pn: '12345', description: 'Widget',
      abc: 'A', system_mom: 100, system_qad: 95, counted_qty: 98,
      variance_qad: 3, variance_jfk: -2, adjustment: 'OK', status_note: '',
    }];
    const completed = [{
      id: 'uuid-2', completed_at: '2026-02-20T10:00:00Z', operator_name: 'Alice',
      count_items: { sku: '67890', description: 'Gadget', abc_class: 'B' },
      count_results: [{ system_qty: 50, qad_qty: 48, counted_qty: 50, adjustment: 'NOK', observation: 'Broken' }],
    }];
    const rows = buildHistoryRows(imported, completed);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].date, '2026-02-20'); // completed is more recent
    assert.equal(rows[0].source, 'plan');
    assert.equal(rows[0].sourceId, 'uuid-2');
    assert.equal(rows[1].source, 'imported');
    assert.equal(rows[1].sourceId, 'uuid-1');
    assert.equal(rows[1].operator, null);
  });
});

describe('Position check validation equivalence', () => {
  test('rejects when OK + not OK != checked', () => {
    const err = positionCheckError({
      checkDate: '2026-01-01', operatorName: 'Bob',
      locationsChecked: '10', locationsOk: '5', locationsNotOk: '3',
    });
    assert.ok(err.includes('10'));
  });

  test('requires action plan when not OK > 0', () => {
    const err = positionCheckError({
      checkDate: '2026-01-01', operatorName: 'Bob',
      locationsChecked: '10', locationsOk: '5', locationsNotOk: '5',
    });
    assert.ok(err.includes('plano de ação'));
  });

  test('passes when all valid', () => {
    const err = positionCheckError({
      checkDate: '2026-01-01', operatorName: 'Bob',
      locationsChecked: '10', locationsOk: '8', locationsNotOk: '2', actionPlan: 'Fix it',
    });
    assert.equal(err, '');
  });

  test('payload shapes correctly', () => {
    const payload = positionCheckPayload(
      { checkDate: '2026-01-01', operatorName: 'Bob', locationsChecked: '10', locationsOk: '8', locationsNotOk: '2', actionPlan: 'Fix', occurrence: 'Misplaced' },
      { countItemId: 'item-uuid' },
    );
    assert.equal(payload.checkDate, '2026-01-01');
    assert.equal(payload.locationsChecked, 10);
    assert.equal(payload.locationsOk, 8);
    assert.equal(payload.locationsNotOk, 2);
    assert.equal(payload.countItemId, 'item-uuid');
    assert.equal(payload.occurrence, 'Misplaced');
  });
});

describe('Schedule equivalence', () => {
  test('isBusinessDay skips weekends and holidays', () => {
    assert.equal(isBusinessDay('2026-01-03'), false); // Saturday
    assert.equal(isBusinessDay('2026-01-05'), true);  // Monday
    assert.equal(isBusinessDay('2026-01-01'), false); // Holiday
  });

  test('addDays works', () => {
    assert.equal(addDays('2026-01-05', 7), '2026-01-12');
  });

  test('monthRange returns first and last', () => {
    const { first, last } = monthRange(2026, 0); // January
    assert.equal(first, '2026-01-01');
    assert.equal(last, '2026-01-31');
  });

  test('buildSchedule respects capacity and intervals', () => {
    const items = [
      { id: 'a', sku: 'AAA', abc_class: 'A', last_counted_at: null },
      { id: 'b', sku: 'BBB', abc_class: 'B', last_counted_at: null },
      { id: 'c', sku: 'CCC', abc_class: 'C', last_counted_at: null },
    ];
    const schedule = buildSchedule({ items, startDate: '2026-01-05', endDate: '2026-02-05', occupied: {} });
    // All 3 should be scheduled on the first business day (2 slots) + 1 on next
    assert.ok(schedule.length >= 3);
    // First two on same day
    assert.equal(schedule[0].scheduled_date, schedule[1].scheduled_date);
  });
});

describe('Monthly financials equivalence', () => {
  test('groups by month and calculates divergence', () => {
    const costs = [{ pn: '12345', unitCostUsd: 10 }];
    const history = [
      { pn: '12345', date: '2026-01-15', systemQad: 100, varianceQad: 5 },
      { pn: '12345', date: '2026-02-10', systemQad: 80, varianceQad: -3 },
    ];
    const result = buildMonthlyFinancials(costs, history);
    assert.equal(result.months.length, 2);
    assert.equal(result.months[0].month, '2026-01');
    assert.equal(result.months[0].stockValueUsd, 1000);
    assert.equal(result.months[0].divergenceUsd, 50);
  });

  test('unmatched PNs are counted', () => {
    const costs = [{ pn: '12345', unitCostUsd: 10 }];
    const history = [{ pn: '99999', date: '2026-01-15', systemQad: 100, varianceQad: 5 }];
    const result = buildMonthlyFinancials(costs, history);
    assert.equal(result.unmatchedItems, 1);
    assert.equal(result.months.length, 0);
  });
});

describe('CSV parse equivalence', () => {
  test('parses valid CSV with header', () => {
    const csv = 'Data;PN;Descrição;ABC;MOM;QAD;Contado;VarQAD;VarJFK;Ajuste;Status\n01/jan;12345;Widget;A;100;95;98;3;-2;OK;OK';
    const rows = parseHistoryCsv(csv);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].pn, '12345');
    assert.equal(rows[0].systemMom, 100);
    assert.equal(rows[0].countedQty, 98);
  });
});
