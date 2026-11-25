const HISTORY_YEAR = 2026
const HEADER_PREFIX = 'Data;PN;'

const MONTHS = {
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
}

function parseDate(raw, line) {
  if (!raw) return null
  const match = /^(\d{1,2})\/([a-z]{3}|\d{1,2})(?:\/(\d{4}))?$/i.exec(raw)
  if (!match) throw new Error(`Linha ${line}: data inválida "${raw}"`)
  const monthPart = match[2].toLowerCase()
  const month = /^\d+$/.test(monthPart) ? monthPart.padStart(2, '0') : MONTHS[monthPart]
  if (!month) throw new Error(`Linha ${line}: data inválida "${raw}"`)
  const year = match[3] ?? HISTORY_YEAR
  return `${year}-${month}-${match[1].padStart(2, '0')}`
}

function parseNumber(raw, line) {
  if (!raw) return null
  const value = Number(raw.replace(/[.,]/g, ''))
  if (Number.isNaN(value)) throw new Error(`Linha ${line}: número inválido "${raw}"`)
  return value
}

function parseText(raw) {
  return raw ? raw.trim() : null
}

export function parseHistoryCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  const headerIndex = lines.findIndex((line) => line.startsWith(HEADER_PREFIX))
  if (headerIndex === -1) throw new Error('Cabeçalho do histórico não encontrado.')

  const rows = []
  for (let index = headerIndex + 1; index < lines.length; index++) {
    const line = lines[index]
    if (!line.trim()) continue
    const sourceLine = index + 1
    const [date, pn, description, abc, mom, qad, counted, varianceQad, varianceJfk, adjustment, statusNote] =
      line.split(';')
    if (!date?.trim() && !pn?.trim()) continue

    rows.push({
      sourceLine,
      countDate: parseDate(date?.trim(), sourceLine),
      pn: pn?.trim() ?? '',
      description: description?.trim() ?? '',
      abc: parseText(abc),
      systemMom: parseNumber(mom?.trim(), sourceLine),
      systemQad: parseNumber(qad?.trim(), sourceLine),
      countedQty: parseNumber(counted?.trim(), sourceLine),
      varianceQad: parseNumber(varianceQad?.trim(), sourceLine),
      varianceJfk: parseNumber(varianceJfk?.trim(), sourceLine),
      adjustment: parseText(adjustment),
      statusNote: parseText(statusNote),
    })
  }
  return rows
}
