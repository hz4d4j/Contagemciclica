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
