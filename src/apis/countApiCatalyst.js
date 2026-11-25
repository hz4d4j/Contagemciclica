/**
 * Catalyst (REST API) implementation of all data operations.
 * This module is only imported when VITE_APP_MODE === 'catalyst'.
 * It never imports Supabase — the browser talks only to the REST backend.
 */
import { addMonths, buildSchedule, scheduleInputFor } from '../lib/countSchedule'
import { buildHistoryRows } from '../lib/historyRows'
import { catalystApi } from './catalystApi'

function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export async function saveImportedBases(parsedBases) {
  return catalystApi.saveImportedBases(parsedBases)
}

export async function listPlansInMonth(year, month) {
  return catalystApi.listPlansInMonth(year, month)
}

export async function listPlansOnDate(date) {
  return catalystApi.listPlansOnDate(date)
}

export async function rebuildSchedule() {
  const bases = await catalystApi.listBases()
  const costs = await loadItemCosts()
  const abcByPn = new Map(costs.map((cost) => [cost.pn, cost.abc]))
  const lastHistoryDateByPn = await loadLastHistoryCountDates()
  const allScheduleRows = []
  for (const base of bases) {
    const items = await catalystApi.listBaseItems(base.id)
    const scheduleItems = items.map((item) => scheduleInputFor(item, abcByPn, lastHistoryDateByPn))
    const schedule = buildSchedule({ items: scheduleItems, startDate: todayIso(), endDate: addMonths(todayIso(), 6), occupied: {} })
    for (const entry of schedule) {
      allScheduleRows.push({ base_id: base.id, item_id: entry.item_id, scheduled_date: entry.scheduled_date })
    }
  }
  const result = await catalystApi.rebuildSchedule(allScheduleRows)
  return result.scheduled
}

export async function completeItemCount(plan, item, details, operatorName) {
  return catalystApi.completeItemCount(plan, item, details, operatorName)
}

export async function loadHistoryRows() {
  const [completedPlans, importedRows] = await Promise.all([catalystApi.loadCountHistory(), catalystApi.loadImportedHistory()])
  return buildHistoryRows(importedRows, completedPlans)
}

export async function saveHistoryRows(rows) {
  return catalystApi.saveHistoryRows(rows)
}

export async function loadLastHistoryCountDates() {
  return catalystApi.loadLastHistoryCountDates()
}

export async function loadItemCosts() {
  return catalystApi.loadItemCosts()
}

export async function loadCompletedResults() {
  const completed = await catalystApi.loadCountHistory()
  return completed.flatMap((plan) =>
    (plan.count_results || []).map((r) => ({
      system_qty: r.system_qty,
      counted_qty: r.counted_qty,
      count_plans: {
        id: plan.id,
        scheduled_date: plan.scheduled_date,
        status: 'completed',
        count_bases: { name: 'Base' },
      },
    })),
  )
}

export async function updateHistoryRow(row, values) {
  return catalystApi.updateHistoryRow(row, values)
}

export async function savePositionCheck(check) {
  return catalystApi.savePositionCheck(check)
}

export async function updatePositionCheck(id, check) {
  return catalystApi.updatePositionCheck(id, check)
}

export async function listBaseItems(baseId) {
  return catalystApi.listBaseItems(baseId)
}

export async function changePendingPlanItem(planId, itemId) {
  return catalystApi.changePendingPlanItem(planId, itemId)
}

export async function listCountItems() {
  return catalystApi.listCountItems()
}

export async function listPositionChecks() {
  return catalystApi.listPositionChecks()
}
