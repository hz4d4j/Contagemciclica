import sql from 'mssql';
import { config } from './config.js';

let pool = null;

export async function getPool() {
  if (pool && pool.connected) return pool;
  pool = await sql.connect(config.azureSql);
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

/**
 * Allowlist of table names permitted in dynamic SQL identifiers.
 * Any table name used in a query string must be validated against this set
 * to prevent SQL injection via identifier interpolation.
 */
const ALLOWED_TABLES = new Set([
  'count_bases',
  'count_items',
  'count_plans',
  'count_results',
  'count_history',
  'item_costs',
  'position_checks',
]);

/**
 * Validate that a table name is in the allowlist.
 * Throws if the name is not recognized — never passes an untrusted
 * identifier through to the SQL engine.
 */
export function validateTableName(name) {
  if (!ALLOWED_TABLES.has(name)) {
    throw new Error(`Nome de tabela não permitido: ${name}`);
  }
  return name;
}

/**
 * Execute a parameterized query. All user-supplied values must be passed
 * as @p0, @p1, ... parameters — never interpolated into the query string.
 * Table/column identifiers in the query string must be static literals
 * or validated via validateTableName().
 */
export async function query(text, params = []) {
  const p = await getPool();
  const req = p.request();
  if (Array.isArray(params)) {
    params.forEach((v, i) => req.input(`p${i}`, mapType(v), v));
  }
  const result = await req.query(text);
  return result;
}

export async function queryOne(text, params = []) {
  const r = await query(text, params);
  return r.recordset?.[0] ?? null;
}

function mapType(v) {
  if (typeof v === 'boolean') return sql.Bit;
  if (typeof v === 'number') return Number.isInteger(v) ? sql.Int : sql.Decimal(18, 4);
  if (v === null || v === undefined) return sql.NVarChar;
  return sql.NVarChar;
}

export { sql };
