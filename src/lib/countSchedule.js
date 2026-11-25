const CAPACITY_PER_DAY = 2
const INTERVAL_DAYS = { A: 7, B: 14, C: 30 }
const ABC_RANK = { A: 0, B: 1, C: 2 }

const NATIONAL_HOLIDAYS = new Set([
  '2026-01-01', '2026-04-21', '2026-05-01', '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
  '2027-01-01', '2027-04-21', '2027-05-01', '2027-09-07', '2027-10-12', '2027-11-02', '2027-11-15', '2027-11-20', '2027-12-25',
])

export function monthRange(year, month) {
  const first = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const last = addDays(addDays(first, 31).slice(0, 8) + '01', -1)
  return { first, last }
}

export function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function isBusinessDay(iso) {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return weekday !== 0 && weekday !== 6 && !NATIONAL_HOLIDAYS.has(iso)
}

function dueDateOf(item, startDate) {
  if (!item.last_counted_at) return startDate
  const interval = INTERVAL_DAYS[item.abc_class] ?? INTERVAL_DAYS.C
  const next = addDays(item.last_counted_at, interval)
  return next > startDate ? next : startDate
}

function compareItems(a, b) {
  const lastA = a.last_counted_at ?? ''
  const lastB = b.last_counted_at ?? ''
  if (lastA !== lastB) return lastA < lastB ? -1 : 1
  const rankA = ABC_RANK[a.abc_class] ?? 3
  const rankB = ABC_RANK[b.abc_class] ?? 3
  if (rankA !== rankB) return rankA - rankB
  return a.sku.localeCompare(b.sku)
}

export function lastCountedOf(item, lastHistoryDateByPn) {
  return [item.last_counted_at, lastHistoryDateByPn.get(item.sku)].filter(Boolean).sort().at(-1) ?? null
}

export function scheduleInputFor(item, abcByPn, lastHistoryDateByPn) {
  return { ...item, abc_class: abcByPn.get(item.sku) ?? item.abc_class, last_counted_at: lastCountedOf(item, lastHistoryDateByPn) }
}

/**
 * Builds the counts of every item from `startDate` up to `endDate`, two items per business day.
 * Each item is counted every ABC interval (7, 14 or 30 days). Items never counted come first.
 * `occupied` maps a date to the number of counts already done that day, so those slots are not reused.
 */
export function buildSchedule({ items, startDate, endDate, occupied = {} }) {
  const used = { ...occupied }
  const demands = []
  for (const item of items) {
    const interval = INTERVAL_DAYS[item.abc_class] ?? INTERVAL_DAYS.C
    for (let due = dueDateOf(item, startDate); due <= endDate; due = addDays(due, interval)) {
      demands.push({ item, due })
    }
  }
  demands.sort((a, b) => (a.due !== b.due ? (a.due < b.due ? -1 : 1) : compareItems(a.item, b.item)))

  const schedule = []
  for (const { item, due } of demands) {
    let day = due
    while (day <= endDate && (!isBusinessDay(day) || (used[day] ?? 0) >= CAPACITY_PER_DAY)) day = addDays(day, 1)
    if (day > endDate) continue
    used[day] = (used[day] ?? 0) + 1
    schedule.push({ item_id: item.id, scheduled_date: day })
  }
  return schedule
}

export function addMonths(iso, months) {
  const [year, month, day] = iso.split('-').map(Number)
  const firstOfTarget = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate()
  firstOfTarget.setUTCDate(Math.min(day, lastDay))
  return firstOfTarget.toISOString().slice(0, 10)
}
