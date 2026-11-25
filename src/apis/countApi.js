import { supabase } from '../lib/supabase'
import { addMonths, buildSchedule, monthRange, scheduleInputFor } from '../lib/countSchedule'
import { buildHistoryRows } from '../lib/historyRows'
import { isCatalystMode } from '../lib/appMode'
import { catalystApi } from './catalystApi'

const PAGE_SIZE = 1000
const WRITE_CHUNK = 500

function ensureOk(error) {
  if (error) throw new Error(error.message)
}

async function fetchAll(buildQuery) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1)
    ensureOk(error)
    rows.push(...data)
    if (data.length < PAGE_SIZE) return rows
  }
}

function chunk(list, size) {
  const parts = []
  for (let i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size))
  return parts
}

function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export async function saveImportedBases(parsedBases) {
  if (isCatalystMode) return catalystApi.saveImportedBases(parsedBases)
  let itemCount = 0
  for (const base of parsedBases) {
    const { data: baseRow, error } = await supabase
      .from('count_bases')
      .upsert({ name: base.name }, { onConflict: 'name' })
      .select('id')
      .single()
    ensureOk(error)

    for (const part of chunk(base.items, WRITE_CHUNK)) {
      const rows = part.map((item) => ({ ...item, base_id: baseRow.id }))
      const { error: itemsError } = await supabase
        .from('count_items')
        .upsert(rows, { onConflict: 'base_id,sku' })
      ensureOk(itemsError)
    }
    itemCount += base.items.length
  }
  return { baseCount: parsedBases.length, itemCount }
}

export async function listPlansInMonth(year, month) {
  if (isCatalystMode) return catalystApi.listPlansInMonth(year, month)
  const { first, last } = monthRange(year, month)
  return fetchAll((from, to) =>
    supabase
      .from('count_plans')
      .select('id, scheduled_date, status, count_items(id, sku, description, abc_class)')
      .gte('scheduled_date', first)
      .lte('scheduled_date', last)
      .order('scheduled_date')
      .order('id')
      .range(from, to),
  )
}

export async function listPlansOnDate(date) {
  if (isCatalystMode) return catalystApi.listPlansOnDate(date)
  return fetchAll((from, to) =>
    supabase
      .from('count_plans')
      .select('id, base_id, scheduled_date, status, count_items(id, sku, description, abc_class, last_counted_at), count_results(system_qty, qad_qty, counted_qty, adjustment, observation)')
      .eq('scheduled_date', date)
      .order('id')
      .range(from, to),
  )
}

export async function rebuildSchedule() {
  if (isCatalystMode) return rebuildScheduleCatalyst()
  const bases = await fetchAll((from, to) => supabase.from('count_bases').select('id').order('name').range(from, to))
  const costs = await loadItemCosts()
  const abcByPn = new Map(costs.map((cost) => [cost.pn, cost.abc]))
  const lastHistoryDateByPn = await loadLastHistoryCountDates()
  let total = 0
  for (const base of bases) {
    const { error: deleteError } = await supabase
      .from('count_plans')
      .delete()
      .eq('base_id', base.id)
      .eq('status', 'pending')
    ensureOk(deleteError)

    const items = await fetchAll((from, to) =>
      supabase
        .from('count_items')
        .select('id, sku, abc_class, last_counted_at')
        .eq('base_id', base.id)
        .order('sku')
        .range(from, to),
    )
    const done = await fetchAll((from, to) =>
      supabase
        .from('count_plans')
        .select('scheduled_date')
        .eq('base_id', base.id)
        .eq('status', 'completed')
        .range(from, to),
    )
    const occupied = {}
    for (const plan of done) occupied[plan.scheduled_date] = (occupied[plan.scheduled_date] ?? 0) + 1

    const startDate = todayIso()
    const scheduleItems = items.map((item) => scheduleInputFor(item, abcByPn, lastHistoryDateByPn))
    const schedule = buildSchedule({ items: scheduleItems, startDate, endDate: addMonths(startDate, 6), occupied })
    const rows = schedule.map((entry) => ({
      base_id: base.id,
      item_id: entry.item_id,
      scheduled_date: entry.scheduled_date,
      status: 'pending',
    }))
    for (const part of chunk(rows, WRITE_CHUNK)) {
      const { error } = await supabase.from('count_plans').insert(part)
      ensureOk(error)
    }
    total += rows.length
  }
  return total
}

export async function completeItemCount(plan, item, details, operatorName) {
  if (isCatalystMode) return catalystApi.completeItemCount(plan, item, details, operatorName)
  const countedDate = todayIso()
  const { error: resultError } = await supabase.from('count_results').upsert(
    {
      plan_id: plan.id,
      item_id: item.id,
      system_qty: details.momQty,
      qad_qty: details.qadQty,
      counted_qty: details.countedQty,
      adjustment: details.adjustment,
      observation: details.observation,
      counted_at: new Date().toISOString(),
    },
    { onConflict: 'plan_id,item_id' },
  )
  ensureOk(resultError)

  const { error: planError } = await supabase
    .from('count_plans')
    .update({ status: 'completed', completed_at: new Date().toISOString(), operator_name: operatorName })
    .eq('id', plan.id)
  ensureOk(planError)

  const { error: itemError } = await supabase
    .from('count_items')
    .update({ last_counted_at: countedDate })
    .eq('id', item.id)
  ensureOk(itemError)
}

export async function loadHistoryRows() {
  if (isCatalystMode) return loadHistoryRowsCatalyst()
  const [completedPlans, importedRows] = await Promise.all([loadCountHistory(), loadImportedHistory()])
  return buildHistoryRows(importedRows, completedPlans)
}

async function loadCountHistory() {
  if (isCatalystMode) return catalystApi.loadCountHistory()
  return fetchAll((from, to) =>
    supabase
      .from('count_plans')
      .select('id, scheduled_date, completed_at, operator_name, count_items(sku, description, abc_class), count_results(system_qty, qad_qty, counted_qty, adjustment, observation)')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .order('id')
      .range(from, to),
  )
}

export async function saveHistoryRows(rows) {
  if (isCatalystMode) return catalystApi.saveHistoryRows(rows)
  for (const part of chunk(rows, WRITE_CHUNK)) {
    const { error } = await supabase.from('count_history').upsert(
      part.map((row) => ({
        source_line: row.sourceLine,
        count_date: row.countDate,
        pn: row.pn,
        description: row.description,
        abc: row.abc,
        system_mom: row.systemMom,
        system_qad: row.systemQad,
        counted_qty: row.countedQty,
        variance_qad: row.varianceQad,
        variance_jfk: row.varianceJfk,
        adjustment: row.adjustment,
        status_note: row.statusNote,
      })),
      { onConflict: 'source_line' },
    )
    ensureOk(error)
  }
  return rows.length
}

export async function loadLastHistoryCountDates() {
  if (isCatalystMode) return catalystApi.loadLastHistoryCountDates()
  const rows = await fetchAll((from, to) =>
    supabase
      .from('count_history')
      .select('pn, count_date')
      .not('count_date', 'is', null)
      .order('pn')
      .range(from, to),
  )
  const lastByPn = new Map()
  for (const row of rows) {
    if (!lastByPn.has(row.pn) || row.count_date > lastByPn.get(row.pn)) lastByPn.set(row.pn, row.count_date)
  }
  return lastByPn
}

async function loadImportedHistory() {
  if (isCatalystMode) return catalystApi.loadImportedHistory()
  return fetchAll((from, to) =>
    supabase
      .from('count_history')
      .select('id, count_date, pn, description, abc, system_mom, system_qad, counted_qty, variance_qad, variance_jfk, adjustment, status_note')
      .order('count_date', { ascending: false })
      .order('source_line')
      .range(from, to),
  )
}

export async function loadItemCosts() {
  if (isCatalystMode) return catalystApi.loadItemCosts()
  const rows = await fetchAll((from, to) =>
    supabase
      .from('item_costs')
      .select('pn, description, supplier, abc, unit_cost_usd')
      .order('pn')
      .range(from, to),
  )
  return rows.map((row) => ({ ...row, unitCostUsd: Number(row.unit_cost_usd) }))
}

export async function loadCompletedResults() {
  if (isCatalystMode) return loadCompletedResultsCatalyst()
  return fetchAll((from, to) =>
    supabase
      .from('count_results')
      .select('system_qty, counted_qty, count_plans!inner(id, scheduled_date, status, count_bases(name))')
      .eq('count_plans.status', 'completed')
      .range(from, to),
  )
}

export async function updateHistoryRow(row, values) {
  if (isCatalystMode) return catalystApi.updateHistoryRow(row, values)
  if (row.source === 'imported') {
    const { error } = await supabase
      .from('count_history')
      .update({
        count_date: values.date,
        system_mom: values.systemMom,
        system_qad: values.systemQad,
        counted_qty: values.countedQty,
        variance_qad: varianceOf(values.countedQty, values.systemQad),
        variance_jfk: varianceOf(values.countedQty, values.systemMom),
        adjustment: values.adjustment,
        status_note: values.statusNote,
      })
      .eq('id', row.sourceId)
    ensureOk(error)
    return
  }

  const { error: planError } = await supabase
    .from('count_plans')
    .update({ completed_at: new Date(`${values.date}T12:00:00`).toISOString() })
    .eq('id', row.sourceId)
  ensureOk(planError)

  const { error } = await supabase
    .from('count_results')
    .update({
      system_qty: values.systemMom,
      qad_qty: values.systemQad,
      counted_qty: values.countedQty,
      adjustment: values.adjustment,
      observation: values.statusNote,
    })
    .eq('plan_id', row.sourceId)
  ensureOk(error)
}

function varianceOf(counted, system) {
  return counted === null || system === null ? null : counted - system
}

function positionCheckColumns(check) {
  return {
    count_item_id: check.countItemId ?? null,
    check_date: check.checkDate,
    operator_name: check.operatorName,
    locations_checked: check.locationsChecked,
    locations_ok: check.locationsOk,
    locations_not_ok: check.locationsNotOk,
    occurrence: check.occurrence ?? null,
    action_plan: check.locationsNotOk > 0 ? check.actionPlan : null,
  }
}

export async function savePositionCheck(check) {
  if (isCatalystMode) return catalystApi.savePositionCheck(check)
  const { error } = await supabase.from('position_checks').insert(positionCheckColumns(check))
  ensureOk(error)
}

export async function updatePositionCheck(id, check) {
  if (isCatalystMode) return catalystApi.updatePositionCheck(id, check)
  const { error } = await supabase.from('position_checks').update(positionCheckColumns(check)).eq('id', id)
  ensureOk(error)
}

export async function listBaseItems(baseId) {
  if (isCatalystMode) return catalystApi.listBaseItems(baseId)
  return fetchAll((from, to) =>
    supabase
      .from('count_items')
      .select('id, sku, description, abc_class')
      .eq('base_id', baseId)
      .order('sku')
      .range(from, to),
  )
}

export async function changePendingPlanItem(planId, itemId) {
  if (isCatalystMode) return catalystApi.changePendingPlanItem(planId, itemId)
  const { data, error } = await supabase
    .from('count_plans')
    .update({ item_id: itemId })
    .eq('id', planId)
    .eq('status', 'pending')
    .select('id')
  ensureOk(error)
  if (!data.length) throw new Error('Esta contagem já foi concluída e não pode mais ser alterada.')
}

export async function listCountItems() {
  if (isCatalystMode) return catalystApi.listCountItems()
  const { data, error } = await supabase.from('count_items').select('id, sku, description').order('sku')
  ensureOk(error)
  return data
}

export async function listPositionChecks() {
  if (isCatalystMode) return catalystApi.listPositionChecks()
  const { data, error } = await supabase
    .from('position_checks')
    .select('id, count_item_id, check_date, operator_name, locations_checked, locations_ok, locations_not_ok, occurrence, action_plan, count_items(sku, description)')
    .order('check_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)
  ensureOk(error)
  return data
}

async function rebuildScheduleCatalyst() {
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

async function loadHistoryRowsCatalyst() {
  const [completedPlans, importedRows] = await Promise.all([catalystApi.loadCountHistory(), catalystApi.loadImportedHistory()])
  return buildHistoryRows(importedRows, completedPlans)
}

async function loadCompletedResultsCatalyst() {
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
