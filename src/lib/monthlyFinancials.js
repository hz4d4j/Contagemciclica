// Groups every count with a cost by month. The divergence value is the signed sum of (counted - QAD) x unit cost,
// and the total stock value is the sum of QAD x unit cost. Items without a cost in the cost list are left out.
export function buildMonthlyFinancials(costItems, historyRows) {
  const unitCostByPn = new Map(costItems.map((item) => [item.pn.trim(), item.unitCostUsd]))
  const unmatchedPns = new Set()
  const monthly = new Map()

  for (const row of historyRows) {
    if (!row.pn || !row.date || row.systemQad === null || row.varianceQad === null) continue
    const pn = row.pn.trim()
    const unitCost = unitCostByPn.get(pn)
    if (unitCost === undefined) {
      unmatchedPns.add(pn)
      continue
    }
    const month = row.date.slice(0, 7)
    const entry = monthly.get(month) ?? { month, stockValueUsd: 0, divergenceUsd: 0, countedItems: 0 }
    entry.stockValueUsd += Number(row.systemQad) * unitCost
    entry.divergenceUsd += Number(row.varianceQad) * unitCost
    entry.countedItems += 1
    monthly.set(month, entry)
  }

  const months = [...monthly.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((entry) => ({
      ...entry,
      accuracyPct: entry.stockValueUsd !== 0 ? (1 - Math.abs(entry.divergenceUsd) / entry.stockValueUsd) * 100 : null,
    }))

  return { months, unmatchedItems: unmatchedPns.size }
}
