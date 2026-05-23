// config/db.js
// ✅ Kết nối SQL Server bằng Windows Authentication (không cần user/password)

const sql = require('mssql');
require('dotenv').config();

const config = {
  server:   process.env.DB_HOST || 'localhost\\SQLEXPRESS',
  database: process.env.DB_NAME || 'hotel_management',
  port:     parseInt(process.env.DB_PORT || '1433', 10),

  options: {
    trustedConnection:      true,   // ✅ Windows Authentication
    trustServerCertificate: true,   // bỏ qua lỗi SSL self-signed
    enableArithAbort:       true,
    encrypt:                false,
  },

  pool: {
    max:               10,
    min:               0,
    idleTimeoutMillis: 30000,
  },

  connectionTimeout: 15000,
  requestTimeout:    30000,
};

let pool = null;

async function getPool() {
  if (pool) return pool;
  try {
    pool = await sql.connect(config);
    console.log('✅ Kết nối SQL Server (Windows Auth) thành công!');
    return pool;
  } catch (err) {
    console.error('❌ Lỗi kết nối SQL Server:', err.message);
    throw err;
  }
}

// Wrapper db.query(sql, [params]) — tương thích toàn bộ controller
async function query(sqlText, params = []) {
  const p = await getPool();
  const request = p.request();

  let paramIndex = 0;
  const convertedSql = sqlText.replace(/\?/g, () => {
    const name  = `p${paramIndex}`;
    const value = params[paramIndex];

    if (value === null || value === undefined) {
      request.input(name, sql.NVarChar, null);
    } else if (typeof value === 'number' && Number.isInteger(value)) {
      request.input(name, sql.Int, value);
    } else if (typeof value === 'number') {
      request.input(name, sql.Decimal(15, 2), value);
    } else if (value instanceof Date) {
      request.input(name, sql.DateTime2, value);
    } else {
      request.input(name, sql.NVarChar(sql.MAX), String(value));
    }

    paramIndex++;
    return `@${name}`;
  });

  const result = await request.query(convertedSql);
  return result.recordset;
}

// Transaction wrapper
async function beginTransaction() {
  const p = await getPool();
  const transaction = new sql.Transaction(p);
  await transaction.begin();

  return {
    query: async (sqlText, params = []) => {
      const request = new sql.Request(transaction);
      let paramIndex = 0;
      const convertedSql = sqlText.replace(/\?/g, () => {
        const name  = `p${paramIndex}`;
        const value = params[paramIndex];

        if (value === null || value === undefined) {
          request.input(name, sql.NVarChar, null);
        } else if (typeof value === 'number' && Number.isInteger(value)) {
          request.input(name, sql.Int, value);
        } else if (typeof value === 'number') {
          request.input(name, sql.Decimal(15, 2), value);
        } else if (value instanceof Date) {
          request.input(name, sql.DateTime2, value);
        } else {
          request.input(name, sql.NVarChar(sql.MAX), String(value));
        }
        paramIndex++;
        return `@${name}`;
      });

      const result = await request.query(convertedSql);
      return result.recordset;
    },
    commit:   () => transaction.commit(),
    rollback: () => transaction.rollback(),
  };
}

getPool().catch(() => process.exit(1));

module.exports = { query, beginTransaction, sql };