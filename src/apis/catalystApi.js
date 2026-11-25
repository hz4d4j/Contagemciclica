/**
 * Catalyst API client — replaces Supabase JS when running in Catalyst mode.
 * All calls go to the REST backend; the browser never touches SQL.
 * Easy Auth on App Service injects authentication; no token needed in browser.
 */
import { apiBaseUrl } from '../lib/appMode.js'

async function apiGet(path) {
  const res = await fetch(`${apiBaseUrl}${path}`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText)
  return res.json()
}

async function apiPost(path, body) {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText)
  return res.json()
}

async function apiPut(path, body) {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText)
  return res.json()
}

export const catalystApi = {
  // Plans
  async listPlansOnDate(date) {
    const rows = await apiGet(`/api/plans?date=${date}`)
    return rows
  },
  async listPlansInMonth(year, month) {
    return apiGet(`/api/plans?year=${year}&month=${month}`)
  },
  async completeItemCount(plan, item, details, operatorName) {
    return apiPost(`/api/plans/${plan.id}/complete`, {
      itemId: item.id,
      momQty: details.momQty,
      qadQty: details.qadQty,
      countedQty: details.countedQty,
      adjustment: details.adjustment,
      observation: details.observation,
      operatorName,
    })
  },
  async changePendingPlanItem(planId, itemId) {
    return apiPut(`/api/plans/${planId}/item`, { itemId })
  },
  async rebuildSchedule(scheduleRows) {
    return apiPost('/api/plans/rebuild', { scheduleRows })
  },
  async loadCountHistory() {
    return apiGet('/api/plans/completed')
  },

  // Bases / items
  async saveImportedBases(parsedBases) {
    return apiPost('/api/bases/import', { bases: parsedBases })
  },
  async listBaseItems(baseId) {
    return apiGet(`/api/bases/${baseId}/items`)
  },
  async listCountItems() {
    return apiGet('/api/bases/items')
  },
  async listBases() {
    return apiGet('/api/bases')
  },

  // History
  async saveHistoryRows(rows) {
    return apiPost('/api/history/bulk', { rows })
  },
  async loadImportedHistory() {
    return apiGet('/api/history')
  },
  async loadLastHistoryCountDates() {
    const rows = await apiGet('/api/history/last-dates')
    const map = new Map()
    for (const r of rows) map.set(r.pn, r.count_date)
    return map
  },
  async updateHistoryRow(row, values) {
    if (row.source === 'imported') {
      return apiPut(`/api/history/${row.sourceId}`, {
        date: values.date,
        systemMom: values.systemMom,
        systemQad: values.systemQad,
        countedQty: values.countedQty,
        adjustment: values.adjustment,
        statusNote: values.statusNote,
      })
    }
    return apiPut(`/api/plans/${row.sourceId}/result`, {
      date: values.date,
      systemMom: values.systemMom,
      systemQad: values.systemQad,
      countedQty: values.countedQty,
      adjustment: values.adjustment,
      statusNote: values.statusNote,
    })
  },

  // Costs
  async loadItemCosts() {
    return apiGet('/api/costs')
  },

  // Position checks
  async savePositionCheck(check) {
    return apiPost('/api/position-checks', check)
  },
  async updatePositionCheck(id, check) {
    return apiPut(`/api/position-checks/${id}`, check)
  },
  async listPositionChecks() {
    return apiGet('/api/position-checks')
  },

  // Migration
  async migrateData(payload) {
    return apiPost('/api/migrate', payload)
  },
  async validateMigration() {
    return apiGet('/api/migrate/validate')
  },
}
