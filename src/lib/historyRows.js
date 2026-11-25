function localIsoDate(value) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function fromImportedRow(row) {
  return {
    key: `imported-${row.id}`,
    source: 'imported',
    sourceId: row.id,
    date: row.count_date,
    pn: row.pn,
    description: row.description,
    abc: row.abc,
    systemMom: row.system_mom,
    systemQad: row.system_qad,
    countedQty: row.counted_qty,
    varianceQad: row.variance_qad,
    varianceJfk: row.variance_jfk,
    adjustment: row.adjustment,
    statusNote: row.status_note,
    operator: null,
  }
}

function fromCompletedPlan(plan) {
  const result = plan.count_results?.[0] ?? null
  const counted = result?.counted_qty ?? null
  return {
    key: `plan-${plan.id}`,
    source: 'plan',
    sourceId: plan.id,
    date: localIsoDate(plan.completed_at),
    pn: plan.count_items?.sku ?? '',
    description: plan.count_items?.description ?? '',
    abc: plan.count_items?.abc_class ?? null,
    systemMom: result?.system_qty ?? null,
    systemQad: result?.qad_qty ?? null,
    countedQty: counted,
    varianceQad: counted === null || result.qad_qty === null ? null : counted - result.qad_qty,
    varianceJfk: counted === null || result.system_qty === null ? null : counted - result.system_qty,
    adjustment: result?.adjustment ?? null,
    statusNote: result?.observation ?? null,
    operator: plan.operator_name || null,
  }
}

export function buildHistoryRows(importedRows, completedPlans) {
  const rows = [...completedPlans.map(fromCompletedPlan), ...importedRows.map(fromImportedRow)]
  return rows.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}
