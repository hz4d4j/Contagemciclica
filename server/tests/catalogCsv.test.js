import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCatalogCsv } from '../../src/lib/catalogCsv.js'

test('groups QAD items by Local without converting PN or inventing stock', () => {
  const parsed = parseCatalogCsv('Número de Item;Descrição;Local;Classe ABC\n00002;Peça;789;A\n00003;Outra;790;B\n')
  assert.equal(parsed.type, 'bases')
  assert.deepEqual(parsed.bases.map(x => x.name), ['789', '790'])
  assert.equal(parsed.bases[0].items[0].sku, '00002')
  assert.equal(parsed.bases[0].items[0].system_qty, undefined)
})

test('reads quoted fields and Brazilian USD values and warns on repeated PN', () => {
  const parsed = parseCatalogCsv('PN;Descrição;Fornecedor;ABC;usd\n001;"Peça; azul";Fornecedor;C; $1,23\n001;Outro;X;A;$2,00\n')
  assert.equal(parsed.type, 'costs')
  assert.equal(parsed.costs[0].unit_cost_usd, 1.23)
  assert.equal(parsed.costs[0].description, 'Peça; azul')
  assert.equal(parsed.duplicates, 1)
})
