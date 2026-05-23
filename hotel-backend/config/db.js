const sql = require('mssql');
require('dotenv').config();

const config = {
  server:   process.env.DB_SERVER   || 'IDZYUZEN',
  database: process.env.DB_DATABASE || 'hotel_management',
  port:     parseInt(process.env.DB_PORT || '1433', 10),
  domain:   process.env.DB_DOMAIN   || '',
  user:     process.env.DB_USER     || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    trustedConnection:      true,
    trustServerCertificate: true,
    enableArithAbort:       true,
    encrypt:                false,
    instanceName:           process.env.DB_INSTANCE || '',
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  connectionTimeout: 15000,
  requestTimeout:    30000,
};

let pool = null;

async function getPool() {
  if (pool) return pool;
  try {
    pool = await sql.connect(config);
    console.log('Ket noi SQL Server thanh cong! (Windows Auth)');
    return pool;
  } catch (err) {
    console.error('Loi ket noi SQL Server:', err.message);
    pool = null;
    throw err;
  }
}

function bindParams(request, sqlText, params = []) {
  let i = 0;
  return sqlText.replace(/\?/g, () => {
    const name = 'p' + i;
    const val  = params[i++];
    if (val === null || val === undefined) request.input(name, sql.NVarChar, null);
    else if (typeof val === 'boolean')    request.input(name, sql.Bit, val ? 1 : 0);
    else if (Number.isInteger(val))       request.input(name, sql.Int, val);
    else if (typeof val === 'number')     request.input(name, sql.Decimal(15,2), val);
    else if (val instanceof Date)         request.input(name, sql.DateTime2, val);
    else                                  request.input(name, sql.NVarChar(sql.MAX), String(val));
    return '@' + name;
  });
}

async function query(sqlText, params = []) {
  const p = await getPool();
  const req = p.request();
  const converted = bindParams(req, sqlText, params);
  const result = await req.query(converted);
  return result.recordset;
}

async function beginTransaction() {
  const p = await getPool();
  const t = new sql.Transaction(p);
  await t.begin();
  return {
    query: async (sqlText, params = []) => {
      const req = new sql.Request(t);
      const converted = bindParams(req, sqlText, params);
      const result = await req.query(converted);
      return result.recordset;
    },
    commit:   () => t.commit(),
    rollback: () => t.rollback(),
  };
}

getPool().catch((err) => {
  console.error('Khong the ket noi database:', err.message);
  process.exit(1);
});

module.exports = { query, beginTransaction, getPool, sql };
