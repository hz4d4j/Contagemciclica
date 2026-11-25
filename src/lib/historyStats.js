const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function monthLabel(key) {
  const [year, month] = key.split('-')
  return `${MONTH_LABELS[Number(month) - 1]}/${year.slice(2)}`
}

export function monthlyAccuracy(rows) {
  const months = new Map()
  for (const row of rows) {
    if (!row.date || row.countedQty === null || row.varianceQad === null) continue
    const key = row.date.slice(0, 7)
    const entry = months.get(key) ?? { month: key, counted: 0, accurate: 0 }
    entry.counted += 1
    if (row.varianceQad === 0) entry.accurate += 1
    months.set(key, entry)
  }
  return [...months.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((entry) => ({ ...entry, accuracy: (entry.accurate / entry.counted) * 100 }))
}

export function varianceByPnAndMonth(rows) {
  const months = new Set()
  const pns = new Map()
  for (const row of rows) {
    if (!row.date || !row.pn || row.varianceQad === null) continue
    const month = row.date.slice(0, 7)
    months.add(month)
    const entry = pns.get(row.pn) ?? { pn: row.pn, description: row.description ?? '', byMonth: new Map() }
    entry.byMonth.set(month, (entry.byMonth.get(month) ?? 0) + Number(row.varianceQad))
    pns.set(row.pn, entry)
  }
  return {
    months: [...months].sort(),
    pns: [...pns.values()].sort((a, b) => a.pn.localeCompare(b.pn, 'pt-BR')),
  }
}
