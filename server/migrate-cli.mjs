#!/usr/bin/env node

/**
 * Administrative migration CLI — Bolt (Supabase) → Azure SQL.
 *
 * Runs locally on an admin's machine. Reads all 7 tables from the Bolt
 * Supabase project and inserts them into the Azure SQL database, preserving
 * UUIDs. Insert-only: existing rows are skipped, never overwritten.
 *
 * USAGE:
 *   node server/migrate-cli.mjs
 *
 * REQUIRED ENV VARS (read from .env or environment):
 *   Source (Supabase):
 *     VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *   Target (Azure SQL):
 *     AZURE_SQL_SERVER, AZURE_SQL_DATABASE, AZURE_SQL_USER, AZURE_SQL_PASSWORD
 *
 * No credentials are stored in the repository. Load them from a local .env
 * file or export them in your shell before running.
 *
 * Exit codes: 0 = success, 1 = error.
 */

import { createClient } from '@supabase/supabase-js'
import { query, validateTableName } from './src/db.js'

const TABLES = [
  { name: 'count_bases', key: 'bases', pk: 'id' },
  { name: 'count_items', key: 'items', pk: 'id' },
  { name: 'count_plans', key: 'plans', pk: 'id' },
  { name: 'count_results', key: 'results', pk: 'id' },
  { name: 'count_history', key: 'history', pk: 'id' },
  { name: 'item_costs', key: 'costs', pk: 'pn' },
  { name: 'position_checks', key: 'positionChecks', pk: 'id' },
]

const COLUMN_MAP = {
  count_bases: ['id', 'name'],
  count_items: ['id', 'base_id', 'sku', 'description', 'location', 'system_qty', 'abc_class', 'frequency', 'last_counted_at'],
  count_plans: ['id', 'base_id', 'item_id', 'scheduled_date', 'status', 'completed_at', 'operator_name'],
  count_results: ['id', 'plan_id', 'item_id', 'system_qty', 'counted_qty', 'counted_at', 'qad_qty', 'adjustment', 'observation'],
  count_history: ['id', 'source_line', 'count_date', 'pn', 'description', 'abc', 'system_mom', 'system_qad', 'counted_qty', 'variance_qad', 'variance_jfk', 'adjustment', 'status_note'],
  item_costs: ['pn', 'description', 'supplier', 'abc', 'unit_cost_usd'],
  position_checks: ['id', 'count_item_id', 'check_date', 'operator_name', 'locations_checked', 'locations_ok', 'locations_not_ok', 'occurrence', 'action_plan'],
}

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Erro: variável ${name} não definida. Configure no .env ou no ambiente.`)
    process.exit(1)
  }
  return v
}

async function fetchAll(supabase, table) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + 999)
    if (error) throw new Error(`Erro ao ler ${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

async function insertIfMissing(table, pk, columns, row) {
  validateTableName(table);
  const existing = await query(`SELECT 1 AS hit FROM ${table} WHERE ${pk}=@p0`, [row[pk]])
  if (existing.recordset.length) return false

  const cols = columns.join(', ')
  const params = columns.map((_, i) => `@p${i}`).join(', ')
  const values = columns.map((c) => row[c] ?? null)
  await query(`INSERT INTO ${table} (${cols}) VALUES (${params})`, values)
  return true
}

async function main() {
  const supabaseUrl = requireEnv('VITE_SUPABASE_URL')
  const supabaseKey = requireEnv('VITE_SUPABASE_ANON_KEY')
  requireEnv('AZURE_SQL_SERVER')
  requireEnv('AZURE_SQL_DATABASE')
  requireEnv('AZURE_SQL_USER')
  requireEnv('AZURE_SQL_PASSWORD')

  console.log('Conectando ao Supabase (Bolt)...')
  const supabase = createClient(supabaseUrl, supabaseKey)

  const payload = {}
  for (const t of TABLES) {
    console.log(`  Lendo ${t.name}...`)
    payload[t.key] = await fetchAll(supabase, t.name)
    console.log(`    ${payload[t.key].length} registros`)
  }

  console.log('\nMigrando para Azure SQL (insert-only)...')
  const summary = {}
  for (const t of TABLES) {
    let inserted = 0
    let skipped = 0
    for (const row of payload[t.key]) {
      const didInsert = await insertIfMissing(t.name, t.pk, COLUMN_MAP[t.name], row)
      if (didInsert) inserted++
      else skipped++
    }
    summary[t.name] = { inserted, skipped, total: payload[t.key].length }
    console.log(`  ${t.name}: ${inserted} inseridos, ${skipped} pulados (já existiam)`)
  }

  console.log('\nValidação:')
  for (const t of TABLES) {
    validateTableName(t.name);
    const r = await query(`SELECT COUNT(*) AS cnt FROM ${t.name}`)
    console.log(`  ${t.name}: ${r.recordset[0].cnt} registros no Azure SQL`)
  }

  console.log('\nMigração concluída com sucesso.')
  process.exit(0)
}

main().catch((err) => {
  console.error(`\nFalha na migração: ${err.message}`)
  process.exit(1)
})
