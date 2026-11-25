export function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function formatIsoDate(iso) {
  if (!iso) return '-'
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}
