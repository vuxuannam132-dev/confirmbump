const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let isPg = false;
let isNeon = false;
let neonSql = null;
let pgPool = null;
let sqliteDb = null;

// Determine if we should use PostgreSQL
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))) {
  isPg = true;

  if (databaseUrl.includes('neon.tech')) {
    // Official Neon Serverless HTTP driver - Immune to TCP connection timeout on Vercel!
    isNeon = true;
    const { neon } = require('@neondatabase/serverless');
    neonSql = neon(databaseUrl, { fullResults: true });
    console.log('⚡ Sử dụng Neon Serverless HTTP Driver (Chống timeout trên Vercel)...');
  } else {
    // Standard PostgreSQL Pool for other cloud providers (Supabase, Render, etc.)
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000
    });
    console.log('🐘 Sử dụng PostgreSQL Pool...');
  }
} else {
  // Fallback to SQLite
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = process.env.VERCEL 
    ? path.join('/tmp', 'database.sqlite') 
    : path.join(__dirname, '..', 'database.sqlite');

  sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  console.log(`📦 Sử dụng SQLite tại: ${dbPath}`);
}

/**
 * Convert query with ? placeholders into $1, $2 for PostgreSQL
 */
function translateQuery(sql) {
  if (!isPg) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

const db = {
  isPg,

  async get(sql, params = []) {
    if (isNeon) {
      const q = translateQuery(sql);
      const res = await neonSql.query(q, params);
      const rows = res.rows || (Array.isArray(res) ? res : []);
      return rows[0] || null;
    } else if (isPg) {
      const q = translateQuery(sql);
      const res = await pgPool.query(q, params);
      return res.rows[0] || null;
    } else {
      const stmt = sqliteDb.prepare(sql);
      return stmt.get(...params) || null;
    }
  },

  async all(sql, params = []) {
    if (isNeon) {
      const q = translateQuery(sql);
      const res = await neonSql.query(q, params);
      return res.rows || (Array.isArray(res) ? res : []);
    } else if (isPg) {
      const q = translateQuery(sql);
      const res = await pgPool.query(q, params);
      return res.rows;
    } else {
      const stmt = sqliteDb.prepare(sql);
      return stmt.all(...params);
    }
  },

  async run(sql, params = []) {
    if (isNeon) {
      let q = translateQuery(sql);
      if (/^\s*insert\s+/i.test(q) && !/returning\s+/i.test(q)) {
        q += ' RETURNING id';
      }
      const res = await neonSql.query(q, params);
      const rows = res.rows || (Array.isArray(res) ? res : []);
      const lastInsertRowid = rows[0]?.id || null;
      return { lastInsertRowid, changes: res.rowCount !== undefined ? res.rowCount : rows.length };
    } else if (isPg) {
      let q = translateQuery(sql);
      if (/^\s*insert\s+/i.test(q) && !/returning\s+/i.test(q)) {
        q += ' RETURNING id';
      }
      const res = await pgPool.query(q, params);
      const lastInsertRowid = res.rows[0]?.id || null;
      return { lastInsertRowid, changes: res.rowCount };
    } else {
      const stmt = sqliteDb.prepare(sql);
      const res = stmt.run(...params);
      return { lastInsertRowid: res.lastInsertRowid, changes: res.changes };
    }
  },

  async exec(sql) {
    if (isNeon) {
      return await neonSql.query(sql);
    } else if (isPg) {
      return await pgPool.query(sql);
    } else {
      return sqliteDb.exec(sql);
    }
  }
};

// Official Admin Credentials
const OFFICIAL_ADMIN_USERNAME = 'admin_BCH_doantruongdkhbt';
const OFFICIAL_ADMIN_PASSWORD_HASH = bcrypt.hashSync('DOANKETXUNGDANG2026@*', 10);

let initPromise = null;
async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (isPg) {
        // Create tables one by one for Postgres/Neon
        await db.exec(`
          CREATE TABLE IF NOT EXISTS departments (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            color VARCHAR(20) DEFAULT '#2563EB'
          );
        `);

        await db.exec(`
          CREATE TABLE IF NOT EXISTS email_otps (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            otp_code VARCHAR(10) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await db.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            facebook_url TEXT NOT NULL,
            phone VARCHAR(50),
            role VARCHAR(50) NOT NULL DEFAULT 'USER',
            department_id INTEGER REFERENCES departments(id),
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await db.exec(`
          CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            platform VARCHAR(50) NOT NULL,
            post_url TEXT NOT NULL,
            target_department_id INTEGER REFERENCES departments(id),
            created_by INTEGER NOT NULL REFERENCES users(id),
            deadline TIMESTAMPTZ NOT NULL,
            makeup_deadline TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await db.exec(`
          CREATE TABLE IF NOT EXISTS confirm_submissions (
            id SERIAL PRIMARY KEY,
            task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL,
            note TEXT,
            is_makeup INTEGER DEFAULT 0,
            status VARCHAR(50) DEFAULT 'PENDING',
            admin_feedback TEXT,
            reviewed_by INTEGER REFERENCES users(id),
            reviewed_at TIMESTAMPTZ,
            submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } else {
        // SQLite schema
        sqliteDb.exec(`
          CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#2563EB'
          );

          CREATE TABLE IF NOT EXISTS email_otps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            otp_code TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            facebook_url TEXT NOT NULL,
            phone TEXT,
            role TEXT NOT NULL DEFAULT 'USER',
            department_id INTEGER REFERENCES departments(id),
            status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
            created_by INTEGER REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            platform TEXT NOT NULL,
            post_url TEXT NOT NULL,
            target_department_id INTEGER,
            created_by INTEGER NOT NULL REFERENCES users(id),
            deadline DATETIME NOT NULL,
            makeup_deadline DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (target_department_id) REFERENCES departments(id)
          );

          CREATE TABLE IF NOT EXISTS confirm_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL,
            note TEXT,
            is_makeup INTEGER DEFAULT 0,
            status TEXT DEFAULT 'PENDING',
            admin_feedback TEXT,
            reviewed_by INTEGER REFERENCES users(id),
            reviewed_at DATETIME,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
      }

      // Ensure 4 official departments exist
      const deptCount = await db.get('SELECT COUNT(*) as count FROM departments');
      const count = parseInt(deptCount?.count || 0);

      if (count === 0) {
        await db.run('INSERT INTO departments (code, name, color) VALUES (?, ?, ?)', ['TRUYEN_THONG', 'Ban Truyền thông', '#2563EB']);
        await db.run('INSERT INTO departments (code, name, color) VALUES (?, ?, ?)', ['THIET_KE', 'Ban Thiết kế', '#D97706']);
        await db.run('INSERT INTO departments (code, name, color) VALUES (?, ?, ?)', ['NHAN_SU', 'Ban Nhân sự', '#DC2626']);
        await db.run('INSERT INTO departments (code, name, color) VALUES (?, ?, ?)', ['HAU_CAN', 'Ban Hậu cần', '#059669']);
        console.log('✅ Khởi tạo 4 phân ban Đoàn trường thành công!');
      }

      // Ensure official Super Admin exists
      const officialAdmin = await db.get('SELECT id FROM users WHERE username = ?', [OFFICIAL_ADMIN_USERNAME]);
      if (!officialAdmin) {
        const ttDept = await db.get("SELECT id FROM departments WHERE code = 'TRUYEN_THONG'");
        const deptId = ttDept?.id || 1;

        await db.run(`
          INSERT INTO users (username, password_hash, full_name, email, facebook_url, phone, role, department_id, status)
          VALUES (?, ?, ?, ?, ?, ?, 'ADMIN_TONG', ?, 'ACTIVE')
        `, [
          OFFICIAL_ADMIN_USERNAME,
          OFFICIAL_ADMIN_PASSWORD_HASH,
          'Ban Chấp Hành Đoàn Trường (Admin Tổng)',
          'bch.doantruong@dkhbt.edu.vn',
          'https://facebook.com/doantruong.dkhbt',
          '0988111222',
          deptId
        ]);
        console.log(`✅ Khởi tạo tài khoản Admin Tổng chính thức: ${OFFICIAL_ADMIN_USERNAME}`);
      } else {
        await db.run('UPDATE users SET password_hash = ? WHERE username = ?', [OFFICIAL_ADMIN_PASSWORD_HASH, OFFICIAL_ADMIN_USERNAME]);
      }

    } catch (err) {
      console.error('❌ Lỗi khởi tạo Database:', err);
      throw err;
    }
  })();

  return initPromise;
}

initDb().catch(e => console.error('initDb error:', e));

module.exports = db;
module.exports.initDb = initDb;
