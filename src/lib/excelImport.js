import * as XLSX from 'xlsx'

const COLUMN_PATTERNS = {
  sku: /^(sku|c[oó]digo|cod\.?|item|produto|material)/i,
  description: /descri/i,
  location: /local|endere[cç]o|posi[cç][aã]o/i,
  system_qty: /quant|saldo|qtd|qty|estoque/i,
}

function findHeaderRow(rows) {
  const index = rows.findIndex((row) => row.some((cell) => COLUMN_PATTERNS.sku.test(String(cell).trim())))
  return index === -1 ? null : index
}

function mapColumns(headers) {
  const map = {}
  for (const [field, pattern] of Object.entries(COLUMN_PATTERNS)) {
    const index = headers.findIndex((header) => pattern.test(String(header).trim()))
    if (index !== -1) map[field] = index
  }
  return map
}

function parseSheet(name, sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false })
  const headerIndex = findHeaderRow(rows)
  if (headerIndex === null) {
    return { name, items: [], warning: 'Cabeçalho com a coluna de código não encontrado.' }
  }

  const columns = mapColumns(rows[headerIndex])
  if (columns.system_qty === undefined) {
    return { name, items: [], warning: 'Coluna de quantidade/saldo não encontrada.' }
  }

  const items = []
  const seen = new Set()
  for (const row of rows.slice(headerIndex + 1)) {
    const sku = String(row[columns.sku] ?? '').trim()
    if (!sku || seen.has(sku)) continue
    seen.add(sku)
    const qty = Number(String(row[columns.system_qty]).replace(',', '.'))
    items.push({
      sku,
      description: String(row[columns.description] ?? '').trim(),
      location: String(row[columns.location] ?? '').trim(),
      system_qty: Number.isFinite(qty) ? qty : 0,
    })
  }

  return { name: name.trim(), items, warning: items.length ? '' : 'Nenhum item encontrado nesta aba.' }

}

export async function parseWorkbook(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  return workbook.SheetNames.map((name) => parseSheet(name, workbook.Sheets[name]))
}
