// CSV exports from QAD use semicolons, quoted cells and Brazilian decimals.
export function parseDelimited(text) {
  const rows = []; let row = [], cell = '', quoted = false
  text = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted
    } else if (!quoted && c === ';') { row.push(cell); cell = '' }
    else if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); if (row.some(v => v.trim())) rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (quoted) throw new Error('O CSV contém aspas não fechadas.')
  row.push(cell); if (row.some(v => v.trim())) rows.push(row)
  return rows
}

const normalize = s => String(s ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export function parseCatalogCsv(text) {
  const rows = parseDelimited(text); const header = (rows.shift() ?? []).map(normalize)
  const col = name => header.indexOf(name)
  if (col('numero de item') >= 0 && col('local') >= 0) {
    const groups = new Map(); const seen = new Set(); let duplicates = 0, unsupportedAbc = 0
    for (const row of rows) {
      const sku = (row[col('numero de item')] ?? '').trim(); if (!sku) continue
      const name = (row[col('local')] ?? '').trim() || 'Sem local'
      const key = `${name}\u0000${sku}`; if (seen.has(key)) { duplicates++; continue }; seen.add(key)
      if (!groups.has(name)) groups.set(name, [])
      const abc = (row[col('classe abc')] ?? '').trim().toUpperCase()
      if (abc && !['A', 'B', 'C'].includes(abc)) unsupportedAbc++
      groups.get(name).push({ sku, description: (row[col('descricao')] ?? '').trim(), location: name, abc_class: ['A', 'B', 'C'].includes(abc) ? abc : null })
    }
    return { type: 'bases', bases: [...groups].map(([name, items]) => ({ name, items })), duplicates, unsupportedAbc }
  }
  if (['pn', 'descricao', 'fornecedor', 'abc', 'usd'].every(x => col(x) >= 0)) {
    const seen = new Set(); let duplicates = 0
    const costs = rows.flatMap((row, index) => {
      const pn = (row[col('pn')] ?? '').trim(); if (!pn) return []
      if (seen.has(pn)) { duplicates++; return [] }; seen.add(pn)
      const raw = (row[col('usd')] ?? '').trim().replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.')
      const unit_cost_usd = Number(raw)
      if (!raw || !Number.isFinite(unit_cost_usd) || unit_cost_usd < 0) throw new Error(`Linha ${index + 2}: custo inválido.`)
      return [{ pn, description: (row[col('descricao')] ?? '').trim(), supplier: (row[col('fornecedor')] ?? '').trim(), abc: (row[col('abc')] ?? '').trim().toUpperCase() || null, unit_cost_usd }]
    })
    return { type: 'costs', costs, duplicates }
  }
  return { type: 'history' }
}
